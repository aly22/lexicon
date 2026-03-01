import React, { useState, useEffect, useCallback, useRef } from "react";
import { setApiKey, loadGameData, saveGameData, saveGameResult } from "./src/api.js";
import VocabMemory from "./src/vocab-memory.jsx";

const MAX_WORDS = 25;
const ROUND_SIZE = 5;

const SAMPLE_WORDS = [
  { word: "Eloquent", definition: "Fluent or persuasive in speaking or writing" },
  { word: "Resilient", definition: "Able to recover quickly from difficulties" },
  { word: "Ephemeral", definition: "Lasting for a very short time" },
  { word: "Pragmatic", definition: "Dealing with things sensibly and realistically" },
  { word: "Candid", definition: "Truthful and straightforward; frank" },
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const RANKS = [
  { min: 0, label: "Novice", emoji: "📖", color: "#94a3b8" },
  { min: 40, label: "Learner", emoji: "📝", color: "#60a5fa" },
  { min: 60, label: "Scholar", emoji: "🎓", color: "#a78bfa" },
  { min: 80, label: "Wordsmith", emoji: "✨", color: "#f59e0b" },
  { min: 95, label: "Lexicon Master", emoji: "👑", color: "#ef4444" },
];

const getRank = (score) => {
  let r = RANKS[0];
  for (const rank of RANKS) if (score >= rank.min) r = rank;
  return r;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

const CSS = `
  * { box-sizing: border-box; margin: 0; }
  .app {
    min-height: 100vh;
    background: linear-gradient(160deg, #0a0e17 0%, #0f172a 40%, #0a0e17 100%);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
    display: flex;
    justify-content: center;
    padding: 20px 16px;
  }

  .setup { max-width: 560px; width: 100%; display: flex; flex-direction: column; gap: 20px; }
  .logo-area { text-align: center; margin-bottom: 4px; }
  .logo-icon { font-size: 44px; margin-bottom: 6px; }
  .logo-title { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #e2e8f0; }
  .logo-sub { color: #64748b; font-size: 14px; margin-top: 4px; }
  .section { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; }
  .section-title { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
  .hint { color: #64748b; font-size: 12px; margin-bottom: 10px; }
  .word-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; max-height: 240px; overflow-y: auto; }
  .word-chip {
    display: flex; justify-content: space-between; align-items: center;
    background: #1e293b; border-radius: 8px; padding: 8px 10px; font-size: 13px; gap: 8px;
  }
  .word-chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .word-chip strong { color: #e2e8f0; }
  .word-chip .def { color: #94a3b8; margin-left: 6px; font-size: 12px; }
  .chip-x {
    background: none; border: none; color: #ef4444; font-size: 18px;
    cursor: pointer; padding: 0 4px; flex-shrink: 0; line-height: 1;
  }
  .input-row { display: flex; gap: 8px; }
  .input {
    background: #1e293b; border: 1px solid #334155; border-radius: 8px;
    padding: 10px 12px; color: #e2e8f0; font-size: 14px; outline: none; min-width: 0;
  }
  .input-word { flex: 1; min-width: 80px; }
  .input-def { flex: 2; min-width: 120px; }
  .input-player { flex: 1; min-width: 120px; }
  .add-btn {
    background: #3b82f6; border: none; border-radius: 8px; color: white;
    font-size: 20px; width: 42px; cursor: pointer; font-weight: 700; flex-shrink: 0;
  }
  .player-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .player-chip {
    background: #1e293b; border-radius: 8px; padding: 6px 12px;
    font-size: 13px; display: flex; gap: 8px; align-items: center; color: #e2e8f0;
  }
  .error { color: #f87171; font-size: 13px; text-align: center; }
  .start-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1); border: none;
    border-radius: 12px; padding: 14px 28px; font-size: 17px; font-weight: 700;
    color: white; cursor: pointer; letter-spacing: 2px; text-transform: uppercase; width: 100%;
  }
  .start-btn:disabled { opacity: 0.4; cursor: default; }

  .game { max-width: 700px; width: 100%; display: flex; flex-direction: column; gap: 12px; }
  .round-badge {
    text-align: center; font-size: 13px; color: #64748b;
    padding: 6px 0;
  }
  .round-badge strong { color: #e2e8f0; }
  .memo-header {
    background: #1a1a2e; border: 1px solid #f59e0b33;
    border-radius: 12px; padding: 14px 16px;
  }
  .memo-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .memo-label { font-size: 17px; font-weight: 700; color: #fbbf24; }
  .memo-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .memo-countdown {
    font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums;
    transition: color 0.3s; flex-shrink: 0;
  }
  .progress-bar { width: 100%; height: 4px; background: #1e293b; border-radius: 4px; overflow: hidden; }
  .progress-bar.memo { height: 6px; margin-top: 8px; }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #3b82f6, #22c55e);
    border-radius: 4px; transition: width 0.5s ease;
  }
  .game-header { display: flex; flex-direction: column; gap: 6px; }
  .header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .progress-text { color: #64748b; font-size: 13px; }
  .player-turns { display: flex; gap: 12px; flex-wrap: wrap; }
  .player-turn { color: #e2e8f0; font-size: 13px; transition: opacity 0.2s; }
  .player-turn.active { font-weight: 700; text-decoration: underline; text-decoration-color: #60a5fa; text-underline-offset: 4px; opacity: 1; }
  .player-turn.inactive { opacity: 0.4; }
  .stats-line { color: #94a3b8; font-size: 13px; }
  .feedback {
    text-align: center; padding: 8px 14px; border-radius: 8px;
    border: 1px solid; font-size: 14px; font-weight: 600;
  }
  .feedback.correct { background: #22c55e22; border-color: #22c55e55; color: #4ade80; }
  .feedback.wrong { background: #ef444422; border-color: #ef444455; color: #f87171; }

  .grid { display: grid; gap: 8px; }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }

  .card {
    aspect-ratio: 1; border-radius: 10px;
    transform-style: preserve-3d; position: relative;
    transition: transform 0.4s ease; cursor: pointer;
  }
  .card.flipped { transform: rotateY(180deg); }
  .card.no-click { cursor: default; }
  .card-face {
    width: 100%; height: 100%; border-radius: 10px; border: 1px solid;
    display: flex; align-items: center; justify-content: center;
    backface-visibility: hidden; position: absolute; top: 0; left: 0;
    overflow: hidden; padding: 6px; text-align: center;
  }
  .card-back {
    background: linear-gradient(135deg, #334155, #1e293b); border-color: #47556666;
  }
  .card-front { transform: rotateY(180deg); display: flex; align-items: center; justify-content: center; }
  .card-front.word { background: linear-gradient(135deg, #1e293b, #0f172a); border-color: #60a5fa44; }
  .card-front.def { background: linear-gradient(135deg, #1a1a2e, #16213e); border-color: #a78bfa44; }
  .card-front.matched { background: linear-gradient(135deg, #1a3a2a, #0f2a1a); border-color: #22c55e55; }
  .card-inner { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
  .card-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 4px; }
  .card-label.word { color: #60a5fa; }
  .card-label.def { color: #a78bfa; }
  .card-val { color: #e2e8f0; line-height: 1.3; text-align: center; word-break: break-word; }
  .card-val.word { font-size: 14px; font-weight: 700; }
  .card-val.def { font-size: 11px; }
  .card-back-icon { font-size: 20px; opacity: 0.5; }

  /* REVIEW */
  .review-screen {
    max-width: 520px; width: 100%; display: flex; flex-direction: column;
    align-items: center; text-align: center; gap: 14px; padding-top: 16px;
  }
  .review-round-header {
    background: #1a1a2e; border: 1px solid #6366f133; border-radius: 10px;
    padding: 12px 16px; width: 100%; text-align: center;
  }
  .review-round-title { font-size: 16px; font-weight: 700; color: #a78bfa; }
  .review-round-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .review-list { width: 100%; display: flex; flex-direction: column; gap: 8px; }
  .review-card {
    background: #0f172a; border: 1px solid #33415566; border-radius: 10px;
    padding: 12px 14px; text-align: left; cursor: pointer; transition: border-color 0.3s;
  }
  .review-card.revealed { border-color: #22c55e33; cursor: default; }
  .rw { color: #60a5fa; font-weight: 700; font-size: 15px; }
  .rh { color: #475569; font-size: 11px; }
  .rd { margin-top: 6px; color: #cbd5e1; font-size: 13px; line-height: 1.4; }
  .next-round-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1); border: none;
    border-radius: 10px; padding: 12px 28px; font-size: 15px; font-weight: 700;
    color: white; cursor: pointer; width: 100%; margin-top: 4px;
  }
  .next-round-btn:disabled { opacity: 0.4; cursor: default; }
  .review-progress { color: #64748b; font-size: 12px; }

  /* RESULTS */
  .results {
    max-width: 480px; width: 100%; display: flex; flex-direction: column;
    align-items: center; text-align: center; gap: 12px; padding-top: 16px;
  }
  .result-emoji { font-size: 56px; }
  .result-title { font-size: 28px; font-weight: 800; letter-spacing: 2px; }
  .winner-badge {
    background: #f59e0b22; border: 1px solid #f59e0b44; border-radius: 8px;
    padding: 8px 20px; color: #fbbf24; font-weight: 600; font-size: 15px;
  }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; }
  .stat-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 12px 8px; }
  .stat-value { font-size: 20px; font-weight: 700; color: #e2e8f0; }
  .stat-label { font-size: 10px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .player-scores { width: 100%; display: flex; flex-direction: column; gap: 6px; }
  .pscore {
    display: flex; justify-content: space-between; align-items: center;
    background: #0f172a; border: 1px solid #33415544; border-radius: 8px;
    padding: 10px 14px; font-size: 13px;
  }
  .pscore.winner { border-color: #f59e0b44; }
  .result-btns { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
  .restart-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1); border: none;
    border-radius: 10px; padding: 11px 24px; font-size: 14px; font-weight: 700;
    color: white; cursor: pointer;
  }
  .newgame-btn {
    background: none; border: 1px solid #334155; border-radius: 10px;
    padding: 11px 24px; font-size: 14px; font-weight: 600; color: #94a3b8; cursor: pointer;
  }

  .login { max-width: 360px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; padding-top: 60px; }
  .login-form { width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .login-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1); border: none;
    border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 700;
    color: white; cursor: pointer; width: 100%;
  }
  .login-btn:disabled { opacity: 0.4; cursor: default; }

  .select-screen { max-width: 560px; width: 100%; display: flex; flex-direction: column; gap: 20px; }
  .game-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .game-card {
    background: #0f172a; border: 1px solid #1e293b; border-radius: 16px;
    padding: 32px 20px; text-align: center; cursor: pointer;
    transition: border-color 0.2s, transform 0.15s;
  }
  .game-card:hover { border-color: #3b82f6; transform: translateY(-2px); }
  .game-card-icon { font-size: 48px; margin-bottom: 12px; }
  .game-card h2 { font-size: 18px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
  .game-card p { font-size: 13px; color: #64748b; line-height: 1.4; }

  .back-btn {
    background: none; border: 1px solid #334155; border-radius: 10px;
    padding: 8px 16px; font-size: 13px; color: #94a3b8; cursor: pointer;
    align-self: flex-start;
  }

  @media (max-width: 480px) {
    .game-cards { grid-template-columns: 1fr; }
    .app { padding: 12px 8px; }
    .logo-title { font-size: 22px; letter-spacing: 5px; }
    .logo-icon { font-size: 34px; }
    .section { padding: 12px; }
    .input-row { flex-direction: column; }
    .input-word, .input-def, .input-player { flex: unset; width: 100%; min-width: unset; }
    .add-btn { width: 100%; height: 42px; }
    .grid { gap: 5px; }
    .card-val.word { font-size: 11px; }
    .card-val.def { font-size: 9px; }
    .card-label { font-size: 7px; letter-spacing: 1px; margin-bottom: 2px; }
    .memo-countdown { font-size: 22px; }
    .result-emoji { font-size: 40px; }
    .result-title { font-size: 20px; }
    .stat-value { font-size: 17px; }
    .stats-grid { gap: 5px; }
    .start-btn { font-size: 15px; padding: 12px 20px; }
  }
`;

const setCookie = (name, value, days) => {
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Strict`;
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// ---- COMPONENTS ----

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setChecking(true);
    setError("");
    setApiKey(password.trim());
    try {
      await loadGameData("lexicon");
      setCookie("lexicon_key", password.trim(), 7);
      onLogin();
    } catch (err) {
      if (err.status === 401) {
        setError("Invalid password");
        setApiKey("");
      } else {
        // API might be down or not configured yet — allow login anyway
        setCookie("lexicon_key", password.trim(), 7);
        onLogin();
      }
      setChecking(false);
    }
  };

  return (
    <div className="login">
      <div className="logo-area">
        <div className="logo-icon">🧠</div>
        <h1 className="logo-title">LEXICON</h1>
        <p className="logo-sub">Enter password to continue</p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{ width: "100%" }}
        />
        {error && <p className="error">{error}</p>}
        <button className="login-btn" type="submit" disabled={checking || !password.trim()}>
          {checking ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

function GameSelectScreen({ onSelect }) {
  return (
    <div className="select-screen">
      <div className="logo-area">
        <div className="logo-icon">🧠</div>
        <h1 className="logo-title">LEXICON</h1>
        <p className="logo-sub">Choose a game</p>
      </div>
      <div className="game-cards">
        <div className="game-card" onClick={() => onSelect("lexicon")}>
          <div className="game-card-icon">🃏</div>
          <h2>Card Match</h2>
          <p>Match words to their definitions by flipping cards</p>
        </div>
        <div className="game-card" onClick={() => onSelect("vocab-memory")}>
          <div className="game-card-icon">🧩</div>
          <h2>Vocab Memory</h2>
          <p>Memorize words on cards, then guess them from memory</p>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({ onStart, onBack }) {
  const [words, setWords] = useState(SAMPLE_WORDS);
  const [newWord, setNewWord] = useState("");
  const [newDef, setNewDef] = useState("");
  const [players, setPlayers] = useState([]);
  const [newPlayer, setNewPlayer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loadStatus, setLoadStatus] = useState(null);
  const loaded = useRef(false);

  // Load saved data on mount
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadGameData("lexicon")
      .then(({ words: w, players: p }) => {
        if (Array.isArray(w) && w.length > 0) setWords(w);
        if (Array.isArray(p) && p.length > 0) setPlayers(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await saveGameData("lexicon", words, players);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleLoad = async () => {
    setLoadStatus("loading");
    try {
      const { words: w, players: p } = await loadGameData("lexicon");
      if (Array.isArray(w) && w.length > 0) setWords(w);
      if (Array.isArray(p) && p.length > 0) setPlayers(p);
      setLoadStatus("loaded");
    } catch {
      setLoadStatus("error");
    }
    setTimeout(() => setLoadStatus(null), 2000);
  };

  const addWord = () => {
    const w = newWord.trim(), d = newDef.trim();
    if (!w || !d) { setError("Both word and definition needed"); return; }
    if (words.length >= MAX_WORDS) { setError(`Max ${MAX_WORDS} words`); return; }
    if (words.find((x) => x.word.toLowerCase() === w.toLowerCase())) { setError("Word already exists"); return; }
    setWords([...words, { word: w, definition: d }]);
    setNewWord(""); setNewDef(""); setError("");
  };

  const removeWord = (i) => setWords(words.filter((_, idx) => idx !== i));

  const addPlayer = () => {
    const p = newPlayer.trim();
    if (!p) return;
    if (players.length >= 4) { setError("Max 4 players"); return; }
    setPlayers([...players, { name: p }]);
    setNewPlayer(""); setError("");
  };

  const removePlayer = (i) => {
    setPlayers(players.filter((_, idx) => idx !== i));
  };

  const totalRounds = Math.ceil(words.length / ROUND_SIZE);

  if (loading) {
    return (
      <div className="setup">
        <div className="logo-area">
          <div className="logo-icon">🧠</div>
          <h1 className="logo-title">LEXICON</h1>
          <p className="logo-sub">Loading saved data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup">
      <div className="logo-area">
        <div className="logo-icon">🧠</div>
        <h1 className="logo-title">LEXICON</h1>
        <p className="logo-sub">Match words to their meanings</p>
      </div>
      <button className="back-btn" onClick={onBack}>← Back to Games</button>

      <div className="section">
        <h2 className="section-title">Vocabulary Cards</h2>
        <p className="hint">Min 3, max {MAX_WORDS}. {words.length} words = {totalRounds} round{totalRounds !== 1 ? "s" : ""} of {ROUND_SIZE}.</p>
        <div className="word-list">
          {words.map((w, i) => (
            <div key={i} className="word-chip">
              <div className="word-chip-text">
                <strong>{w.word}</strong>
                <span className="def">{w.definition}</span>
              </div>
              <button onClick={() => removeWord(i)} className="chip-x">×</button>
            </div>
          ))}
        </div>
        {words.length < MAX_WORDS && (
          <div className="input-row">
            <input className="input input-word" placeholder="Word" value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("def-input")?.focus()} />
            <input id="def-input" className="input input-def" placeholder="Definition" value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWord()} />
            <button className="add-btn" onClick={addWord}>+</button>
          </div>
        )}
      </div>

      <div className="section">
        <h2 className="section-title">Players</h2>
        <div className="player-list">
          {players.map((p, i) => (
            <div key={i} className="player-chip">
              <span>{p.name}</span>
              <button onClick={() => removePlayer(i)} className="chip-x">×</button>
            </div>
          ))}
        </div>
        {players.length < 4 && (
          <div className="input-row">
            <input className="input input-player" placeholder="Add player name" value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
            <button className="add-btn" onClick={addPlayer}>+</button>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="newgame-btn" style={{ flex: 1 }} onClick={handleSave} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Save Failed" : "Save"}
        </button>
        <button className="newgame-btn" style={{ flex: 1 }} onClick={handleLoad} disabled={loadStatus === "loading"}>
          {loadStatus === "loading" ? "Loading..." : loadStatus === "loaded" ? "Loaded!" : loadStatus === "error" ? "Load Failed" : "Load"}
        </button>
      </div>
      <button className="start-btn" disabled={words.length < 3 || players.length < 1} onClick={() => onStart(words, players)}>
        Start Game
      </button>
    </div>
  );
}

function Card({ card, isFlipped, isMatched, onClick, disabled }) {
  const inner = isFlipped || isMatched;
  const isWord = card.type === "word";
  const cls = `card${inner ? " flipped" : ""}${disabled || isMatched ? " no-click" : ""}`;
  const frontCls = `card-face card-front ${isWord ? "word" : "def"}${isMatched ? " matched" : ""}`;

  return (
    <div className={cls} onClick={() => !disabled && !isMatched && !isFlipped && onClick()}>
      <div className="card-face card-back"><span className="card-back-icon">?</span></div>
      <div className={frontCls}>
        <div className="card-inner">
          <div className={`card-label ${isWord ? "word" : "def"}`}>{isWord ? "WORD" : "DEFINITION"}</div>
          <div className={`card-val ${isWord ? "word" : "def"}`}>{card.text}</div>
        </div>
      </div>
    </div>
  );
}

function RoundScreen({ roundWords, roundNum, totalRounds, players, currentPlayer, scores, onRoundEnd }) {
  const [cards, setCards] = useState([]);
  const [phase, setPhase] = useState("memorize");
  const [memoTime, setMemoTime] = useState(0);
  const [memoCountdown, setMemoCountdown] = useState(0);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [cp, setCp] = useState(currentPlayer);
  const [localScores, setLocalScores] = useState(scores);
  const [disabled, setDisabled] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const memoRef = React.useRef(null);

  useEffect(() => {
    const wc = roundWords.map((w, i) => ({ id: `w${i}`, pairId: i, type: "word", text: w.word }));
    const dc = roundWords.map((w, i) => ({ id: `d${i}`, pairId: i, type: "definition", text: w.definition }));
    setCards(shuffle([...wc, ...dc]));
    const t = roundWords.length * 5;
    setMemoTime(t);
    setMemoCountdown(t);
    setPhase("memorize");
    setFlipped([]);
    setMatched(new Set());
    setDisabled(false);
    setFeedback(null);
  }, [roundWords]);

  useEffect(() => {
    if (phase !== "memorize" || memoCountdown <= 0) return;
    memoRef.current = setInterval(() => {
      setMemoCountdown((t) => {
        if (t <= 1) { clearInterval(memoRef.current); setPhase("play"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(memoRef.current);
  }, [phase, memoCountdown > 0]);

  const totalPairs = roundWords.length;
  const matchedCount = matched.size / 2;

  const handleFlip = useCallback((idx) => {
    if (phase !== "play" || disabled || flipped.includes(idx) || matched.has(idx)) return;
    const nf = [...flipped, idx];
    setFlipped(nf);

    if (nf.length === 2) {
      setDisabled(true);
      const [a, b] = nf;
      const cA = cards[a], cB = cards[b];
      const isMatch = cA.pairId === cB.pairId && cA.type !== cB.type;

      const ns = localScores.map((s) => ({ ...s }));
      ns[cp].attempts++;

      if (isMatch) {
        ns[cp].matches++;
        ns[cp].streak++;
        if (ns[cp].streak > ns[cp].bestStreak) ns[cp].bestStreak = ns[cp].streak;

        const mw = roundWords[cA.pairId];
        const streakMsg = ns[cp].streak >= 3 ? ` 🔥 ${ns[cp].streak}x streak!` : "";
        setFeedback({ type: "correct", text: `✓ ${mw.word}${streakMsg}` });

        setTimeout(() => {
          setMatched((prev) => new Set([...prev, a, b]));
          setFlipped([]); setDisabled(false); setLocalScores(ns); setFeedback(null);
          if (matchedCount + 1 === totalPairs) {
            onRoundEnd(ns, cp);
          }
        }, 800);
      } else {
        ns[cp].streak = 0;
        setFeedback({ type: "wrong", text: "✗ Not a match" });
        setTimeout(() => {
          setFlipped([]); setDisabled(false); setLocalScores(ns); setFeedback(null);
          if (players.length > 1) setCp((cp + 1) % players.length);
        }, 1000);
      }
    }
  }, [phase, flipped, cards, disabled, matched, localScores, cp, players, matchedCount, totalPairs, roundWords, onRoundEnd]);

  const totalCards = cards.length;
  const gridCls = `grid ${totalCards <= 6 ? "grid-3" : "grid-4"}`;
  const memoProgress = memoTime > 0 ? (memoCountdown / memoTime) : 0;
  const memoColor = memoCountdown <= 5 ? "#ef4444" : memoCountdown <= 10 ? "#f59e0b" : "#4ade80";

  return (
    <div className="game">
      <div className="round-badge">
        Round <strong>{roundNum}</strong> of <strong>{totalRounds}</strong>
      </div>

      {phase === "memorize" && (
        <div className="memo-header">
          <div className="memo-top">
            <div>
              <div className="memo-label">🧠 Memorize!</div>
              <div className="memo-sub">Study the cards. Remember positions and meanings.</div>
            </div>
            <div className="memo-countdown" style={{ color: memoColor }}>{memoCountdown}s</div>
          </div>
          <div className="progress-bar memo">
            <div style={{
              height: "100%", width: `${memoProgress * 100}%`,
              background: memoCountdown <= 5 ? "#ef4444"
                : memoCountdown <= 10 ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                : "linear-gradient(90deg, #4ade80, #3b82f6)",
              borderRadius: 4, transition: "width 1s linear, background 0.5s",
            }} />
          </div>
        </div>
      )}

      {phase === "play" && (
        <div className="game-header">
          <div className="header-row">
            <span className="progress-text">{matchedCount}/{totalPairs} pairs</span>
            {players.length > 1 ? (
              <div className="player-turns">
                {players.map((p, i) => (
                  <span key={i} className={`player-turn ${i === cp ? "active" : "inactive"}`}>
                    {p.name}: {localScores[i].matches}
                  </span>
                ))}
              </div>
            ) : (
              <span className="stats-line">Attempts: {localScores[0].attempts} | Streak: {localScores[0].streak}</span>
            )}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(matchedCount / totalPairs) * 100}%` }} />
          </div>
        </div>
      )}

      {feedback && <div className={`feedback ${feedback.type}`}>{feedback.text}</div>}

      <div className={gridCls}>
        {cards.map((card, i) => (
          <Card key={card.id} card={card}
            isFlipped={phase === "memorize" || flipped.includes(i)}
            isMatched={matched.has(i)}
            onClick={() => handleFlip(i)}
            disabled={disabled || phase === "memorize"} />
        ))}
      </div>
    </div>
  );
}

function ReviewScreen({ words, onDone }) {
  const rounds = chunkArray(words, ROUND_SIZE);
  const [currentRound, setCurrentRound] = useState(0);
  const [revealed, setRevealed] = useState(new Set());

  const roundWords = rounds[currentRound] || [];
  const allRevealed = roundWords.every((_, i) => revealed.has(i));
  const isLastRound = currentRound === rounds.length - 1;

  const reveal = (i) => setRevealed((prev) => new Set([...prev, i]));

  const nextRound = () => {
    if (isLastRound) {
      onDone();
    } else {
      setCurrentRound(currentRound + 1);
      setRevealed(new Set());
    }
  };

  return (
    <div className="review-screen">
      <h2 style={{ color: "#e2e8f0", fontSize: 20 }}>📚 Vocabulary Review</h2>
      <p style={{ color: "#94a3b8", fontSize: 13 }}>
        Try to recall each definition before revealing it.
      </p>

      <div className="review-round-header">
        <div className="review-round-title">Review Round {currentRound + 1} of {rounds.length}</div>
        <div className="review-round-sub">{roundWords.length} words</div>
      </div>

      <div className="review-list">
        {roundWords.map((w, i) => (
          <div key={i} className={`review-card ${revealed.has(i) ? "revealed" : ""}`} onClick={() => reveal(i)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="rw">{w.word}</span>
              {!revealed.has(i) && <span className="rh">tap to reveal</span>}
            </div>
            {revealed.has(i) && <div className="rd">{w.definition}</div>}
          </div>
        ))}
      </div>

      <button className="next-round-btn" disabled={!allRevealed} onClick={nextRound}>
        {isLastRound ? "See Results" : `Next Review Round →`}
      </button>

      <div className="review-progress">
        You must reveal all words to continue
      </div>
    </div>
  );
}

function ResultScreen({ data, onRestart, onNewGame, onBackToMenu }) {
  const { scores, words } = data;
  const isMulti = scores.length > 1;
  const totalAttempts = scores.reduce((a, s) => a + s.attempts, 0);
  const efficiency = Math.round((words.length / Math.max(totalAttempts, 1)) * 100);
  const rank = getRank(efficiency);
  const winner = isMulti ? scores.reduce((best, s, i) => (s.matches > scores[best].matches ? i : best), 0) : 0;
  const bestStreak = Math.max(...scores.map((s) => s.bestStreak));

  return (
    <div className="results">
      <div className="result-emoji">{rank.emoji}</div>
      <h1 className="result-title" style={{ color: rank.color }}>{rank.label}</h1>
      {isMulti && (
        <div className="winner-badge">🏆 Winner: {data.players?.[winner]?.name || `Player ${winner + 1}`}</div>
      )}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalAttempts}</div>
          <div className="stat-label">Attempts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: rank.color }}>{efficiency}%</div>
          <div className="stat-label">Efficiency</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{bestStreak}🔥</div>
          <div className="stat-label">Best Streak</div>
        </div>
      </div>
      {isMulti && (
        <div className="player-scores">
          {scores.map((s, i) => (
            <div key={i} className={`pscore ${i === winner ? "winner" : ""}`}>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                {i === winner ? "👑 " : ""}{data.players?.[i]?.name || `Player ${i + 1}`}
              </span>
              <span style={{ color: "#94a3b8" }}>{s.matches} matches / {s.attempts} attempts</span>
            </div>
          ))}
        </div>
      )}
      <div className="result-btns">
        <button className="restart-btn" onClick={onRestart}>Play Again</button>
        <button className="newgame-btn" onClick={onNewGame}>New Words</button>
        <button className="newgame-btn" onClick={onBackToMenu}>Back to Games</button>
      </div>
    </div>
  );
}

// ---- MAIN ----

export default function App() {
  const savedKey = getCookie("lexicon_key");
  if (savedKey) setApiKey(savedKey);

  const [screen, setScreen] = useState(savedKey ? "select" : "login");
  const [allWords, setAllWords] = useState([]);
  const [players, setPlayers] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [scores, setScores] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [finalScores, setFinalScores] = useState(null);

  const backToMenu = () => {
    setScreen("select");
    setAllWords([]);
    setPlayers([]);
    setRounds([]);
    setFinalScores(null);
  };

  const startGame = (words, pls) => {
    setAllWords(words);
    setPlayers(pls);
    const r = chunkArray(words, ROUND_SIZE);
    setRounds(r);
    setCurrentRound(0);
    setScores(pls.map(() => ({ matches: 0, attempts: 0, streak: 0, bestStreak: 0 })));
    setCurrentPlayer(0);
    setScreen("game");
  };

  const handleRoundEnd = (newScores, lastPlayer) => {
    setScores(newScores);
    setCurrentPlayer(lastPlayer);
    if (currentRound + 1 < rounds.length) {
      setCurrentRound(currentRound + 1);
    } else {
      setFinalScores(newScores);
      setScreen("review");
    }
  };

  const handleReviewDone = () => {
    const totalAttempts = finalScores.reduce((a, s) => a + s.attempts, 0);
    const efficiency = Math.round((allWords.length / Math.max(totalAttempts, 1)) * 100);
    saveGameResult({
      date: new Date().toISOString(),
      wordCount: allWords.length,
      players: players.map((p) => p.name),
      scores: finalScores,
      totalAttempts,
      efficiency,
    }).catch(() => {});
    setScreen("result");
  };

  const restart = () => {
    const r = chunkArray(allWords, ROUND_SIZE);
    setRounds(r);
    setCurrentRound(0);
    setScores(players.map(() => ({ matches: 0, attempts: 0, streak: 0, bestStreak: 0 })));
    setCurrentPlayer(0);
    setFinalScores(null);
    setScreen("game");
  };

  const newGame = () => {
    setScreen("setup");
    setAllWords([]);
    setPlayers([]);
    setRounds([]);
    setFinalScores(null);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {screen === "login" && <LoginScreen onLogin={() => setScreen("select")} />}
        {screen === "select" && (
          <GameSelectScreen onSelect={(g) => setScreen(g === "lexicon" ? "setup" : "vm")} />
        )}
        {screen === "setup" && <SetupScreen onStart={startGame} onBack={backToMenu} />}
        {screen === "game" && rounds[currentRound] && (
          <RoundScreen
            key={currentRound}
            roundWords={rounds[currentRound]}
            roundNum={currentRound + 1}
            totalRounds={rounds.length}
            players={players}
            currentPlayer={currentPlayer}
            scores={scores}
            onRoundEnd={handleRoundEnd}
          />
        )}
        {screen === "review" && (
          <ReviewScreen words={allWords} onDone={handleReviewDone} />
        )}
        {screen === "result" && (
          <ResultScreen
            data={{ scores: finalScores, words: allWords, players }}
            onRestart={restart}
            onNewGame={newGame}
            onBackToMenu={backToMenu}
          />
        )}
        {screen === "vm" && <VocabMemory onBack={backToMenu} />}
      </div>
    </>
  );
}

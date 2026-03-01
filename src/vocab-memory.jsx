import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadSaves, saveWordList, deletePlayer, deleteWordList } from "./api.js";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const VM_CSS = `
  .vm-setup, .vm-game, .vm-result {
    max-width: 700px; width: 100%;
    font-family: 'Nunito', sans-serif;
  }
  .vm-setup { max-width: 600px; display: flex; flex-direction: column; gap: 20px; }
  .vm-title {
    font-family: 'Fredoka', sans-serif;
    font-size: 2.2rem; font-weight: 700; text-align: center;
    background: linear-gradient(135deg, #e94560, #f5a623);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; margin-bottom: 4px;
  }
  .vm-subtitle { text-align: center; color: #8892a4; font-size: 0.95rem; margin-bottom: 8px; }

  .vm-back-btn {
    background: none; border: 1px solid #334155; border-radius: 10px;
    padding: 8px 16px; font-size: 13px; color: #94a3b8; cursor: pointer;
    align-self: flex-start; font-family: 'Nunito', sans-serif;
  }

  .vm-section {
    background: #16213e; border-radius: 16px; padding: 24px;
    border: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column; gap: 10px;
  }
  .vm-section h2 {
    font-family: 'Fredoka', sans-serif; font-size: 1.2rem;
    color: #f5a623; margin: 0;
  }

  .vm-player-row { display: flex; gap: 10px; align-items: center; }
  .vm-input {
    background: rgba(255,255,255,0.07); border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 10px 14px; color: #eef2f7;
    font-family: 'Nunito', sans-serif; font-size: 0.95rem;
    outline: none; width: 100%; transition: border-color 0.2s;
  }
  .vm-input:focus { border-color: #f5a623; }
  .vm-textarea {
    background: rgba(255,255,255,0.07); border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 12px 14px; color: #eef2f7;
    font-family: 'Nunito', sans-serif; font-size: 0.95rem;
    outline: none; width: 100%; min-height: 100px; resize: vertical;
    transition: border-color 0.2s;
  }
  .vm-textarea:focus { border-color: #f5a623; }
  .vm-remove-btn {
    background: rgba(233,69,96,0.2); color: #e94560; border: none;
    width: 36px; height: 36px; border-radius: 10px; cursor: pointer;
    font-size: 1.2rem; flex-shrink: 0; display: flex;
    align-items: center; justify-content: center;
  }
  .vm-add-player-btn {
    background: rgba(83,215,105,0.15); color: #53d769;
    border: 2px dashed rgba(83,215,105,0.3); border-radius: 12px;
    padding: 10px; width: 100%; cursor: pointer;
    font-family: 'Nunito', sans-serif; font-size: 0.95rem; font-weight: 600;
  }

  .vm-hint { color: #6b7280; font-size: 0.85rem; margin: 0; }
  .vm-word-tags { display: flex; flex-wrap: wrap; gap: 8px; min-height: 20px; }
  .vm-word-tag {
    background: rgba(245,166,35,0.15); color: #f5a623;
    padding: 5px 12px; border-radius: 20px; font-size: 0.85rem;
    font-weight: 600; display: flex; align-items: center; gap: 6px;
  }
  .vm-tag-remove { cursor: pointer; opacity: 0.6; font-size: 0.9rem; }
  .vm-tag-remove:hover { opacity: 1; }
  .vm-time-display {
    font-family: 'Fredoka'; font-size: 1.3rem; font-weight: 600;
    color: #f5a623; min-width: 40px; text-align: right;
  }
  .vm-start-btn {
    background: linear-gradient(135deg, #e94560, #d63851); color: white;
    border: none; border-radius: 14px; padding: 14px 28px;
    font-family: 'Fredoka', sans-serif; font-size: 1.15rem;
    font-weight: 600; cursor: pointer; width: 100%;
    box-shadow: 0 4px 20px rgba(233,69,96,0.3);
    letter-spacing: 0.5px; transition: transform 0.15s;
  }
  .vm-start-btn:hover { transform: translateY(-2px); }
  .vm-start-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* GAME SCREEN */
  .vm-game { display: flex; flex-direction: column; gap: 12px; }
  .vm-game-header {
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 12px;
  }
  .vm-current-player { font-family: 'Fredoka', sans-serif; font-size: 1.3rem; font-weight: 600; }
  .vm-current-player .vm-pname { color: #f5a623; }
  .vm-scoreboard { display: flex; gap: 12px; flex-wrap: wrap; }
  .vm-score-card {
    background: #16213e; border-radius: 12px; padding: 10px 18px;
    flex: 1; min-width: 100px; text-align: center;
    border: 2px solid rgba(255,255,255,0.06); transition: 0.3s;
  }
  .vm-score-card.active { border-color: #f5a623; box-shadow: 0 0 20px rgba(245,166,35,0.15); }
  .vm-score-card .vm-sc-name { font-weight: 700; font-size: 0.85rem; margin-bottom: 2px; }
  .vm-score-card .vm-sc-pts {
    font-family: 'Fredoka', sans-serif; font-size: 1.6rem;
    font-weight: 700; color: #f5a623;
  }
  .vm-phase-msg {
    text-align: center; font-family: 'Fredoka', sans-serif; font-size: 1.2rem;
    padding: 14px; background: #16213e; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .vm-timer-bar {
    background: rgba(255,255,255,0.08); border-radius: 100px;
    height: 10px; width: 100%; overflow: hidden;
  }
  .vm-timer-fill {
    height: 100%; background: linear-gradient(90deg, #53d769, #f5a623);
    border-radius: 100px; transition: width 0.1s linear;
  }
  .vm-countdown {
    font-family: 'Fredoka', sans-serif; font-size: 2.5rem;
    font-weight: 700; color: #f5a623; text-align: center; margin: 4px 0;
  }

  /* CARDS */
  .vm-card-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 14px;
  }
  .vm-card {
    aspect-ratio: 3/4; perspective: 800px; cursor: pointer;
  }
  .vm-card.removed { visibility: hidden; pointer-events: none; }
  .vm-card.selected { outline: 3px solid #f5a623; outline-offset: 2px; border-radius: 14px; }
  .vm-card-inner {
    position: relative; width: 100%; height: 100%;
    transition: transform 0.5s ease; transform-style: preserve-3d;
  }
  .vm-card.flipped .vm-card-inner { transform: rotateY(180deg); }
  .vm-card-face {
    position: absolute; inset: 0; backface-visibility: hidden;
    border-radius: 14px; display: flex; align-items: center;
    justify-content: center; padding: 12px; font-weight: 700;
    text-align: center; word-break: break-word;
  }
  .vm-card-back {
    background: linear-gradient(145deg, #0f3460, #1a4a8a);
    border: 3px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    color: rgba(255,255,255,0.15); font-family: 'Fredoka', sans-serif;
    font-size: 2.5rem;
  }
  .vm-card-front {
    background: #e8f0fe; color: #1a1a2e; transform: rotateY(180deg);
    font-family: 'Fredoka', sans-serif; font-size: 1.15rem;
    border: 3px solid rgba(0,0,0,0.06); box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .vm-card.correct .vm-card-front {
    background: linear-gradient(145deg, #d4edda, #b8e6c8);
    border-color: #53d769;
  }
  .vm-card.wrong .vm-card-front {
    background: linear-gradient(145deg, #fde2e7, #f5c6cb);
    border-color: #e94560;
  }

  /* GUESS */
  .vm-guess-section { text-align: center; }
  .vm-guess-prompt {
    font-family: 'Fredoka', sans-serif; font-size: 1rem;
    margin-bottom: 10px; color: #a0aec0;
  }
  .vm-guess-row { display: flex; gap: 10px; max-width: 400px; margin: 0 auto; }
  .vm-guess-btn {
    background: #f5a623; color: #1a1a2e; border: none; border-radius: 12px;
    padding: 10px 20px; font-family: 'Fredoka', sans-serif;
    font-size: 1rem; font-weight: 600; cursor: pointer; white-space: nowrap;
  }

  /* TOAST */
  .vm-toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
    padding: 14px 28px; border-radius: 14px; font-family: 'Fredoka', sans-serif;
    font-size: 1.1rem; font-weight: 600; z-index: 200;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
  }
  .vm-toast.show { transform: translateX(-50%) translateY(0); }
  .vm-toast.correct { background: #53d769; color: #0d3015; box-shadow: 0 4px 24px rgba(83,215,105,0.4); }
  .vm-toast.wrong { background: #e94560; color: white; box-shadow: 0 4px 24px rgba(233,69,96,0.4); }

  /* RESULT */
  .vm-result { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; padding-top: 24px; }
  .vm-trophy { font-size: 5rem; animation: vm-bounce 1s ease infinite; }
  @keyframes vm-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
  .vm-winner-name {
    font-family: 'Fredoka', sans-serif; font-size: 2.4rem; font-weight: 700;
    background: linear-gradient(135deg, #f5a623, #f7d774, #f5a623);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text; animation: vm-shimmer 2s linear infinite;
  }
  @keyframes vm-shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
  .vm-winner-sub { font-size: 1.2rem; color: #8892a4; }
  .vm-final-scores { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
  .vm-fs-card {
    background: #16213e; border-radius: 16px; padding: 18px 24px;
    min-width: 130px; border: 2px solid rgba(255,255,255,0.06);
  }
  .vm-fs-card.winner { border-color: #f5a623; box-shadow: 0 0 30px rgba(245,166,35,0.2); }
  .vm-fs-name { font-weight: 700; margin-bottom: 4px; }
  .vm-fs-pts { font-family: 'Fredoka', sans-serif; font-size: 1.8rem; color: #f5a623; }

  .vm-jam-container { position: relative; width: 160px; height: 200px; margin: 0 auto; }
  .vm-jar-body {
    width: 100px; height: 110px;
    background: linear-gradient(180deg, rgba(220,40,60,0.85), rgba(180,20,40,0.9));
    border-radius: 8px 8px 20px 20px; position: absolute;
    bottom: 0; left: 50%; transform: translateX(-50%);
    border: 3px solid rgba(255,255,255,0.15); overflow: hidden;
  }
  .vm-jar-body::after {
    content: ''; position: absolute; top: 8px; left: 8px;
    width: 20px; height: 60px; background: rgba(255,255,255,0.15);
    border-radius: 10px;
  }
  .vm-jar-neck {
    width: 70px; height: 20px; background: rgba(220,40,60,0.7);
    border-radius: 4px 4px 0 0; position: absolute;
    bottom: 108px; left: 50%; transform: translateX(-50%);
    border: 3px solid rgba(255,255,255,0.15); border-bottom: none;
  }
  .vm-jar-lid {
    width: 80px; height: 22px;
    background: linear-gradient(180deg, #d4a843, #b8922e);
    border-radius: 6px; position: absolute; bottom: 126px;
    left: 50%; transform: translateX(-50%);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .vm-jam-label {
    position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
    background: #fff8e8; padding: 6px 14px; border-radius: 4px;
    font-family: 'Fredoka', sans-serif; font-size: 0.65rem;
    color: #6b3a0a; font-weight: 600; white-space: nowrap;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .vm-sparkles { position: absolute; inset: -20px; pointer-events: none; }
  .vm-sparkle {
    position: absolute; width: 8px; height: 8px;
    background: #f5a623; border-radius: 50%;
    animation: vm-sparkle 1.5s ease-in-out infinite;
  }
  .vm-sparkle:nth-child(1) { top: 10%; left: 5%; animation-delay: 0s; }
  .vm-sparkle:nth-child(2) { top: 20%; right: 0; animation-delay: 0.3s; }
  .vm-sparkle:nth-child(3) { bottom: 30%; left: 0; animation-delay: 0.6s; }
  .vm-sparkle:nth-child(4) { top: 5%; right: 20%; animation-delay: 0.9s; }
  .vm-sparkle:nth-child(5) { bottom: 10%; right: 10%; animation-delay: 0.2s; }
  @keyframes vm-sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }

  .vm-result-btns { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .vm-play-again-btn {
    background: linear-gradient(135deg, #53d769, #3bb85a); color: white;
    border: none; border-radius: 14px; padding: 14px 32px;
    font-family: 'Fredoka', sans-serif; font-size: 1.1rem;
    font-weight: 600; cursor: pointer;
    box-shadow: 0 4px 20px rgba(83,215,105,0.3);
  }

  .vm-confetti { position: fixed; inset: 0; pointer-events: none; z-index: 100; }

  @media (max-width: 500px) {
    .vm-title { font-size: 1.6rem; }
    .vm-card-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
    .vm-section { padding: 16px; }
  }
`;

// ---- SETUP ----

function VMSetupScreen({ onStart, onBack }) {
  const [playerNames, setPlayerNames] = useState([]);
  const [wordText, setWordText] = useState("");
  const [memorizeTime, setMemorizeTime] = useState(15);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showSaves, setShowSaves] = useState(false);
  const [saves, setSaves] = useState({});
  const [savesLoading, setSavesLoading] = useState(false);
  const [savePlayerPicker, setSavePlayerPicker] = useState(false);
  const [error, setError] = useState("");

  const words = useMemo(() => {
    const parsed = wordText
      .split(/[,\n]+/)
      .map(w => w.trim().replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter(w => w.length > 0);
    const seen = new Set();
    const unique = [];
    for (const w of parsed) {
      if (!seen.has(w)) { seen.add(w); unique.push(w); }
    }
    return unique;
  }, [wordText]);

  const fetchSaves = async () => {
    setSavesLoading(true);
    try {
      const { saves: s } = await loadSaves("vm");
      setSaves(s || {});
    } catch { setSaves({}); }
    setSavesLoading(false);
  };

  const handleSave = async (playerName) => {
    const validNames = playerNames.filter((n) => n.trim());
    if (playerName) {
      setSaveStatus("saving");
      setSavePlayerPicker(false);
      try {
        await saveWordList("vm", playerName, words);
        setSaveStatus("saved");
        if (showSaves) await fetchSaves();
      } catch { setSaveStatus("error"); }
      setTimeout(() => setSaveStatus(null), 2000);
      return;
    }
    if (validNames.length === 1) {
      return handleSave(validNames[0]);
    }
    if (validNames.length > 1) {
      await fetchSaves();
      setSavePlayerPicker(true);
      return;
    }
    setError("Add at least one player to save under");
  };

  const handleToggleSaves = async () => {
    if (!showSaves) await fetchSaves();
    setShowSaves(!showSaves);
  };

  const handleDeletePlayer = async (player) => {
    await deletePlayer("vm", player);
    await fetchSaves();
  };

  const handleDeleteWordList = async (player, index) => {
    await deleteWordList("vm", player, index);
    await fetchSaves();
  };

  const handleLoadWordList = (wordList) => {
    setWordText(wordList.join(", "));
    setShowSaves(false);
  };

  const addPlayer = () => {
    if (playerNames.length >= 6) return;
    setPlayerNames([...playerNames, ""]);
  };

  const updatePlayer = (i, val) => {
    const next = [...playerNames];
    next[i] = val;
    setPlayerNames(next);
  };

  const removePlayer = (i) => setPlayerNames(playerNames.filter((_, idx) => idx !== i));

  const removeWord = (i) => {
    const remaining = words.filter((_, idx) => idx !== i);
    setWordText(remaining.join(", "));
  };

  const validPlayers = playerNames.filter(n => n.trim().length > 0);
  const canStart = words.length >= 4 && validPlayers.length >= 1;

  return (
    <div className="vm-setup">
      <h1 className="vm-title">Vocab Memory</h1>
      <p className="vm-subtitle">Type words, memorize them, guess them, win the jam!</p>
      <button className="vm-back-btn" onClick={onBack}>← Back to Games</button>

      <div className="vm-section">
        <h2>Players</h2>
        {playerNames.map((name, i) => (
          <div key={i} className="vm-player-row">
            <input
              className="vm-input"
              type="text"
              placeholder={`Player ${i + 1} name`}
              maxLength={20}
              value={name}
              onChange={(e) => updatePlayer(i, e.target.value)}
            />
            <button className="vm-remove-btn" onClick={() => removePlayer(i)}>×</button>
          </div>
        ))}
        {playerNames.length < 6 && (
          <button className="vm-add-player-btn" onClick={addPlayer}>+ Add Player</button>
        )}
      </div>

      <div className="vm-section">
        <h2>Vocabulary Words</h2>
        <textarea
          className="vm-textarea"
          value={wordText}
          onChange={(e) => setWordText(e.target.value)}
          placeholder={"Type or paste words here, separated by commas or new lines...\n\nExample: apple, banana, cherry, dog, elephant"}
        />
        <p className="vm-hint">Separate words with commas or new lines. Minimum 4 words.</p>
        <div className="vm-word-tags">
          {words.map((w, i) => (
            <span key={i} className="vm-word-tag">
              {w}
              <span className="vm-tag-remove" onClick={() => removeWord(i)}>×</span>
            </span>
          ))}
        </div>
      </div>

      <div className="vm-section">
        <h2>Memorize Time</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range" min="5" max="60" value={memorizeTime}
            onChange={(e) => setMemorizeTime(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: "#f5a623" }}
          />
          <span className="vm-time-display">{memorizeTime}s</span>
        </div>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</p>}

      {savePlayerPicker && (
        <div className="vm-section">
          <h2>Save under which player?</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {playerNames.filter((n) => n.trim()).map((p) => (
              <button key={p} className="vm-word-tag" style={{ cursor: "pointer", border: "none" }}
                onClick={() => handleSave(p)}>
                {p}
              </button>
            ))}
          </div>
          <button className="vm-back-btn" style={{ marginTop: 8 }} onClick={() => setSavePlayerPicker(false)}>Cancel</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="vm-back-btn" style={{ flex: 1, textAlign: "center" }} onClick={() => handleSave()} disabled={saveStatus === "saving" || savePlayerPicker}>
          {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Save Failed" : "Save"}
        </button>
        <button className="vm-back-btn" style={{ flex: 1, textAlign: "center" }} onClick={handleToggleSaves}>
          {showSaves ? "Hide Saved" : "Load"}
        </button>
      </div>

      {showSaves && (
        <div className="vm-section">
          <h2>Saved Data</h2>
          {savesLoading ? (
            <p className="vm-hint">Loading...</p>
          ) : Object.keys(saves).length === 0 ? (
            <p className="vm-hint">No saved word lists yet.</p>
          ) : (
            Object.entries(saves).map(([player, lists]) => (
              <div key={player} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ color: "#eef2f7", fontSize: 14 }}>{player}</strong>
                  <button className="vm-remove-btn" style={{ width: 28, height: 28, fontSize: "0.9rem" }} onClick={() => handleDeletePlayer(player)}>×</button>
                </div>
                {lists.map((wl, idx) => (
                  <div key={idx} className="vm-word-tag" style={{ cursor: "pointer", marginBottom: 4, display: "flex", justifyContent: "space-between", width: "100%", borderRadius: 8, padding: "8px 12px" }}
                    onClick={() => handleLoadWordList(wl)}>
                    <span style={{ fontSize: "0.85rem" }}>
                      #{idx + 1} — {wl.slice(0, 3).join(", ")}
                      {wl.length > 3 ? ` +${wl.length - 3} more` : ""}
                    </span>
                    <span className="vm-tag-remove" onClick={(e) => { e.stopPropagation(); handleDeleteWordList(player, idx); }}>×</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      <button className="vm-start-btn" disabled={!canStart}
        onClick={() => onStart(words, validPlayers, memorizeTime)}>
        Start Game
      </button>
    </div>
  );
}

// ---- GAME ----

function VMGameScreen({ words: initialWords, players, memorizeTime: baseTime, onEnd }) {
  const [cards, setCards] = useState(() => {
    const shuffled = shuffle([...initialWords]);
    return shuffled.map((w, i) => ({ word: w, id: i, flipped: true, removed: false }));
  });
  const [phase, setPhase] = useState("memorize");
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [scores, setScores] = useState(() => {
    const s = {};
    players.forEach(p => (s[p] = 0));
    return s;
  });
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [cardStatus, setCardStatus] = useState({});
  const [guess, setGuess] = useState("");
  const [toast, setToast] = useState(null);
  const [countdown, setCountdown] = useState(baseTime);
  const [timerPct, setTimerPct] = useState(100);
  const [processing, setProcessing] = useState(false);

  const timerRef = useRef(null);
  const roundNumRef = useRef(0);
  const scoresRef = useRef(scores);
  const playerIdxRef = useRef(0);
  const guessInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { playerIdxRef.current = currentPlayerIdx; }, [currentPlayerIdx]);

  // Detect game end when all cards are removed
  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.removed)) {
      onEnd(players, scoresRef.current);
    }
  }, [cards]);

  const showToast = useCallback((text, type) => {
    setToast({ text, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const startMemorize = useCallback((time) => {
    setPhase("memorize");
    setSelectedIdx(null);
    setGuess("");
    setCountdown(time);
    setTimerPct(100);
    setCards(prev => prev.map(c => c.removed ? c : { ...c, flipped: true }));

    clearInterval(timerRef.current);
    const endTime = Date.now() + time * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setCountdown(Math.ceil(remaining / 1000));
      setTimerPct((remaining / (time * 1000)) * 100);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setPhase("play");
        setCards(prev => prev.map(c => c.removed ? c : { ...c, flipped: false }));
      }
    }, 100);
  }, []);

  // Initial memorize
  useEffect(() => {
    startMemorize(baseTime);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(toastTimerRef.current);
    };
  }, [baseTime, startMemorize]);

  const onCardClick = useCallback((idx) => {
    if (phase !== "play" || processing) return;
    if (cards[idx].removed) return;
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }
    setSelectedIdx(idx);
    setGuess("");
    setTimeout(() => guessInputRef.current?.focus(), 50);
  }, [phase, processing, cards, selectedIdx]);

  const submitGuess = useCallback(() => {
    if (selectedIdx === null || processing) return;
    const cleanGuess = guess.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanGuess) return;

    const card = cards[selectedIdx];
    const isCorrect = cleanGuess === card.word.toLowerCase();
    const idx = selectedIdx;

    setProcessing(true);
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: true } : c));
    setCardStatus(prev => ({ ...prev, [idx]: isCorrect ? "correct" : "wrong" }));
    setSelectedIdx(null);
    setGuess("");

    if (isCorrect) {
      showToast("Correct! +1 point", "correct");
      const player = players[playerIdxRef.current];
      setScores(prev => ({ ...prev, [player]: prev[player] + 1 }));

      setTimeout(() => {
        let remaining;
        setCards(prev => {
          const next = prev.map((c, i) => i === idx ? { ...c, removed: true } : c);
          remaining = next.filter(c => !c.removed).length;
          return next;
        });
        setCardStatus(prev => { const n = { ...prev }; delete n[idx]; return n; });
        setProcessing(false);
      }, 1200);
    } else {
      showToast(`Wrong! It was "${card.word}"`, "wrong");

      setTimeout(() => {
        setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: false } : c));
        setCardStatus(prev => { const n = { ...prev }; delete n[idx]; return n; });
        const nextPlayer = (playerIdxRef.current + 1) % players.length;
        setCurrentPlayerIdx(nextPlayer);
        setProcessing(false);

        const newRound = roundNumRef.current + 1;
        roundNumRef.current = newRound;
        const time = Math.max(1, Math.round(baseTime * Math.pow(0.5, newRound)));
        startMemorize(time);
      }, 2000);
    }
  }, [selectedIdx, processing, guess, cards, players, baseTime, showToast, startMemorize, onEnd]);

  return (
    <div className="vm-game">
      <div className="vm-game-header">
        <div className="vm-current-player">
          Turn: <span className="vm-pname">{players[currentPlayerIdx]}</span>
        </div>
      </div>

      <div className="vm-scoreboard">
        {players.map((p, i) => (
          <div key={i} className={`vm-score-card ${i === currentPlayerIdx ? "active" : ""}`}>
            <div className="vm-sc-name">{p}</div>
            <div className="vm-sc-pts">{scores[p]}</div>
          </div>
        ))}
      </div>

      {phase === "memorize" && (
        <>
          <div className="vm-phase-msg">
            Look carefully!
            <div className="vm-countdown">{countdown}</div>
          </div>
          <div className="vm-timer-bar">
            <div className="vm-timer-fill" style={{ width: `${timerPct}%` }} />
          </div>
        </>
      )}

      {phase === "play" && (
        <div className="vm-phase-msg">
          {selectedIdx !== null
            ? "What word is on this card?"
            : `${players[currentPlayerIdx]}, click a card and guess the word!`}
        </div>
      )}

      <div className="vm-card-grid">
        {cards.map((c, i) => (
          <div
            key={c.id}
            className={[
              "vm-card",
              c.flipped ? "flipped" : "",
              c.removed ? "removed" : "",
              selectedIdx === i ? "selected" : "",
              cardStatus[i] || "",
            ].filter(Boolean).join(" ")}
            onClick={() => onCardClick(i)}
          >
            <div className="vm-card-inner">
              <div className="vm-card-face vm-card-back">?</div>
              <div className="vm-card-face vm-card-front">{c.word}</div>
            </div>
          </div>
        ))}
      </div>

      {phase === "play" && selectedIdx !== null && (
        <div className="vm-guess-section">
          <p className="vm-guess-prompt">What word is on this card?</p>
          <div className="vm-guess-row">
            <input
              ref={guessInputRef}
              className="vm-input"
              type="text"
              placeholder="Type your guess..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              autoComplete="off"
            />
            <button className="vm-guess-btn" onClick={submitGuess}>Check</button>
          </div>
        </div>
      )}

      <div className={`vm-toast ${toast ? "show" : ""} ${toast?.type || ""}`}>
        {toast?.text}
      </div>
    </div>
  );
}

// ---- CONFETTI ----

function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#e94560", "#f5a623", "#53d769", "#4fc3f7", "#ab47bc", "#ff7043"];
    const particles = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        drift: (Math.random() - 0.5) * 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let frame = 0;
    let animId;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.y += p.speed;
        p.x += p.drift;
        p.rot += p.rotSpeed;
        if (p.y > canvas.height + 20) {
          p.opacity -= 0.02;
          if (p.opacity <= 0) continue;
        }
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 300) animId = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="vm-confetti" />;
}

// ---- RESULT ----

function VMResultScreen({ players, scores, onPlayAgain, onBack }) {
  const maxScore = Math.max(...Object.values(scores));
  const winners = players.filter(p => scores[p] === maxScore);

  return (
    <div className="vm-result">
      <Confetti />
      <div className="vm-trophy">🏆</div>
      <div className="vm-winner-name">
        {winners.length === 1 ? `${winners[0]} wins!` : "It's a tie!"}
      </div>
      <div className="vm-winner-sub">
        {winners.length === 1
          ? `${maxScore} word${maxScore !== 1 ? "s" : ""} remembered!`
          : `${winners.join(" & ")} tied with ${maxScore} points!`}
      </div>

      <div className="vm-jam-container">
        <div style={{ width: 120, height: 150, margin: "0 auto", position: "relative" }}>
          <div className="vm-jar-lid" />
          <div className="vm-jar-neck" />
          <div className="vm-jar-body" />
          <div className="vm-jam-label">WINNER'S JAM</div>
        </div>
        <div className="vm-sparkles">
          <div className="vm-sparkle" />
          <div className="vm-sparkle" />
          <div className="vm-sparkle" />
          <div className="vm-sparkle" />
          <div className="vm-sparkle" />
        </div>
      </div>

      <div className="vm-final-scores">
        {players.map((p, i) => (
          <div key={i} className={`vm-fs-card ${scores[p] === maxScore ? "winner" : ""}`}>
            <div className="vm-fs-name">{p}</div>
            <div className="vm-fs-pts">{scores[p]}</div>
          </div>
        ))}
      </div>

      <div className="vm-result-btns">
        <button className="vm-play-again-btn" onClick={onPlayAgain}>Play Again</button>
        <button className="vm-back-btn" onClick={onBack}>Back to Games</button>
      </div>
    </div>
  );
}

// ---- MAIN ----

export default function VocabMemory({ onBack }) {
  const [screen, setScreen] = useState("setup");
  const [gameConfig, setGameConfig] = useState(null);
  const [result, setResult] = useState(null);

  const handleStart = (words, players, memorizeTime) => {
    setGameConfig({ words, players, memorizeTime });
    setScreen("game");
  };

  const handleEnd = (players, scores) => {
    setResult({ players, scores });
    setScreen("result");
  };

  const handlePlayAgain = () => {
    setScreen("setup");
    setGameConfig(null);
    setResult(null);
  };

  return (
    <>
      <style>{VM_CSS}</style>
      {screen === "setup" && <VMSetupScreen onStart={handleStart} onBack={onBack} />}
      {screen === "game" && gameConfig && (
        <VMGameScreen
          key={Date.now()}
          words={gameConfig.words}
          players={gameConfig.players}
          memorizeTime={gameConfig.memorizeTime}
          onEnd={handleEnd}
        />
      )}
      {screen === "result" && result && (
        <VMResultScreen
          players={result.players}
          scores={result.scores}
          onPlayAgain={handlePlayAgain}
          onBack={onBack}
        />
      )}
    </>
  );
}

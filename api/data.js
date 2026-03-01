import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEYS = {
  lexicon: { words: "lexicon:words", players: "lexicon:players", saves: "lexicon:saves" },
  vm: { words: "lexicon:vmwords", players: "lexicon:vmplayers", saves: "lexicon:vmsaves" },
};

export default async function handler(req, res) {
  try {
    if (req.headers["x-api-key"] !== process.env.LEXICON_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const game = req.method === "GET" ? req.query.game : req.body?.game;
    const keys = KEYS[game];
    if (!keys) {
      return res.status(400).json({ error: "Invalid game. Use 'lexicon' or 'vm'." });
    }

    if (req.method === "GET") {
      const action = req.query.action;
      if (action === "saves") {
        const saves = await redis.get(keys.saves);
        return res.json({ saves: saves || {} });
      }
      const results = await redis.pipeline()
        .get(keys.words)
        .get(keys.players)
        .exec();
      return res.json({ words: results[0] || [], players: results[1] || [] });
    }

    if (req.method === "POST") {
      const { action, player, words, players, index } = req.body;

      if (action === "save") {
        const saves = (await redis.get(keys.saves)) || {};
        if (!saves[player]) saves[player] = [];
        saves[player].push(words);
        await redis.set(keys.saves, saves);
        return res.json({ ok: true });
      }

      if (action === "deletePlayer") {
        const saves = (await redis.get(keys.saves)) || {};
        delete saves[player];
        await redis.set(keys.saves, saves);
        return res.json({ ok: true });
      }

      if (action === "deleteWords") {
        const saves = (await redis.get(keys.saves)) || {};
        if (saves[player]) {
          saves[player].splice(index, 1);
          if (saves[player].length === 0) delete saves[player];
        }
        await redis.set(keys.saves, saves);
        return res.json({ ok: true });
      }

      // Legacy save (words/players)
      const pipe = redis.pipeline();
      if (words !== undefined) pipe.set(keys.words, words);
      if (players !== undefined) pipe.set(keys.players, players);
      await pipe.exec();
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("api/data error:", err);
    res.status(500).json({ error: err.message });
  }
}

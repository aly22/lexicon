import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEYS = {
  lexicon: { words: "lexicon:words", players: "lexicon:players" },
  vm: { words: "lexicon:vmwords", players: "lexicon:vmplayers" },
};

export default async function handler(req, res) {
  if (req.headers["x-api-key"] !== process.env.LEXICON_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const game = req.method === "GET" ? req.query.game : req.body?.game;
  const keys = KEYS[game];
  if (!keys) {
    return res.status(400).json({ error: "Invalid game. Use 'lexicon' or 'vm'." });
  }

  if (req.method === "GET") {
    const [words, players] = await redis.pipeline()
      .get(keys.words)
      .get(keys.players)
      .exec();
    return res.json({ words: words || [], players: players || [] });
  }

  if (req.method === "POST") {
    const { words, players } = req.body;
    const pipe = redis.pipeline();
    if (words !== undefined) pipe.set(keys.words, words);
    if (players !== undefined) pipe.set(keys.players, players);
    await pipe.exec();
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = "lexicon:vmplayers";

export default async function handler(req, res) {
  if (req.headers["x-api-key"] !== process.env.LEXICON_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const data = await redis.get(KEY);
    return res.json(data || []);
  }

  if (req.method === "POST") {
    const players = req.body;
    if (!Array.isArray(players)) {
      return res.status(400).json({ error: "Body must be an array" });
    }
    await redis.set(KEY, players);
    return res.json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}

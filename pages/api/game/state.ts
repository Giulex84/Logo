import type { NextApiRequest, NextApiResponse } from "next";
import { bearerFromRequest, verifyPiAccessToken } from "../../../lib/pi";
import { getGameState, isStoreConfigured, saveGameState } from "../../../lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = bearerFromRequest(req);
  if (!token) return res.status(401).json({ error: "Missing Pi access token" });

  try {
    const user = await verifyPiAccessToken(token);
    if (!isStoreConfigured()) {
      return res.status(503).json({ error: "Persistent gameplay store is not configured" });
    }

    if (req.method === "GET") {
      const state = await getGameState(user.uid);
      return res.status(200).json({ state });
    }

    const level = Number(req.body?.level);
    const lives = Number(req.body?.lives);
    const score = Number(req.body?.score);
    if (![level, lives, score].every(Number.isFinite)) {
      return res.status(400).json({ error: "Invalid gameplay state" });
    }

    const state = await saveGameState(user.uid, { level, lives, score });
    return res.status(200).json({ state });
  } catch (error: any) {
    const message = error?.message || "Gameplay state request failed";
    return res.status(message === "Unauthorized" ? 401 : 500).json({ error: message });
  }
}

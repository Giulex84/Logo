import type { NextApiRequest, NextApiResponse } from "next";
import { bearerFromRequest, verifyPiAccessToken } from "../../../lib/pi";
import { hasPremium, isStoreConfigured } from "../../../lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const accessToken = bearerFromRequest(req);
  if (!accessToken) return res.status(401).json({ error: "Missing Pi access token" });

  try {
    const user = await verifyPiAccessToken(accessToken);
    const premium = isStoreConfigured() ? await hasPremium(user.uid) : false;
    return res.status(200).json({
      uid: user.uid,
      username: user.username || null,
      premium,
      entitlementStoreReady: isStoreConfigured(),
    });
  } catch {
    return res.status(401).json({ error: "Pi authentication could not be verified" });
  }
}

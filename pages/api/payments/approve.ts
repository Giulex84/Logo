import type { NextApiRequest, NextApiResponse } from "next";
import { bearerFromRequest, getPayment, piPost, validatePremiumPayment, verifyPiAccessToken } from "../../../lib/pi";
import { isStoreConfigured, markPaymentPending } from "../../../lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isStoreConfigured()) return res.status(503).json({ error: "Premium purchases are temporarily unavailable" });

  const token = bearerFromRequest(req);
  const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId : "";
  if (!token) return res.status(401).json({ error: "Missing Pi access token" });
  if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

  try {
    const user = await verifyPiAccessToken(token);
    const payment = await getPayment(paymentId);
    const invalid = validatePremiumPayment(payment, user.uid);
    if (invalid) return res.status(400).json({ error: invalid });

    await markPaymentPending(user.uid, paymentId);

    if (payment.status?.developer_approved) {
      return res.status(200).json({ success: true, alreadyApproved: true, payment });
    }

    const { response, data } = await piPost(`/payments/${encodeURIComponent(paymentId)}/approve`);
    return res.status(response.status).json(response.ok ? { success: true, payment: data } : data);
  } catch (error: any) {
    return res.status(error?.message === "Unauthorized" ? 401 : 500).json({ error: error?.message || "Approval failed" });
  }
}

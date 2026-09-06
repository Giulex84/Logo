import type { NextApiRequest, NextApiResponse } from "next";
import { bearerFromRequest, getPayment, piPost, validatePremiumPayment, verifyPiAccessToken } from "../../../lib/pi";
import { grantPremium, isStoreConfigured, markPaymentPending } from "../../../lib/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isStoreConfigured()) return res.status(503).json({ error: "Premium purchases are temporarily unavailable" });

  const token = bearerFromRequest(req);
  const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId : "";
  const txid = typeof req.body?.txid === "string" ? req.body.txid : "";
  if (!token) return res.status(401).json({ error: "Missing Pi access token" });
  if (!paymentId || !txid) return res.status(400).json({ error: "Missing paymentId or txid" });

  try {
    const user = await verifyPiAccessToken(token);
    let payment = await getPayment(paymentId);
    const invalid = validatePremiumPayment(payment, user.uid);
    if (invalid) return res.status(400).json({ error: invalid });

    if (payment.transaction?.txid && payment.transaction.txid !== txid) {
      return res.status(400).json({ error: "Transaction does not match payment" });
    }

    await markPaymentPending(user.uid, paymentId);

    if (!payment.status?.developer_completed) {
      const { response, data } = await piPost(`/payments/${encodeURIComponent(paymentId)}/complete`, { txid });
      if (!response.ok) return res.status(response.status).json(data);
      payment = data;
    }

    const verified = await getPayment(paymentId);
    const invalidAfter = validatePremiumPayment(verified, user.uid);
    if (invalidAfter) return res.status(400).json({ error: invalidAfter });
    if (!verified.status?.developer_completed || !verified.status?.transaction_verified) {
      return res.status(409).json({ error: "Payment is not fully verified yet" });
    }

    await grantPremium(user.uid, paymentId);
    return res.status(200).json({ success: true, premium: true });
  } catch (error: any) {
    return res.status(error?.message === "Unauthorized" ? 401 : 500).json({ error: error?.message || "Completion failed" });
  }
}

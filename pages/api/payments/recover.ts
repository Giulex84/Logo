import type { NextApiRequest, NextApiResponse } from "next";
import { getPayment, piPost, validatePremiumPayment } from "../../../lib/pi";
import { grantPremium, isStoreConfigured, markPaymentPending } from "../../../lib/store";

/**
 * Called by onIncompletePaymentFound during Pi.authenticate(). At that moment the new
 * access token is not available yet, so authorization is performed against the payment
 * object fetched server-to-server from Pi, as recommended in Pi's Build an App guide.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isStoreConfigured()) return res.status(503).json({ error: "Entitlement store unavailable" });

  const paymentId = typeof req.body?.paymentId === "string" ? req.body.paymentId : "";
  const txid = typeof req.body?.txid === "string" ? req.body.txid : "";
  if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });

  try {
    let payment = await getPayment(paymentId);
    const invalid = validatePremiumPayment(payment);
    if (invalid) return res.status(400).json({ error: invalid });
    await markPaymentPending(payment.user_uid, paymentId);

    if (payment.status?.developer_completed) {
      if (!payment.status?.transaction_verified) return res.status(409).json({ error: "Payment transaction is not verified" });
      await grantPremium(payment.user_uid, paymentId);
      return res.status(200).json({ success: true, recovered: true });
    }

    const authoritativeTxid = payment.transaction?.txid || txid;
    if (!authoritativeTxid) return res.status(409).json({ error: "Incomplete payment has no blockchain transaction yet" });
    if (payment.transaction?.txid && txid && payment.transaction.txid !== txid) {
      return res.status(400).json({ error: "Transaction does not match payment" });
    }

    const { response, data } = await piPost(`/payments/${encodeURIComponent(paymentId)}/complete`, { txid: authoritativeTxid });
    if (!response.ok) return res.status(response.status).json(data);

    payment = await getPayment(paymentId);
    if (!payment.status?.developer_completed || !payment.status?.transaction_verified) {
      return res.status(409).json({ error: "Payment not fully verified after recovery" });
    }
    await grantPremium(payment.user_uid, paymentId);
    return res.status(200).json({ success: true, recovered: true });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Recovery failed" });
  }
}

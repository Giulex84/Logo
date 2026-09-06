import type { NextApiRequest } from "next";

export const PI_API_BASE = "https://api.minepi.com/v2";
export const PREMIUM_PRODUCT = "arena_premium_v1";
export const PREMIUM_AMOUNT = 1;
export const PREMIUM_MEMO = "Arena Premium Unlock";

export type PiUser = {
  uid: string;
  username?: string;
  credentials?: {
    scopes?: string[];
    valid_until?: { timestamp?: number; iso8601?: string };
  };
};

export type PiPayment = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, unknown>;
  direction?: string;
  network?: string;
  status?: {
    developer_approved?: boolean;
    transaction_verified?: boolean;
    developer_completed?: boolean;
    cancelled?: boolean;
    user_cancelled?: boolean;
  };
  transaction?: null | {
    txid: string;
    verified?: boolean;
  };
};

export function getServerApiKey(): string {
  const key = process.env.PI_API_KEY;
  if (!key) throw new Error("PI_API_KEY not configured");
  return key;
}

export function bearerFromRequest(req: NextApiRequest): string | null {
  const value = req.headers.authorization;
  if (!value || !value.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}

export async function verifyPiAccessToken(accessToken: string): Promise<PiUser> {
  const response = await fetch(`${PI_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unauthorized");
  const user = (await response.json()) as PiUser;
  if (!user?.uid) throw new Error("Invalid Pi user response");
  return user;
}

export async function getPayment(paymentId: string): Promise<PiPayment> {
  const response = await fetch(`${PI_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Key ${getServerApiKey()}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Could not fetch payment";
    throw new Error(message);
  }
  return data as PiPayment;
}

export function validatePremiumPayment(payment: PiPayment, expectedUid?: string): string | null {
  if (!payment?.identifier || !payment.user_uid) return "Malformed payment";
  if (expectedUid && payment.user_uid !== expectedUid) return "Payment does not belong to authenticated user";
  if (Number(payment.amount) !== PREMIUM_AMOUNT) return "Unexpected payment amount";
  if (payment.metadata?.product !== PREMIUM_PRODUCT) return "Unexpected payment product";
  if (payment.status?.cancelled || payment.status?.user_cancelled) return "Payment is cancelled";
  return null;
}

export async function piPost(path: string, body?: unknown) {
  const response = await fetch(`${PI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getServerApiKey()}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

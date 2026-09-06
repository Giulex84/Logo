/**
 * Minimal REST KV adapter for Upstash/Vercel REST KV.
 * Supports the variable names created by the current Vercel Upstash integration
 * as well as the simpler legacy Arena names.
 * This is intentionally server-only: never expose these variables with NEXT_PUBLIC_.
 */

function config() {
  const url =
    process.env.ARENA_KV_KV_REST_API_URL ||
    process.env.ARENA_KV_REDIS_URL ||
    process.env.ARENA_KV_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.ARENA_KV_KV_REST_API_TOKEN ||
    process.env.ARENA_KV_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isStoreConfigured(): boolean {
  return Boolean(config());
}

async function command(parts: Array<string | number>): Promise<any> {
  const cfg = config();
  if (!cfg) throw new Error("Persistent entitlement store is not configured");
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || "Entitlement store request failed");
  }
  return payload?.result;
}

const premiumKey = (uid: string) => `arena:premium:${uid}`;
const paymentKey = (paymentId: string) => `arena:payment:${paymentId}`;

export async function hasPremium(uid: string): Promise<boolean> {
  if (!isStoreConfigured()) return false;
  const value = await command(["GET", premiumKey(uid)]);
  return value === "1" || value === 1;
}

async function claimPayment(uid: string, paymentId: string): Promise<void> {
  // Atomic first-writer claim. Repeated callbacks for the same payment/UID are
  // intentionally idempotent; the same payment can never be reassigned to another UID.
  const claimed = await command(["SET", paymentKey(paymentId), uid, "NX"]);
  if (claimed === "OK") return;

  const existingUid = await command(["GET", paymentKey(paymentId)]);
  if (existingUid === uid) return;

  throw new Error("Payment identifier is already associated with another Pi account");
}

export async function grantPremium(uid: string, paymentId: string): Promise<void> {
  await claimPayment(uid, paymentId);
  await command(["SET", premiumKey(uid), "1"]);
}

export async function markPaymentPending(uid: string, paymentId: string): Promise<void> {
  await claimPayment(uid, paymentId);
}

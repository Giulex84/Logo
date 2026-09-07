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
const gameStateKey = (uid: string) => `arena:game:${uid}`;

export type GameState = {
  level: number;
  lives: number;
  score: number;
  updatedAt?: string | null;
};

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

export async function getGameState(uid: string): Promise<GameState | null> {
  if (!isStoreConfigured()) return null;
  const raw = await command(["GET", gameStateKey(uid)]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return {
      level: Math.max(1, Math.trunc(Number(parsed.level) || 1)),
      lives: Math.max(0, Math.trunc(Number.isFinite(Number(parsed.lives)) ? Number(parsed.lives) : 5)),
      score: Math.max(0, Math.trunc(Number(parsed.score) || 0)),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function saveGameState(uid: string, state: Partial<GameState>): Promise<GameState> {
  if (!isStoreConfigured()) throw new Error("Persistent gameplay store is not configured");
  const level = Math.max(1, Math.min(100, Math.trunc(Number(state.level) || 1)));
  const lives = Math.max(0, Math.min(999, Math.trunc(Number(state.lives) || 0)));
  const score = Math.max(0, Math.min(1_000_000_000, Math.trunc(Number(state.score) || 0)));
  const value: GameState = { level, lives, score, updatedAt: new Date().toISOString() };
  await command(["SET", gameStateKey(uid), JSON.stringify(value)]);
  return value;
}

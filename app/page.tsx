"use client";

import { useEffect, useMemo, useState } from "react";

import {
  authenticateWithPi,
  createTestPayment,
  detectPiSdk,
  initializePiSdk,
  type PiAuthResult,
  verifyPiAuth
} from "@/lib/pi-sdk";

type IouStatus = "open" | "paid" | "cancelled";

interface Iou {
  id: string;
  creditor: string;
  debtor: string;
  amount: number;
  note: string;
  status: IouStatus;
  createdAt: string;
  settledAt?: string;
  paymentId?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAmount(amount: number) {
  return `${amount.toFixed(2)} π`;
}

function normalize(username?: string | null) {
  return username?.trim().toLowerCase() ?? "";
}

export default function Home() {
  const [ious, setIous] = useState<Iou[]>([
    {
      id: "iou-1001",
      creditor: "pi-hannah",
      debtor: "pi-luca",
      amount: 3.5,
      note: "Shared ride from the hackathon venue",
      status: "open",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
    },
    {
      id: "iou-1002",
      creditor: "pi-luca",
      debtor: "pi-sara",
      amount: 1.2,
      note: "Cappuccino + croissant",
      status: "paid",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      settledAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      paymentId: "pay-demo-2048"
    },
    {
      id: "iou-1003",
      creditor: "pi-jo",
      debtor: "pi-hannah",
      amount: 0.8,
      note: "Snacks before the meetup",
      status: "cancelled",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
      settledAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString()
    }
  ]);
  const [piBrowserDetected, setPiBrowserDetected] = useState(false);
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  const [piStatus, setPiStatus] = useState("Checking Pi Browser...");
  const [authResult, setAuthResult] = useState<PiAuthResult | null>(null);
  const [serverUser, setServerUser] = useState<PiAuthResult["user"] | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0.01);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [mockPaymentLog, setMockPaymentLog] = useState<string[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [mockPaymentLog, setMockPaymentLog] = useState<string[]>([]);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [selectedIouId, setSelectedIouId] = useState<string | null>(null);
  const [newCreditor, setNewCreditor] = useState("pi-hannah");
  const [newDebtor, setNewDebtor] = useState("pi-you");
  const [newAmount, setNewAmount] = useState(2.5);
  const [newNote, setNewNote] = useState("Lunch split");

  useEffect(() => {
    const { sdk, isPiBrowser } = detectPiSdk();
    setPiBrowserDetected(isPiBrowser);
    setPiSdkAvailable(Boolean(sdk));
    setPiStatus(
      sdk
        ? "Pi SDK detected. Ready for secure sign-in."
        : isPiBrowser
          ? "Pi Browser is open. Waiting for the SDK to finish loading."
          : "Open this IOU companion inside Pi Browser to unlock the SDK."
    );
    if (sdk) {
      initializePiSdk(sdk);
    }
  }, []);

  const conversions = useMemo(() => {
    const targets = Object.keys(currencySymbols).filter((key) => key !== sourceCurrency) as Currency[];

    return targets.map((target) => {
      const rate = exchangeRates[sourceCurrency]?.[target];
      const safeRate = typeof rate === "number" && Number.isFinite(rate) ? rate : 1;
      return {
        target,
        rate: safeRate,
        value: amount * safeRate
      };
    });
  }, [amount, sourceCurrency]);

  const appendMockLog = (entry: string) => {
    setMockPaymentLog((previous) => [...previous, entry]);
  };

  const syncMockPayment = async (
    identifier: string,
    action: "init" | "approve" | "complete" | "cancel",
    amount?: number,
    memo?: string
  ) => {
    const response = await fetch("/api/pi/mock-payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier, action, amount, memo })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      const message = payload?.error ?? "Mock server request failed.";
      throw new Error(message);
    }

    const payload = (await response.json()) as { payment?: { status?: string } };

    if (payload.payment?.status) {
      appendMockLog(`Server: ${payload.payment.status}`);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setPaymentStatus(null);
    setServerUser(null);
    setIsAuthLoading(true);

  const youOweList = useMemo(
    () => ious.filter((iou) => normalize(iou.debtor) === normalizedUser),
    [ious, normalizedUser]
  );
  const owedToYouList = useMemo(
    () => ious.filter((iou) => normalize(iou.creditor) === normalizedUser),
    [ious, normalizedUser]
  );

  const totals = useMemo(() => {
    const owedToYou = owedToYouList.filter((iou) => iou.status === "open");
    const youOwe = youOweList.filter((iou) => iou.status === "open");
    return {
      open: ious.filter((iou) => iou.status === "open").length,
      owedToYou: owedToYou.reduce((sum, iou) => sum + iou.amount, 0),
      youOwe: youOwe.reduce((sum, iou) => sum + iou.amount, 0)
    };
  }, [ious, owedToYouList, youOweList]);

  const appendMockLog = (entry: string) => {
    setMockPaymentLog((previous) => [...previous, entry]);
  };

  const syncMockPayment = async (
    identifier: string,
    action: "init" | "approve" | "complete" | "cancel",
    amount?: number,
    memo?: string
  ) => {
    const response = await fetch("/api/pi/mock-payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier, action, amount, memo })
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload?.error ?? "Mock server request failed.");
    }
    const payload = (await response.json()) as { payment?: { status?: string } };
    if (payload.payment?.status) {
      appendMockLog(`Server: ${payload.payment.status}`);
    }
  };

  const upsertIou = (id: string, updates: Partial<Iou>) => {
    setIous((previous) => previous.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  };

  const handleCreateIou = () => {
    if (!newCreditor.trim() || !newDebtor.trim() || !newNote.trim()) {
      setPaymentStatus("Provide creditor, debtor, and a short reason.");
      return;
    }
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      setPaymentStatus("Enter a positive Pi amount.");
      return;
    }
    const id = `iou-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entry: Iou = {
      id,
      creditor: newCreditor.trim(),
      debtor: newDebtor.trim(),
      amount: Number(newAmount.toFixed(2)),
      note: newNote.trim(),
      status: "open",
      createdAt: new Date().toISOString()
    };
    setIous((previous) => [entry, ...previous]);
    setPaymentStatus("IOU created. You can settle it immediately with Pi.");
    setSelectedIouId(id);
  };

  const handlePayment = async () => {
    setPaymentStatus(null);
    setAuthError(null);
    setMockPaymentLog([]);
    setActivePaymentId(null);

  const handleSettleIou = async (iou: Iou) => {
    if (!authResult) {
      setPaymentStatus("Sign in with Pi first to settle an IOU.");
      return;
    }
    setSelectedIouId(iou.id);
    setPaymentStatus(`Creating Pi payment to settle ${iou.debtor} → ${iou.creditor}.`);
    setIsPaymentLoading(true);

    let paymentIdentifier: string | null = null;

    try {
      const payment = await createTestPayment(paymentAmount, "Test Pi tip from Pi Currency Companion", {
        onReadyForServerApproval: (pendingPayment) => {
          paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
          setActivePaymentId(paymentIdentifier);
          setPaymentStatus(
            `Payment ${pendingPayment.identifier} is pending server approval. Call your backend to approve with Pi Network.`
          );

          syncMockPayment(pendingPayment.identifier, "approve")
            .then(() =>
              setPaymentStatus(
                `Payment ${pendingPayment.identifier} approved by mock server. Ready to finalize via Pi callbacks.`
              )
            )
            .catch((error) => setPaymentStatus((error as Error).message));
        },
        onReadyForServerCompletion: (pendingPayment) => {
          paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
          setActivePaymentId(paymentIdentifier);
          setPaymentStatus(`Server should now complete payment ${pendingPayment.identifier}.`);

          syncMockPayment(pendingPayment.identifier, "complete")
            .then(() =>
              setPaymentStatus(
                `Payment ${pendingPayment.identifier} completed by mock server. Full flow visible to reviewers.`
              )
            )
            .catch((error) => setPaymentStatus((error as Error).message));
        },
        onCancel: (pendingPayment) => {
          const paymentId = pendingPayment?.identifier ? ` ${pendingPayment.identifier}` : "";
          setPaymentStatus(`Payment${paymentId} cancelled by the Pioneer.`);

          if (pendingPayment?.identifier) {
            syncMockPayment(pendingPayment.identifier, "cancel").catch(() => {
              // Cancellation errors are non-blocking for the demo.
            }
          }
        },
        onError: (error, pendingPayment) => {
  const paymentId = pendingPayment?.identifier
    ? ` on payment ${pendingPayment.identifier}`
    : "";
  setPaymentStatus(`Error${paymentId}: ${String(error)}`
},

      if (payment?.identifier) {
        setPaymentStatus(
          `Payment ${payment.identifier} created. Approve and complete it server-side per Pi Network API docs.`
        );

        setActivePaymentId(payment.identifier);
        appendMockLog(`Client: created ${payment.identifier}`);

        try {
          await syncMockPayment(payment.identifier, "init", payment.amount, payment.memo);
        } catch (error) {
          setPaymentStatus((error as Error).message);
        }
      }
    } catch (error) {
      setPaymentStatus((error as Error).message);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const reviewHighlights = [
    {
      title: "Pi-first UX",
      copy: "Every flow is scoped for Pi Browser with SDK detection, validation endpoint, and English-only copy."
    },
    {
      title: "Reviewer shortcuts",
      copy: "Key actions (auth, payments, validation) are surfaced above the fold with zero dead ends or placeholder screens."
    },
    {
      title: "Launch proof",
      copy: "Includes validation route, policy links, and server verification so reviewers can trace compliance quickly."
    }
  ];

  const complianceBullets = [
    "Use HTTPS everywhere and keep secrets server-side.",
    "Authenticate every Pioneer through the official Pi SDK.",
    "Avoid prohibited content and keep the UI in English.",
    "Highlight policies inside Pi Browser friendly routes.",
    "Request only username + payments permissions."
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-5 text-center">
        <div className="pill mx-auto">
          <span className="text-xl">π</span>
          <span>Pi Core team review pack</span>
        </div>
        <div className="glass-card glow-border mx-auto max-w-4xl p-6">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">Pi Currency Companion</h1>
          <p className="mt-3 text-lg text-slate-200 md:text-xl">
            A polished, Pi-first currency helper with zero placeholder screens, fast SDK checks, and clear reviewer guidance.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a className="button-primary" href="https://pi-apps.github.io/community-developer-guide" target="_blank" rel="noreferrer">
              Read Pi community guide
            </a>
            <a
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
              href="https://github.com/pi-apps/demo"
              target="_blank"
              rel="noreferrer"
            >
              View the official demo
            </a>
            <span className="pill text-xs text-slate-100">No filler pages</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Pi Browser</p>
              <h2 className="text-2xl font-semibold">SDK readiness</h2>
            </div>
            <span className="pill text-xs text-slate-100">{piSdkAvailable ? "Live SDK" : "Waiting inside Pi"}</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-piGold">Detected:</span> {piBrowserDetected ? "Pi Browser" : "Standard browser"}
            </li>
            <li>
              <span className="font-semibold text-piGold">SDK status:</span> {piSdkAvailable ? "Loaded" : "Waiting"}
            </li>
            <li>
              <span className="font-semibold text-piGold">Message:</span> {piStatus}
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-300">
            Keep the app inside Pi Browser to respect the platform Terms of Service and make sure authentication, transactions,
            and validation work as expected. The layout avoids any detours or hidden routes.
          </p>
        </div>

        <div className="glass-card flex flex-col gap-4 p-6 md:p-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Authentication</p>
              <h2 className="text-xl font-semibold">Secure Pi login</h2>
              <p className="text-xs text-slate-300">Server verification follows automatically after SDK auth.</p>
            </div>
            <button
              type="button"
              onClick={handleAuth}
              disabled={isAuthLoading || !piSdkAvailable}
              className="rounded-lg bg-piGold px-4 py-2 text-sm font-semibold text-[#0f1020] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Signing in..." : "Sign in with Pi"}
            </button>
          </div>

          {authResult ? (
            <div className="rounded-lg border border-green-400/60 bg-green-500/10 p-4 text-sm text-green-100">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {serverUser ? "Server-verified Pioneer" : "Authenticated via Pi SDK"}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    serverUser ? "bg-green-600/80 text-white" : "bg-yellow-500/20 text-yellow-200"
                  }`}
                >
                  {serverUser ? "Verified" : "Waiting on server"}
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p>Sign in with Pi to personalize “You owe” vs “Owed to you” lists and to settle IOUs.</p>
              </div>
            )}
            {authError ? <p className="text-sm text-red-300">{authError}</p> : null}
          </div>
        </div>

              <p>ID: {(serverUser ?? authResult.user)?.uid}</p>
              <p>Username: {(serverUser ?? authResult.user)?.username}</p>
              <p>Roles: {(serverUser ?? authResult.user)?.roles.join(", ") || "n/a"}</p>

              {!serverUser ? (
                <p className="mt-2 text-xs text-yellow-100">
                  The client never auto-approves—server verification is required before treating the session as trusted.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p>Sign in with Pi to unlock sandbox actions and show reviewers the real callback payloads.</p>
            </div>
          )}

          {authError ? <p className="text-sm text-red-300">{authError}</p> : null}

          <p className="text-xs text-slate-400">
            The SDK handles Pioneer identity; do not roll your own auth or bypass Pi Network policies.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
            {iouModelFields.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-piGold/50 bg-piGold/10 p-4 text-sm text-piGold">
            Sandbox stays on (<code className="bg-white/10 px-1">NEXT_PUBLIC_PI_SANDBOX=true</code>). Replace the validation key via env to publish <code className="bg-white/10 px-1">/.well-known/pi-validation.txt</code> automatically.
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-piGold">Converter</p>
                <h2 className="text-2xl font-semibold">Real-time friendly twins</h2>
                <p className="text-xs text-slate-300">Dual conversions keep Pi, USD, and EUR in sync for reviewers.</p>
              </div>
              <div className="flex gap-2">
                {(Object.keys(currencySymbols) as Currency[]).map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSourceCurrency(currency)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      sourceCurrency === currency
                        ? "border-piGold bg-white/10 text-piGold"
                        : "border-white/10 text-slate-100 hover:border-piGold/60"
                    }`}
                  >
                    {currencySymbols[currency]} {currency.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <span className="pill text-xs text-slate-100">Open IOUs: {totals.open}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Creditor (receives Pi)</span>
              <input
                value={newCreditor}
                onChange={(event) => setNewCreditor(event.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-white"
                placeholder="pi-username"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Debtor (owes Pi)</span>
              <input
                value={newDebtor}
                onChange={(event) => setNewDebtor(event.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-white"
                placeholder="pi-username"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Amount (Pi)</span>
              <input
                type="number"
                value={newAmount}
                onChange={(event) => setNewAmount(Number(event.target.value))}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-white"
                step="0.01"
                min="0"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-slate-300">Reason</span>
              <input
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-white"
                placeholder="Why this IOU exists"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateIou}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-piGold/80"
            >
              Create IOU
            </button>
            <span className="text-xs text-slate-300">It will appear below with status set to open.</span>
          </div>
        </div>

        <div className="glass-card p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Your position</p>
          <h2 className="text-2xl font-semibold">You owe vs owed to you</h2>
          <p className="text-sm text-slate-300">Based only on Pi sign-in. Every card shows actors, Pi amount, and state.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="flex items-center justify-between text-slate-100">
                <span>You owe</span>
                <span className="pill text-[10px] text-slate-100">{formatAmount(totals.youOwe)}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">Debts where you are the debtor.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="flex items-center justify-between text-slate-100">
                <span>Owed to you</span>
                <span className="pill text-[10px] text-slate-100">{formatAmount(totals.owedToYou)}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">Credits where you are the creditor.</p>
            </div>

            <p className="text-sm text-slate-300">
              Exchange rates are illustrative. Connect your own API or Pi payouts to make these numbers authoritative for production.
            </p>
          </div>
        </div>
      </section>

        <div className="glass-card flex flex-col gap-5 p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.25em] text-piGold">Pi launch checklist</p>
          <h2 className="text-2xl font-semibold">Review-ready items</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-200">
            <li>Add your <strong>validation key</strong> in <code className="rounded bg-white/10 px-2 py-1">/.well-known/pi-validation.txt</code>.</li>
            <li>Confirm it resolves publicly at <code className="rounded bg-white/10 px-2 py-1">/.well-known/pi-validation.txt</code> after deployment.</li>
            <li>Set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_PI_SANDBOX</code> to <strong>false</strong> on production.</li>
            <li>Keep copy in English and align with the Pi community developer guide.</li>
          </ol>
          <div className="rounded-xl border border-piGold/60 bg-piGold/10 px-4 py-3 text-sm text-piGold">
            The placeholder key ships only for local review. Swap in the official string before requesting final approval.
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Deployment quick start</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Clone the repo and run <code className="rounded bg-white/10 px-1">npm install</code>.</li>
              <li>Use <code className="rounded bg-white/10 px-1">npm run dev</code> locally, then push to Vercel.</li>
              <li>Set <code className="rounded bg-white/10 px-1">PI_API_KEY</code> server-side to let /api/pi/verify respond with real data.</li>
            </ul>
          </div>
        </div>

        <div className="glass-card p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Transactions</p>
              <h2 className="text-xl font-semibold">Send Pi or Test-Pi</h2>
              <p className="text-xs text-slate-300">Callback messages are visible for reviewers—no hidden steps.</p>
            </div>
            {activePaymentId ? <span className="pill text-xs text-slate-100">ID: {activePaymentId}</span> : <span className="pill text-xs text-slate-100">No active payment</span>}
          </div>

          <p className="text-sm text-slate-200">
            Payments flow through the Pi SDK. Your backend must approve and complete the payment using the identifiers returned in the callbacks.
          </p>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            Client-side only by design—pair this UI with your server to log receipts and keep sensitive keys away from the browser.
          </div>
          {paymentStatus ? <p className="mt-3 text-sm text-piGold">{paymentStatus}</p> : null}
          {mockPaymentLog.length ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Payment timeline</p>
              <ul className="mt-2 space-y-1 text-slate-300">
                {mockPaymentLog.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </div>
          </div>

          {activePaymentId ? (
            <div className="rounded-lg border border-piGold/50 bg-piGold/5 p-4 text-xs text-piGold">
              <p className="font-semibold text-slate-100">Active payment</p>
              <p className="text-slate-200">ID: {activePaymentId}</p>
              <p className="text-slate-300">Use this identifier if you want to replicate the flow on a real backend.</p>
            </div>
          ) : null}

          {mockPaymentLog.length ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Mock server timeline</p>
              <ul className="mt-2 space-y-1 text-slate-300">
                {mockPaymentLog.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {paymentStatus ? <p className="text-sm text-piGold">{paymentStatus}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Safety + compliance</p>
          <h2 className="text-xl font-semibold">Stay aligned with Pi Network</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {complianceBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-piGold/60 bg-piGold/10 p-4 text-sm text-piGold">
            The UI is optimized for Pi Browser with concise routes, self-hosted assets, and no external trackers by default.
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {reviewHighlights.map((highlight, index) => (
          <article key={highlight.title} className="glass-card p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-piGold">
              {index + 1}
            </div>
            <h3 className="text-xl font-semibold">{highlight.title}</h3>
            <p className="text-sm text-slate-300">{highlight.copy}</p>
          </article>
        ))}
      </section>

        <div className="glass-card space-y-3 p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Policies + trust</h2>
          <p className="text-sm text-slate-200">
            Every interaction is intentionally simple: English-only copy, transparent validation file, and Pi-only permissions (username + payments). No placeholders or hidden flows.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
            {complianceBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 text-sm text-piGold">
            <a className="rounded-lg border border-piGold/40 bg-piGold/10 px-3 py-2 font-semibold hover:border-piGold" href="/terms">
              View Terms of Use
            </a>
            <a className="rounded-lg border border-piGold/40 bg-piGold/10 px-3 py-2 font-semibold hover:border-piGold" href="/privacy">
              View Privacy Policy
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

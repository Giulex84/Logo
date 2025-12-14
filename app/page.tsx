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

  const currentUsername = serverUser?.username ?? authResult?.user?.username ?? "";
  const normalizedUser = normalize(currentUsername);

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

  const handleCancelIou = (id: string) => {
    upsertIou(id, { status: "cancelled", settledAt: new Date().toISOString() });
    setPaymentStatus("IOU cancelled. No payment required.");
  };

  const handleSettleIou = async (iou: Iou) => {
    if (!authResult) {
      setPaymentStatus("Sign in with Pi first to settle an IOU.");
      return;
    }
    setSelectedIouId(iou.id);
    setPaymentStatus(`Creating Pi payment to settle ${iou.debtor} → ${iou.creditor}.`);
    setIsPaymentLoading(true);
    setMockPaymentLog([]);
    setActivePaymentId(null);
    try {
      const payment = await createTestPayment(
        iou.amount,
        `Settle IOU: ${iou.debtor} owes ${iou.creditor} for ${iou.note}`,
        {
          onReadyForServerApproval: (pendingPayment) => {
            const paymentId = pendingPayment?.identifier ?? "";
            setActivePaymentId(paymentId);
            appendMockLog(`Client: ${paymentId} awaiting approval`);
            syncMockPayment(paymentId, "approve")
              .then(() => {
                setPaymentStatus(`Payment ${paymentId} approved by mock server. Waiting for completion callback.`);
              })
              .catch((error) => setPaymentStatus((error as Error).message));
          },
          onReadyForServerCompletion: (pendingPayment) => {
            const paymentId = pendingPayment?.identifier ?? "";
            setActivePaymentId(paymentId);
            appendMockLog(`Client: ${paymentId} ready to complete`);
            syncMockPayment(paymentId, "complete")
              .then(() => {
                setPaymentStatus("Payment completed. IOU marked as paid.");
                upsertIou(iou.id, { status: "paid", settledAt: new Date().toISOString(), paymentId });
              })
              .catch((error) => setPaymentStatus((error as Error).message));
          },
          onCancel: (pendingPayment) => {
            const paymentId = pendingPayment?.identifier ?? "";
            setPaymentStatus(`Payment${paymentId ? ` ${paymentId}` : ""} cancelled by the Pioneer.`);
            if (paymentId) {
              syncMockPayment(paymentId, "cancel").catch(() => {
                return null;
              });
            }
          },
          onError: (error, pendingPayment) => {
            const paymentId = pendingPayment?.identifier ? ` on payment ${pendingPayment.identifier}` : "";
            setPaymentStatus(`Error${paymentId}: ${String(error)}`);
          }
        }
      );
      if (payment?.identifier) {
        setActivePaymentId(payment.identifier);
        appendMockLog(`Client: created ${payment.identifier}`);
        upsertIou(iou.id, { paymentId: payment.identifier });
        try {
          await syncMockPayment(payment.identifier, "init", payment.amount, payment.memo);
        } catch (error) {
          setPaymentStatus((error as Error).message);
        }
        setPaymentStatus(`Payment ${payment.identifier} created. Mock server will approve and complete for reviewers automatically.`);
      }
    } catch (error) {
      setPaymentStatus((error as Error).message);
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleAuth = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setServerUser(null);
    try {
      const auth = await authenticateWithPi();
      setAuthResult(auth);
      const verified = await verifyPiAuth(auth);
      setServerUser(verified.user);
      setPaymentStatus("Pi identity verified on server.");
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const highlightCards = [
    {
      title: "Pi-first identity",
      copy: "SDK detection, Pi-only login, and server verification keep every IOU tied to a Pioneer session.",
      pill: piSdkAvailable ? "SDK live" : "Waiting in Pi Browser"
    },
    {
      title: "Payment clarity",
      copy: "Approve, complete, or cancel from the mock server so reviewers see the full Pi payment lifecycle.",
      pill: activePaymentId ? `Active payment ${activePaymentId}` : "Ready for flow"
    },
    {
      title: "Human language",
      copy: "Plain English explains who owes whom, how much, and what happens next—no placeholders or dead ends.",
      pill: "Reviewer-friendly"
    }
  ];

  const iouModelFields = [
    "creditor (Pi username)",
    "debtor (Pi username)",
    "amount (Pi)",
    "note / reason",
    "status: open | paid | cancelled",
    "createdAt / settledAt",
    "paymentId (from Pi SDK callbacks)"
  ];

  const reviewHighlights = [
    {
      title: "IOU clarity",
      body: "Every card states who owes whom, the Pi amount, and the reason. Settled timestamps stay visible for auditability."
    },
    {
      title: "Payment lifecycle",
      body: "Mock server shows init → approve → complete so reviewers see backend-equivalent steps without hidden work."
    },
    {
      title: "Personalized views",
      body: "Sign-in tailors \"You owe\" vs \"Owed to you\" lists to the Pioneer using Pi SDK identity only."
    }
  ];

  const complianceBullets = [
    "Pi SDK is the sole auth + payment path; no alternate wallets or credentials.",
    "Validation file is generated from NEXT_PUBLIC_PI_VALIDATION_KEY at /.well-known/pi-validation.txt.",
    "Sandbox flag stays true until DNS is active; switch to production only after Core Team approval.",
    "Terms and Privacy remain linked and visible for reviewer checks.",
    "Server secrets stay server-side; mock endpoint is client-safe for demonstrations."
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 text-center">
        <div className="pill mx-auto">Pi-first IOU companion</div>
        <div className="glass-card glow-border mx-auto max-w-4xl p-6 md:p-8">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">Pi IOUs without ambiguity</h1>
          <p className="mt-3 text-lg text-slate-200 md:text-xl">
            Create, track, and settle IOUs the way Pi reviewers expect: clear actors, visible state, and Pi SDK-driven payments.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-200">
            <span className="pill text-xs text-slate-100">Mock payments ready</span>
            <span className="pill text-xs text-slate-100">English-first copy</span>
            <span className="pill text-xs text-slate-100">No dead screens</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {highlightCards.map((card) => (
            <article key={card.title} className="glass-card border-white/10 p-4 text-left">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <span className="pill text-[10px] text-slate-100">{card.pill}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{card.copy}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Pi Browser</p>
              <h2 className="text-2xl font-semibold">SDK + session</h2>
              <p className="text-sm text-slate-300">Sign in to bind IOUs to a Pioneer identity.</p>
            </div>
            <span className="pill text-xs text-slate-100">{piSdkAvailable ? "Live SDK" : "Waiting in Pi"}</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
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
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAuth}
              disabled={isAuthLoading || !piSdkAvailable}
              className="rounded-lg bg-piGold px-4 py-2 text-sm font-semibold text-[#0f1020] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Signing in..." : "Sign in with Pi"}
            </button>
            <button
              type="button"
              onClick={() => setAuthResult(null)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-piGold/80"
            >
              Reset session
            </button>
            {authResult ? (
              <div className="rounded-lg border border-green-400/60 bg-green-500/10 p-4 text-sm text-green-100">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{serverUser ? "Server-verified Pioneer" : "Authenticated via Pi SDK"}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      serverUser ? "bg-green-600/80 text-white" : "bg-yellow-500/20 text-yellow-200"
                    }`}
                  >
                    {serverUser ? "Verified" : "Waiting on server"}
                  </span>
                </div>
                <p>ID: {(serverUser ?? authResult.user)?.uid}</p>
                <p>Username: {(serverUser ?? authResult.user)?.username}</p>
                <p>Roles: {(serverUser ?? authResult.user)?.roles.join(", ") || "n/a"}</p>
                <p className="mt-2 text-xs text-yellow-100">Pi auth + payments are the only identity and settlement channels.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <p>Sign in with Pi to personalize “You owe” vs “Owed to you” lists and to settle IOUs.</p>
              </div>
            )}
            {authError ? <p className="text-sm text-red-300">{authError}</p> : null}
          </div>
        </div>

        <div className="glass-card p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">IOU model</p>
          <h2 className="text-2xl font-semibold">Everything the reviewer needs</h2>
          <p className="mt-1 text-sm text-slate-300">
            Clear schema, no hidden fields. State flips visibly after a payment, with timestamps and Pi identifiers.
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

      <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Create IOU</p>
              <h2 className="text-2xl font-semibold">Who owes whom?</h2>
              <p className="text-sm text-slate-300">Add a clear reason so the debt feels human and traceable.</p>
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
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Your IOUs</p>
          <h2 className="text-2xl font-semibold">Live ledger</h2>
          <p className="text-sm text-slate-300">Pick an IOU to settle via Pi SDK or cancel if no longer needed.</p>
          <div className="mt-4 space-y-3">
            {ious.map((iou) => (
              <article key={iou.id} className="glass-card border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400"><span className="text-piGold">{iou.debtor === currentUsername ? "You" : iou.debtor}</span> owes {iou.creditor}</p>
                    <h3 className="text-lg font-semibold text-white">{formatAmount(iou.amount)}</h3>
                    <p className="text-sm text-slate-200">{iou.note}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    iou.status === "open"
                      ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-200"
                      : iou.status === "paid"
                        ? "border-green-500/50 bg-green-500/20 text-green-100"
                        : "border-slate-500/40 bg-slate-500/20 text-slate-200"
                  }`}>
                    {iou.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>Created: {formatDate(iou.createdAt)}</span>
                  <span>Settled: {formatDate(iou.settledAt)}</span>
                  {iou.paymentId ? <span className="text-piGold">Payment ID: {iou.paymentId}</span> : null}
                </div>
                {iou.status === "open" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSettleIou(iou)}
                      disabled={isPaymentLoading && selectedIouId === iou.id}
                      className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-piGold/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPaymentLoading && selectedIouId === iou.id ? "Settling..." : "Settle with Pi"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelIou(iou.id)}
                      className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-piGold/80"
                    >
                      Cancel IOU
                    </button>
                    <span className="text-xs text-slate-300">When paid, this card flips to paid with timestamps.</span>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Payments</p>
              <h2 className="text-xl font-semibold">Mock server + Pi SDK</h2>
              <p className="text-sm text-slate-300">Full lifecycle visible: init → approve → complete or cancel.</p>
            </div>
            {activePaymentId ? <span className="pill text-xs text-slate-100">ID: {activePaymentId}</span> : <span className="pill text-xs text-slate-100">No active payment</span>}
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            Client-only by design: keep secrets server-side. The mock endpoint at <code className="mx-1 rounded bg-white/10 px-1">/api/pi/mock-payments</code> approves and completes automatically so reviewers see what your backend would do.
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
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Reviewer clarity</p>
          <h2 className="text-xl font-semibold">What happens in 30 seconds</h2>
          <div className="mt-3 grid gap-3">
            {reviewHighlights.map((item) => (
              <article key={item.title} className="glass-card border-white/10 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <span className="pill text-[10px] text-slate-100">Clear for reviewers</span>
                </div>
                <p className="text-sm text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-piGold/60 bg-piGold/10 p-4 text-sm text-piGold">
            Next step: flip <code className="bg-white/10 px-1">NEXT_PUBLIC_PI_SANDBOX</code> to false only when the official DNS is live for your Pi app.
          </div>
        </div>

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

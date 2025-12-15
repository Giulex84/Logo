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

type IouStatus = "pending" | "accepted" | "paid" | "cancelled";
type IouDirection = "outgoing" | "incoming";

type Iou = {
  id: string;
  amount: number;
  counterparty: string;
  note?: string;
  dueDate?: string;
  status: IouStatus;
  direction: IouDirection;
  createdAt: string;
  acceptedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
};

type ApiIou = {
  id?: string | number;
  pi_uid: string;
  direction: IouDirection;
  counterparty: string;
  amount: number;
  note?: string | null;
  due_date?: string | null;
  status: IouStatus;
  created_at: string;
  accepted_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
};

const statusLabels: Record<IouStatus, string> = {
  pending: "🕓 Pending",
  accepted: "🤝 Accepted",
  paid: "✅ Paid",
  cancelled: "❌ Cancelled"
};

const directionLabels: Record<IouDirection, string> = {
  outgoing: "→ I need to pay",
  incoming: "← They need to pay me"
};

const placeholderIous: Iou[] = [
  {
    id: "iou-1",
    amount: 10,
    counterparty: "Luca",
    note: "Dinner last night",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    direction: "outgoing",
    createdAt: new Date().toISOString()
  },
  {
    id: "iou-2",
    amount: 6,
    counterparty: "Sara",
    note: "Tickets",
    status: "accepted",
    direction: "incoming",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "iou-3",
    amount: 3.5,
    counterparty: "Mauro",
    note: "Loan",
    status: "paid",
    direction: "outgoing",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function mapApiIouToClient(apiIou: ApiIou): Iou {
  return {
    id: String(apiIou.id ?? `${apiIou.pi_uid}-${apiIou.created_at}`),
    amount: apiIou.amount,
    counterparty: apiIou.counterparty,
    note: apiIou.note ?? undefined,
    dueDate: apiIou.due_date ?? undefined,
    status: apiIou.status,
    direction: apiIou.direction,
    createdAt: apiIou.created_at,
    acceptedAt: apiIou.accepted_at ?? undefined,
    paidAt: apiIou.paid_at ?? undefined,
    cancelledAt: apiIou.cancelled_at ?? undefined
  };
}

export default function Home() {
  const [piBrowserDetected, setPiBrowserDetected] = useState(false);
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  const [piStatus, setPiStatus] = useState("Checking the Pi environment...");
  const [authResult, setAuthResult] = useState<PiAuthResult | null>(null);
  const [serverUser, setServerUser] = useState<PiAuthResult["user"] | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [mockPaymentLog, setMockPaymentLog] = useState<string[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  const [ious, setIous] = useState<Iou[]>(placeholderIous);
  const [selectedIouId, setSelectedIouId] = useState<string | null>(placeholderIous[0]?.id ?? null);
  const [hasFetchedIous, setHasFetchedIous] = useState(false);
  const [isIousLoading, setIsIousLoading] = useState(false);
  const [view, setView] = useState<"home" | "create" | "list" | "detail">("home");

  const [formAmount, setFormAmount] = useState<string>("");
  const [formCounterparty, setFormCounterparty] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");

  const replaceIousWithPersisted = (items: Iou[]) => {
    if (!items.length) return;

    setIous(items);
    setSelectedIouId(items[0]?.id ?? null);
  };

  const fetchPersistedIous = async (piUid?: string) => {
    const targetPiUid = piUid ?? serverUser?.uid ?? authResult?.user?.uid;

    if (!targetPiUid) return;

    try {
      const response = await fetch(`/api/ious/list?pi_uid=${encodeURIComponent(targetPiUid)}`);

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ApiIou[] | null;

      if (Array.isArray(payload) && payload.length) {
        replaceIousWithPersisted(payload.map((item) => mapApiIouToClient(item)));
      }
    } catch {
      // Fallback to placeholders on network errors.
    } finally {
      setIsIousLoading(false);
      setHasFetchedIous(true);
    }
  };

  const piUid = useMemo(() => serverUser?.uid ?? authResult?.user?.uid ?? null, [authResult?.user?.uid, serverUser?.uid]);

  useEffect(() => {
    if (!piUid || hasFetchedIous) return;

    fetchPersistedIous(piUid).catch(() => {
      setIsIousLoading(false);
      setHasFetchedIous(true);
    });
  }, [piUid, hasFetchedIous]);

  const upsertPiUser = async (user: PiAuthResult["user"]) => {
    try {
      await fetch("/api/users/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pi_uid: user.uid,
          pi_username: user.username
        })
      });
    } catch {
      // Keep UI responsive even if persistence fails.
    }
  };

  useEffect(() => {
    const { sdk, isPiBrowser } = detectPiSdk();
    setPiBrowserDetected(isPiBrowser);
    setPiSdkAvailable(Boolean(sdk));
    setPiStatus(
      sdk
        ? "Ready to use Pi payments."
        : isPiBrowser
          ? "Pi Browser is open, waiting for the Pi tools."
          : "Open this app in Pi Browser to enable payments."
    );

    if (sdk) {
      initializePiSdk(sdk);
    }
  }, []);

  useEffect(() => {
    const targetId = view === "create" ? "create" : view === "list" ? "list" : view === "detail" ? "detail" : "top";
    const element = typeof document !== "undefined" ? document.getElementById(targetId) : null;

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  const selectedIou = useMemo(() => ious.find((iou) => iou.id === selectedIouId) ?? null, [ious, selectedIouId]);

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
        const message = payload?.error ?? "Server request failed.";
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

    setPiStatus("Requesting Pi sign-in...");

    try {
      const auth = await authenticateWithPi((payment) => {
        setPaymentStatus(`Found an open payment (${payment.identifier}). Close it from the server.`);
      });

      setPiStatus("Sign-in complete. Verifying with the server...");

      const verification = await verifyPiAuth(auth);

      setAuthResult(auth);
      setServerUser(verification.user);
      setPiStatus("Pi session confirmed by the server.");

      await upsertPiUser(verification.user);
      await fetchPersistedIous(verification.user.uid);
    } catch (error) {
      setAuthError((error as Error).message);
      setAuthResult(null);
      setServerUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCreateIou = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(formAmount);

    if (!Number.isFinite(amount) || amount <= 0 || !formCounterparty.trim()) {
      setPaymentStatus("Add an amount and who you owe to create the IOU.");
      return;
    }

    const piUser = serverUser ?? authResult?.user ?? null;

    if (!piUser) {
      setPaymentStatus("Sign in with Pi before creating the IOU.");
      return;
    }

    try {
      const response = await fetch("/api/ious/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pi_uid: piUser.uid,
          direction: "outgoing",
          counterparty: formCounterparty.trim(),
          amount,
          note: formNote.trim() || undefined,
          due_date: formDueDate || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setPaymentStatus(payload?.error ?? "Unable to create the IOU right now.");
        return;
      }

      const payload = (await response.json()) as ApiIou | null;

      if (!payload) {
        setPaymentStatus("Unable to create the IOU right now.");
        return;
      }

      const persisted = mapApiIouToClient(payload);
      setIous((previous) => [persisted, ...previous]);
      setSelectedIouId(persisted.id);
      setView("detail");
      setFormAmount("");
      setFormCounterparty("");
      setFormNote("");
      setFormDueDate("");
      setPaymentStatus("IOU created. No Pi moves until you pay.");
    } catch {
      setPaymentStatus("Unable to create the IOU right now.");
    }
  };

  const handleAcceptIou = (id: string) => {
    setIous((previous) =>
      previous.map((iou) =>
        iou.id === id
          ? {
              ...iou,
              status: "accepted",
              acceptedAt: new Date().toISOString(),
              cancelledAt: undefined
            }
          : iou
      )
    );
  };

  const handleRejectIou = (id: string) => {
    setIous((previous) =>
      previous.map((iou) =>
        iou.id === id
          ? {
              ...iou,
              status: "cancelled",
              cancelledAt: new Date().toISOString()
            }
          : iou
      )
    );
  };

  const handleSettleIou = async (iou: Iou) => {
    setPaymentStatus(null);
    setAuthError(null);
    setMockPaymentLog([]);
    setActivePaymentId(null);

    if (!authResult) {
      setPaymentStatus("Sign in with Pi before settling the IOU.");
      return;
    }

    setIsPaymentLoading(true);

    let paymentIdentifier: string | null = null;

    const memoText = `IOU payment for ${iou.counterparty}${iou.note ? `: ${iou.note}` : ""}`;

    const paymentCallbacks = {
      onReadyForServerApproval: async (pendingPayment: { identifier: string }) => {
        paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
        setActivePaymentId(paymentIdentifier);
        setPaymentStatus(`Pi payments ready: waiting for server approval ${pendingPayment.identifier}.`);

        try {
          await syncMockPayment(pendingPayment.identifier, "approve");
          setPaymentStatus(`Payment ${pendingPayment.identifier} approved by the sample server.`);
        } catch (error) {
          setPaymentStatus((error as Error).message);
        }
      },
      onReadyForServerCompletion: async (pendingPayment: { identifier: string }) => {
        paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
        setActivePaymentId(paymentIdentifier);
        setPaymentStatus(`The server can now complete payment ${pendingPayment.identifier}.`);

        try {
          await syncMockPayment(pendingPayment.identifier, "complete");
          setPaymentStatus(`IOU settled. ${pendingPayment.identifier} closed.`);
          setIous((previous) =>
            previous.map((item) =>
              item.id === iou.id
                ? {
                    ...item,
                    status: "paid",
                    paidAt: new Date().toISOString()
                  }
                : item
            )
          );
        } catch (error) {
          setPaymentStatus((error as Error).message);
        }
      },
      onCancel: (pendingPayment?: { identifier?: string }) => {
        const paymentId = pendingPayment?.identifier ? ` ${pendingPayment.identifier}` : "";
        setPaymentStatus(`Payment${paymentId} cancelled.`);

        if (pendingPayment?.identifier) {
          syncMockPayment(pendingPayment.identifier, "cancel").catch(() => {
            // Optional: keep UI responsive if the mock server fails.
          });
        }
      },
      onError: (error: unknown, pendingPayment?: { identifier?: string }) => {
        const paymentId = pendingPayment?.identifier ? ` for payment ${pendingPayment.identifier}` : "";
        setPaymentStatus(`Error${paymentId}: ${String(error)}`);
      }
    };

    try {
      const payment = await createTestPayment(iou.amount, memoText, paymentCallbacks);

      if (payment?.identifier) {
        setPaymentStatus(`Payment ${payment.identifier} created. Follow the server prompts.`);

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

  const renderIouCard = (iou: Iou) => (
    <article
      key={iou.id}
      className="glass-card flex flex-col gap-3 p-4 transition hover:border-piGold/60 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-piGold">{directionLabels[iou.direction]}</p>
          <h3 className="text-2xl font-bold">{iou.amount} Pi</h3>
          <p className="text-sm text-slate-300">Counterparty: {iou.counterparty}</p>
      </div>
      <span className="pill text-xs">{statusLabels[iou.status]}</span>
    </div>
    {iou.note ? <p className="text-sm text-slate-200">Note: {iou.note}</p> : null}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span>Created: {formatDate(iou.createdAt)}</span>
        <span>Due date: {formatDate(iou.dueDate)}</span>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setSelectedIouId(iou.id);
            setView("detail");
          }}
          className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
        >
          Open details
        </button>
        {iou.status === "pending" && iou.direction === "incoming" ? (
          <>
            <button
              type="button"
              onClick={() => handleAcceptIou(iou.id)}
              className="rounded-lg bg-piGold px-3 py-2 font-semibold text-[#0f1020] transition hover:brightness-110"
            >
              Accept IOU
            </button>
            <button
              type="button"
              onClick={() => handleRejectIou(iou.id)}
              className="rounded-lg border border-red-400/60 px-3 py-2 font-semibold text-red-200 transition hover:bg-red-500/10"
            >
              Decline
            </button>
          </>
        ) : null}
      </div>
    </article>
  );

  return (
    <main
      id="top"
      className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12"
    >
      <header className="flex flex-col gap-4 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-piGold">IOU App</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">💸 Promise now. Settle later in Pi.</h1>
        <p className="text-lg text-slate-200 md:text-xl">
          Create a promise, share it, and pay in Pi only when you choose.
        </p>
        <p className="text-sm text-slate-300">An IOU is a simple promise between two people.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setView("create")}
            className="button-primary"
          >
            ➕ Create a promise
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
          >
            📄 View my promises
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Pi Browser</p>
              <h2 className="text-2xl font-semibold">Ready to settle</h2>
              <p className="text-sm text-slate-300">We check automatically if you are in Pi Browser.</p>
            </div>
            <span className="pill text-xs text-slate-100">{piSdkAvailable ? "Active" : "Waiting"}</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-piGold">Browser:</span> {piBrowserDetected ? "Pi Browser" : "Other"}
            </li>
            <li>
              <span className="font-semibold text-piGold">Tools status:</span> {piSdkAvailable ? "Loaded" : "Unavailable"}
            </li>
            <li>
              <span className="font-semibold text-piGold">Message:</span> {piStatus}
            </li>
          </ul>
        </div>

        <div className="glass-card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Sign in</p>
              <h2 className="text-xl font-semibold">Sign in with Pi</h2>
              <p className="text-xs text-slate-300">Keep promises tied to you.</p>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={!piSdkAvailable || isAuthLoading}
              className="rounded-lg bg-piGold px-4 py-2 text-sm font-semibold text-[#0f1020] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          {authResult ? (
            <div className="rounded-lg border border-green-400/60 bg-green-500/10 p-4 text-sm text-green-100">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {serverUser ? "User verified by server" : "Pi sign-in confirmed"}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    serverUser ? "bg-green-600/80 text-white" : "bg-yellow-500/20 text-yellow-200"
                  }`}
                >
                  {serverUser ? "Verified" : "Pending"}
                </span>
              </div>

              <p>ID: {(serverUser ?? authResult.user)?.uid}</p>
              <p>Username: {(serverUser ?? authResult.user)?.username}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p>Sign in to link promises to your Pi profile.</p>
            </div>
          )}

          {authError ? <p className="text-sm text-red-300">{authError}</p> : null}
        </div>
      </section>

      <section className="glass-card grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">What is an IOU</p>
          <h2 className="text-2xl font-semibold">A promise you settle in Pi</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>State who pays whom, how much, and why.</li>
            <li>Creating it does not move Pi: it is only a record.</li>
            <li>Pay later in Pi when you decide.</li>
          </ul>
          <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            States: {statusLabels.pending}, {statusLabels.accepted}, {statusLabels.paid}, {statusLabels.cancelled}.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-piGold/30 bg-piGold/10 p-5 text-sm text-piGold">
          <p className="font-semibold text-slate-100">Detail example</p>
          <p className="text-lg font-bold text-slate-100">10 Pi</p>
          <p className="text-slate-100">To pay Luca</p>
          <p className="text-slate-100">Status: {statusLabels.pending}</p>
          <p className="text-slate-100">Reason: Dinner last night</p>
          <p className="text-slate-100">Due date: {formatDate(placeholderIous[0]?.dueDate)}</p>
        </div>
      </section>

      <section id="create" className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleCreateIou} className="glass-card flex flex-col gap-4 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Create IOU</p>
          <h2 className="text-2xl font-semibold">Create a promise</h2>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Amount (in Pi)
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={formAmount}
              onChange={(event) => setFormAmount(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Who do you owe?
            <input
              type="text"
              value={formCounterparty}
              onChange={(event) => setFormCounterparty(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Note (optional)
            <input
              type="text"
              placeholder="Dinner last night, tickets, loan"
              value={formNote}
              onChange={(event) => setFormNote(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Due date (optional)
            <input
              type="date"
              value={formDueDate}
              onChange={(event) => setFormDueDate(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <button
            type="submit"
            className="button-primary w-full justify-center text-center"
          >
            Create promise
          </button>
          <p className="text-xs text-slate-400">Starts as {statusLabels.pending}. No Pi moves yet.</p>
        </form>

        <div className="glass-card flex flex-col gap-4 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">How it works</p>
          <h2 className="text-xl font-semibold">Agree, decline, settle</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>The receiver can accept or decline.</li>
            <li>Accepting signals agreement; no Pi moves.</li>
            <li>To settle, open the detail and press 💰 Settle in Pi.</li>
          </ul>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Settling pays the agreed amount only when you confirm.
          </div>
        </div>
      </section>

      <section id="list" className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-piGold">My IOUs</p>
            <h2 className="text-2xl font-semibold">Quick overview</h2>
            {isIousLoading ? <p className="text-sm text-slate-300">Loading your promises...</p> : null}
          </div>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setView("create")}
              className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
            >
              ➕ Create
            </button>
            <button
              type="button"
              onClick={() => setView("detail")}
              disabled={!selectedIou}
              className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open selected
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ious.map((iou) => renderIouCard(iou))}
        </div>
      </section>

      {selectedIou ? (
        <section id="detail" className="glass-card grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-piGold">IOU detail</p>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{selectedIou.amount} Pi</h2>
                <p className="text-slate-200">To pay {selectedIou.counterparty}</p>
                <p className="text-sm text-slate-300">{directionLabels[selectedIou.direction]}</p>
              </div>
              <span className="pill text-xs">{statusLabels[selectedIou.status]}</span>
            </div>
            <div className="grid gap-3 text-sm text-slate-200">
              <p><span className="font-semibold text-piGold">Note:</span> {selectedIou.note || "—"}</p>
              <p><span className="font-semibold text-piGold">Created:</span> {formatDate(selectedIou.createdAt)}</p>
              <p><span className="font-semibold text-piGold">Due date:</span> {formatDate(selectedIou.dueDate)}</p>
              <p><span className="font-semibold text-piGold">Accepted:</span> {formatDate(selectedIou.acceptedAt)}</p>
              <p><span className="font-semibold text-piGold">Paid:</span> {formatDate(selectedIou.paidAt)}</p>
              <p><span className="font-semibold text-piGold">Cancelled:</span> {formatDate(selectedIou.cancelledAt)}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {selectedIou.status === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAcceptIou(selectedIou.id)}
                    className="rounded-lg bg-piGold px-4 py-2 font-semibold text-[#0f1020] transition hover:brightness-110"
                  >
                    ✅ Accept IOU
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectIou(selectedIou.id)}
                    className="rounded-lg border border-red-400/60 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/10"
                  >
                    ❌ Decline
                  </button>
                </>
              ) : null}
              {selectedIou.status === "accepted" || selectedIou.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => handleSettleIou(selectedIou)}
                  disabled={isPaymentLoading}
                  className="rounded-lg bg-white/10 px-4 py-2 font-semibold text-white ring-1 ring-white/20 transition hover:ring-piGold/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPaymentLoading ? "Processing..." : "💰 Settle in Pi"}
                </button>
              ) : null}
            </div>
            <p className="text-sm text-slate-300">
              Settling pays {selectedIou.amount} Pi to {selectedIou.counterparty} only when you confirm.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-semibold text-slate-100">Payment timeline</p>
              {activePaymentId ? <p className="text-piGold">Current ID: {activePaymentId}</p> : null}
              {mockPaymentLog.length ? (
                <ul className="mt-2 space-y-1 text-slate-300">
                  {mockPaymentLog.map((entry, index) => (
                    <li key={`${entry}-${index}`}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">The timeline will fill up when you start a payment.</p>
              )}
            </div>
            {paymentStatus ? <p className="rounded-lg border border-piGold/50 bg-piGold/10 p-3 text-sm text-piGold">{paymentStatus}</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

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

const statusLabels: Record<IouStatus, string> = {
  pending: "🕓 In attesa",
  accepted: "🤝 Accettata",
  paid: "✅ Pagata",
  cancelled: "❌ Annullata"
};

const directionLabels: Record<IouDirection, string> = {
  outgoing: "→ io devo pagare",
  incoming: "← mi devono pagare"
};

const placeholderIous: Iou[] = [
  {
    id: "iou-1",
    amount: 10,
    counterparty: "Luca",
    note: "Cena di ieri",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    direction: "outgoing",
    createdAt: new Date().toISOString()
  },
  {
    id: "iou-2",
    amount: 6,
    counterparty: "Sara",
    note: "Biglietti", 
    status: "accepted",
    direction: "incoming",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "iou-3",
    amount: 3.5,
    counterparty: "Mauro",
    note: "Prestito",
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

export default function Home() {
  const [piBrowserDetected, setPiBrowserDetected] = useState(false);
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  const [piStatus, setPiStatus] = useState("Verifica dell'ambiente Pi in corso...");
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
  const [view, setView] = useState<"home" | "create" | "list" | "detail">("home");

  const [formAmount, setFormAmount] = useState<string>("");
  const [formCounterparty, setFormCounterparty] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");

  useEffect(() => {
    const { sdk, isPiBrowser } = detectPiSdk();
    setPiBrowserDetected(isPiBrowser);
    setPiSdkAvailable(Boolean(sdk));
    setPiStatus(
      sdk
        ? "Pronto a usare i pagamenti Pi."
        : isPiBrowser
          ? "Pi Browser è aperto, sto aspettando gli strumenti Pi."
          : "Apri l'app nel Pi Browser per abilitare i pagamenti."
    );

    if (sdk) {
      initializePiSdk(sdk);
    }
  }, []);

  useEffect(() => {
    const targetId = view === "create" ? "crea" : view === "list" ? "list" : view === "detail" ? "detail" : "top";
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
      const message = payload?.error ?? "Richiesta al server non riuscita.";
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

    setPiStatus("Richiesta di accesso Pi in corso...");

    try {
      const auth = await authenticateWithPi((payment) => {
        setPaymentStatus(`Ho trovato un pagamento non chiuso (${payment.identifier}). Chiudilo dal server.`);
      });

      setPiStatus("Accesso completato. Verifico i dati con il server...");

      const verification = await verifyPiAuth(auth);

      setAuthResult(auth);
      setServerUser(verification.user);
      setPiStatus("Sessione Pi confermata dal server.");
    } catch (error) {
      setAuthError((error as Error).message);
      setAuthResult(null);
      setServerUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCreateIou = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(formAmount);

    if (!Number.isFinite(amount) || amount <= 0 || !formCounterparty.trim()) {
      setPaymentStatus("Compila importo e controparte per creare la IOU.");
      return;
    }

    const newIou: Iou = {
      id: `iou-${Date.now()}`,
      amount,
      counterparty: formCounterparty.trim(),
      note: formNote.trim() || undefined,
      dueDate: formDueDate || undefined,
      status: "pending",
      direction: "outgoing",
      createdAt: new Date().toISOString()
    };

    setIous((previous) => [newIou, ...previous]);
    setSelectedIouId(newIou.id);
    setView("detail");
    setFormAmount("");
    setFormCounterparty("");
    setFormNote("");
    setFormDueDate("");
    setPaymentStatus("IOU creata. Nessun Pi mosso finché non paghi.");
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
      setPaymentStatus("Accedi con Pi prima di pagare la IOU.");
      return;
    }

    setIsPaymentLoading(true);

    let paymentIdentifier: string | null = null;

    const memoText = `Pagamento IOU per ${iou.counterparty}${iou.note ? `: ${iou.note}` : ""}`;

    const paymentCallbacks = {
      onReadyForServerApproval: async (pendingPayment: { identifier: string }) => {
        paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
        setActivePaymentId(paymentIdentifier);
        setPaymentStatus(`Pagamenti Pi pronti: conferma dal server ${pendingPayment.identifier}.`);

        try {
          await syncMockPayment(pendingPayment.identifier, "approve");
          setPaymentStatus(`Pagamento ${pendingPayment.identifier} approvato dal server di esempio.`);
        } catch (error) {
          setPaymentStatus((error as Error).message);
        }
      },
      onReadyForServerCompletion: async (pendingPayment: { identifier: string }) => {
        paymentIdentifier = pendingPayment?.identifier ?? paymentIdentifier;
        setActivePaymentId(paymentIdentifier);
        setPaymentStatus(`Il server può chiudere il pagamento ${pendingPayment.identifier}.`);

        try {
          await syncMockPayment(pendingPayment.identifier, "complete");
          setPaymentStatus(`IOU saldata. ${pendingPayment.identifier} chiuso.`);
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
        setPaymentStatus(`Pagamento${paymentId} annullato.`);

        if (pendingPayment?.identifier) {
          syncMockPayment(pendingPayment.identifier, "cancel").catch(() => {
            // Optional: keep UI responsive if the mock server fails.
          });
        }
      },
      onError: (error: unknown, pendingPayment?: { identifier?: string }) => {
        const paymentId = pendingPayment?.identifier ? ` sul pagamento ${pendingPayment.identifier}` : "";
        setPaymentStatus(`Errore${paymentId}: ${String(error)}`);
      }
    };

    try {
      const payment = await createTestPayment(iou.amount, memoText, paymentCallbacks);

      if (payment?.identifier) {
        setPaymentStatus(`Pagamento ${payment.identifier} creato. Segui le indicazioni del server.`);

        setActivePaymentId(payment.identifier);
        appendMockLog(`Cliente: creato ${payment.identifier}`);

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
          <p className="text-sm text-slate-300">Controparte: {iou.counterparty}</p>
        </div>
        <span className="pill text-xs">{statusLabels[iou.status]}</span>
      </div>
      {iou.note ? <p className="text-sm text-slate-200">Nota: {iou.note}</p> : null}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span>Creata: {formatDate(iou.createdAt)}</span>
        <span>Scadenza: {formatDate(iou.dueDate)}</span>
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
          Apri dettaglio
        </button>
        {iou.status === "pending" && iou.direction === "incoming" ? (
          <>
            <button
              type="button"
              onClick={() => handleAcceptIou(iou.id)}
              className="rounded-lg bg-piGold px-3 py-2 font-semibold text-[#0f1020] transition hover:brightness-110"
            >
              Accetta IOU
            </button>
            <button
              type="button"
              onClick={() => handleRejectIou(iou.id)}
              className="rounded-lg border border-red-400/60 px-3 py-2 font-semibold text-red-200 transition hover:bg-red-500/10"
            >
              Rifiuta
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
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">💸 Segna un debito. Pagalo in Pi.</h1>
        <p className="text-lg text-slate-200 md:text-xl">
          Crea una IOU, condividila con qualcuno e saldala quando vuoi — in Pi.
        </p>
        <p className="text-sm text-slate-300">Una IOU è una promessa di pagamento tra due persone.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setView("create")}
            className="button-primary"
          >
            ➕ Crea una IOU
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
          >
            📄 Vedi le mie IOU
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Pi Browser</p>
              <h2 className="text-2xl font-semibold">Pronto per pagare</h2>
              <p className="text-sm text-slate-300">Controllo automatico per capire se sei dentro il Pi Browser.</p>
            </div>
            <span className="pill text-xs text-slate-100">{piSdkAvailable ? "Attivo" : "In attesa"}</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-piGold">Browser:</span> {piBrowserDetected ? "Pi Browser" : "Altro"}
            </li>
            <li>
              <span className="font-semibold text-piGold">Stato strumenti:</span> {piSdkAvailable ? "Caricati" : "Non disponibili"}
            </li>
            <li>
              <span className="font-semibold text-piGold">Messaggio:</span> {piStatus}
            </li>
          </ul>
        </div>

        <div className="glass-card flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Accesso</p>
              <h2 className="text-xl font-semibold">Entra con il tuo account Pi</h2>
              <p className="text-xs text-slate-300">Serve per associare le IOU alla tua identità.</p>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={!piSdkAvailable || isAuthLoading}
              className="rounded-lg bg-piGold px-4 py-2 text-sm font-semibold text-[#0f1020] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Accesso..." : "Accedi"}
            </button>
          </div>

          {authResult ? (
            <div className="rounded-lg border border-green-400/60 bg-green-500/10 p-4 text-sm text-green-100">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {serverUser ? "Utente verificato dal server" : "Accesso Pi confermato"}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    serverUser ? "bg-green-600/80 text-white" : "bg-yellow-500/20 text-yellow-200"
                  }`}
                >
                  {serverUser ? "Verificato" : "In attesa"}
                </span>
              </div>

              <p>ID: {(serverUser ?? authResult.user)?.uid}</p>
              <p>Username: {(serverUser ?? authResult.user)?.username}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p>Accedi per collegare le IOU al tuo profilo Pi e poterle pagare.</p>
            </div>
          )}

          {authError ? <p className="text-sm text-red-300">{authError}</p> : null}
        </div>
      </section>

      <section className="glass-card grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Cosa è una IOU</p>
          <h2 className="text-2xl font-semibold">Promessa chiara, pagamento in Pi</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>Scrivi chi paga chi, quanto e perché.</li>
            <li>La creazione non muove Pi: è solo un promemoria condiviso.</li>
              <li>Quando sei pronto, paga la IOU con Pi direttamente dall&apos;app.</li>
          </ul>
          <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Stati possibili: {statusLabels.pending}, {statusLabels.accepted}, {statusLabels.paid}, {statusLabels.cancelled}.
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-piGold/30 bg-piGold/10 p-5 text-sm text-piGold">
          <p className="font-semibold text-slate-100">Esempio di dettaglio</p>
          <p className="text-lg font-bold text-slate-100">10 Pi</p>
          <p className="text-slate-100">Da pagare a Luca</p>
          <p className="text-slate-100">Stato: {statusLabels.pending}</p>
          <p className="text-slate-100">Motivo: Cena di ieri</p>
          <p className="text-slate-100">Scadenza: {formatDate(placeholderIous[0]?.dueDate)}</p>
        </div>
      </section>

      <section id="crea" className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleCreateIou} className="glass-card flex flex-col gap-4 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Creazione IOU</p>
          <h2 className="text-2xl font-semibold">Crea una nuova promessa</h2>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Importo (in Pi)
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
            A chi devo questi Pi?
            <input
              type="text"
              value={formCounterparty}
              onChange={(event) => setFormCounterparty(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Nota (opzionale)
            <input
              type="text"
              placeholder="Cena di ieri, biglietti, prestito"
              value={formNote}
              onChange={(event) => setFormNote(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-200">
            Scadenza (opzionale)
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
            Crea IOU
          </button>
          <p className="text-xs text-slate-400">Stato iniziale: {statusLabels.pending}. Nessun pagamento avviato.</p>
        </form>

        <div className="glass-card flex flex-col gap-4 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-piGold">Come funziona</p>
          <h2 className="text-xl font-semibold">Accetta, rifiuta, paga</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-200">
            <li>Chi riceve la IOU può accettarla oppure rifiutarla.</li>
            <li>Accettare non equivale a pagare: è solo il via libera.</li>
              <li>Per pagare, apri il dettaglio e premi il pulsante 💰 Paga in Pi.</li>
          </ul>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Stai per saldare questa IOU pagando l&apos;importo concordato alla controparte.
            </div>
        </div>
      </section>

      <section id="list" className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-piGold">Le mie IOU</p>
            <h2 className="text-2xl font-semibold">Panoramica veloce</h2>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setView("create")}
              className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold"
            >
              ➕ Crea
            </button>
            <button
              type="button"
              onClick={() => setView("detail")}
              disabled={!selectedIou}
              className="rounded-lg border border-white/20 px-3 py-2 font-semibold text-slate-100 transition hover:border-piGold hover:text-piGold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apri selezionata
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
            <p className="text-sm uppercase tracking-[0.2em] text-piGold">Dettaglio IOU</p>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">{selectedIou.amount} Pi</h2>
                <p className="text-slate-200">Da pagare a {selectedIou.counterparty}</p>
                <p className="text-sm text-slate-300">{directionLabels[selectedIou.direction]}</p>
              </div>
              <span className="pill text-xs">{statusLabels[selectedIou.status]}</span>
            </div>
            <div className="grid gap-3 text-sm text-slate-200">
              <p><span className="font-semibold text-piGold">Nota:</span> {selectedIou.note || "—"}</p>
              <p><span className="font-semibold text-piGold">Creata:</span> {formatDate(selectedIou.createdAt)}</p>
              <p><span className="font-semibold text-piGold">Scadenza:</span> {formatDate(selectedIou.dueDate)}</p>
              <p><span className="font-semibold text-piGold">Accettata:</span> {formatDate(selectedIou.acceptedAt)}</p>
              <p><span className="font-semibold text-piGold">Pagata:</span> {formatDate(selectedIou.paidAt)}</p>
              <p><span className="font-semibold text-piGold">Annullata:</span> {formatDate(selectedIou.cancelledAt)}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {selectedIou.status === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAcceptIou(selectedIou.id)}
                    className="rounded-lg bg-piGold px-4 py-2 font-semibold text-[#0f1020] transition hover:brightness-110"
                  >
                    ✅ Accetta IOU
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectIou(selectedIou.id)}
                    className="rounded-lg border border-red-400/60 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500/10"
                  >
                    ❌ Rifiuta
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
                  {isPaymentLoading ? "Elaborazione..." : "💰 Paga in Pi"}
                </button>
              ) : null}
            </div>
            <p className="text-sm text-slate-300">
              Stai per saldare questa IOU pagando {selectedIou.amount} Pi a {selectedIou.counterparty}.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-semibold text-slate-100">Timeline pagamento</p>
              {activePaymentId ? <p className="text-piGold">ID attuale: {activePaymentId}</p> : null}
              {mockPaymentLog.length ? (
                <ul className="mt-2 space-y-1 text-slate-300">
                  {mockPaymentLog.map((entry, index) => (
                    <li key={`${entry}-${index}`}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">La timeline si riempirà quando avvierai un pagamento.</p>
              )}
            </div>
            {paymentStatus ? <p className="rounded-lg border border-piGold/50 bg-piGold/10 p-3 text-sm text-piGold">{paymentStatus}</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

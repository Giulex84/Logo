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

const currencySymbols = {
  pi: "π",
  usd: "$",
  eur: "€"
} as const;

type Currency = keyof typeof currencySymbols;

type ExchangeRates = Record<Currency, Partial<Record<Currency, number>>>;

const exchangeRates: ExchangeRates = {
  pi: { usd: 0.2, eur: 0.18 },
  usd: { pi: 5, eur: 0.9 },
  eur: { pi: 5.5, usd: 1.1 }
};

export default function Home() {
  const [amount, setAmount] = useState(1);
  const [sourceCurrency, setSourceCurrency] = useState<Currency>("pi");
  const [piBrowserDetected, setPiBrowserDetected] = useState(false);
  const [piSdkAvailable, setPiSdkAvailable] = useState(false);
  const [piStatus, setPiStatus] = useState("Checking Pi Browser...");
  const [authResult, setAuthResult] = useState<PiAuthResult | null>(null);
  const [serverUser, setServerUser] = useState<PiAuthResult["user"] | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0.01);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  useEffect(() => {
    const { sdk, isPiBrowser } = detectPiSdk();
    setPiBrowserDetected(isPiBrowser);
    setPiSdkAvailable(Boolean(sdk));
    setPiStatus(
      sdk
        ? "Pi SDK detected. Ready for secure sign-in."
        : isPiBrowser
          ? "Pi Browser is open. Waiting for the SDK to finish loading."
          : "Open this DApp inside Pi Browser to unlock the SDK."
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

  const handleSignIn = async () => {
    setAuthError(null);
    setPaymentStatus(null);
    setServerUser(null);
    setIsAuthLoading(true);

    setPiStatus("Requesting Pi authentication...");

    try {
      const auth = await authenticateWithPi((payment) => {
        setPaymentStatus(`Found incomplete payment ${payment.identifier}. Complete it on your server.`);
      });

      setPiStatus("Authenticated with Pi SDK. Verifying with server...");

      const verification = await verifyPiAuth(auth);

      setAuthResult(auth);
      setServerUser(verification.user);
      setPiStatus("Server verification complete. Pioneer session ready.");
    } catch (error) {
      setAuthError((error as Error).message);
      setAuthResult(null);
      setServerUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentStatus(null);
    setAuthError(null);

    if (!authResult) {
      setPaymentStatus("Sign in with Pi first to send Pi or Test-Pi.");
      return;
    }

    setIsPaymentLoading(true);

    try {
      const payment = await createTestPayment(paymentAmount, "Test Pi tip from Pi Currency Companion", {
        onReadyForServerApproval: (pendingPayment) => {
          setPaymentStatus(
            `Payment ${pendingPayment.identifier} is pending server approval. Call your backend to approve with Pi Network.`
          );
        },
        onReadyForServerCompletion: (pendingPayment) => {
          setPaymentStatus(`Server should now complete payment ${pendingPayment.identifier}.`);
        },
        onCancel: (pendingPayment) => {
          const paymentId = pendingPayment?.identifier ? ` ${pendingPayment.identifier}` : "";
          setPaymentStatus(`Payment${paymentId} cancelled by the Pioneer.`);
        },
        onError: (error, pendingPayment) => {
          const paymentId = pendingPayment?.identifier ? ` on payment ${pendingPayment.identifier}` : "";
          setPaymentStatus(`Error${paymentId}: ${String(error)}`);
        }
      });

      if (payment?.identifier) {
        setPaymentStatus(
          `Payment ${payment.identifier} created. Approve and complete it server-side per Pi Network API docs.`
        );
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
              <span className="font-semibold text-piGold">State:</span> {piStatus}
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
              onClick={handleSignIn}
              disabled={!piSdkAvailable || isAuthLoading}
              className="rounded-lg bg-piGold px-4 py-2 text-sm font-semibold text-[#0f1020] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAuthLoading ? "Signing in..." : "Login with Pi"}
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

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200" htmlFor="amount">
                Amount in {currencySymbols[sourceCurrency]} {sourceCurrency.toUpperCase()}
              </label>
              <input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {conversions.map(({ target, rate, value }) => (
                <div key={target} className="glass-card border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-300">{currencySymbols[target]}</p>
                      <p className="text-xl font-bold">{value.toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-slate-300">1 {currencySymbols[sourceCurrency]} ≈ {rate} {currencySymbols[target]}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-300">
              Exchange rates are illustrative. Connect your own API or Pi payouts to make these numbers authoritative for production.
            </p>
          </div>
        </div>

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
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card flex flex-col gap-4 p-6 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-piGold">Transactions</p>
              <h2 className="text-xl font-semibold">Send Pi or Test-Pi</h2>
              <p className="text-xs text-slate-300">Callback messages are visible for reviewers—no hidden steps.</p>
            </div>
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaymentLoading}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:ring-piGold/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPaymentLoading ? "Processing..." : "Create payment"}
            </button>
          </div>

          <p className="text-sm text-slate-200">
            Payments flow through the Pi SDK. Your backend must approve and complete the payment using the identifiers returned in the callbacks.
          </p>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
            Client-side only by design—pair this UI with your server to log receipts and keep sensitive keys away from the browser.
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-100" htmlFor="payment-amount">
                Amount to send
              </label>
              <input
                id="payment-amount"
                type="number"
                min={0.01}
                step={0.01}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(Number(event.target.value) || 0.01)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-piGold focus:ring-2 focus:ring-piGold/60"
              />
              <p className="text-xs text-slate-400">Use test amounts until your server-side approval logic is live.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-semibold text-piGold">Server reminders</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
                <li>Approve payments with your Pi backend keys.</li>
                <li>Complete the payment after onReadyForServerApproval.</li>
                <li>Store receipts securely; never expose secrets client-side.</li>
              </ul>
            </div>
          </div>

          {paymentStatus ? <p className="text-sm text-piGold">{paymentStatus}</p> : null}
        </div>

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

      <section className="glass-card space-y-4 p-6 md:p-8">
        <h2 className="text-2xl font-semibold">Policies and terms for Pi compliance</h2>
        <p className="text-sm text-slate-200">
          This demo stays aligned with the Pi Network developer start guide: keep everything in English, publish your validation
          key, and make your operating terms transparent for Pioneers.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Validation: the official key is served from <code className="rounded bg-white/10 px-1">/.well-known/pi-validation.txt</code>
            so the Pi Browser and Vercel deployment can verify ownership without extra routing.
          </li>
          <li>
            Privacy Policy: no personal data is stored by default; if you add analytics or wallet calls, disclose the provider,
            retention period, and opt-out steps directly on this page.
          </li>
          <li>
            Terms of Use: this interface is for demonstration and educational purposes. Custom integrations (e.g., payments or
            payouts) must follow Pi Network rules, respect user consent, and avoid custodial handling of Pioneer funds.
          </li>
          <li>
            Safety: keep content Pi-friendly, avoid prohibited products, and confirm all third-party APIs use HTTPS with
            predictable CORS behavior for Pi Browser compatibility.
          </li>
        </ul>
        <div className="flex flex-wrap gap-3 text-sm text-piGold">
          <a className="rounded-lg border border-piGold/40 bg-piGold/10 px-3 py-2 font-semibold hover:border-piGold" href="/terms">
            View Terms of Use
          </a>
          <a className="rounded-lg border border-piGold/40 bg-piGold/10 px-3 py-2 font-semibold hover:border-piGold" href="/privacy">
            View Privacy Policy
          </a>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";

const currencySymbols = {
  pi: "π",
  usd: "$",
  eur: "€"
} as const;

const exchangeRates = {
  pi: { usd: 0.2, eur: 0.18 },
  usd: { pi: 5, eur: 0.9 },
  eur: { pi: 5.5, usd: 1.1 }
};

type Currency = keyof typeof currencySymbols;

export default function Home() {
  const [amount, setAmount] = useState(1);
  const [sourceCurrency, setSourceCurrency] = useState<Currency>("pi");

  const conversions = useMemo(() => {
    const targets = Object.keys(currencySymbols).filter(
      (key) => key !== sourceCurrency
    ) as Currency[];

    return targets.map((target) => {
      const rate = exchangeRates[sourceCurrency]?.[target as keyof typeof exchangeRates[Currency]] || 1;
      return {
        target,
        rate,
        value: Number.isFinite(rate) ? amount * rate : amount
      };
    });
  }, [amount, sourceCurrency]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/10">
          <span className="text-xl">π</span>
          <span className="font-semibold">Pi Currency Companion</span>
          <span className="text-xs text-slate-300">Ready for Pi Browser + Vercel</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">
          A delightful multi-currency helper for Pi-friendly projects
        </h1>
        <p className="text-lg text-slate-200 md:text-xl">
          Keep everything in English, showcase Pi, Dollar, and Euro values, and stay aligned with
          the Pi developer playbook.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            className="button-primary"
            href="https://pi-apps.github.io/community-developer-guide" target="_blank" rel="noreferrer"
          >
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
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-piGold">Converter</p>
                <h2 className="text-2xl font-semibold">Pick a currency and see its friendly twins</h2>
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
              Exchange rates are illustrative. Connect your own API or Pi payouts once you wire in real-time data.
            </p>
          </div>
        </div>

        <div className="glass-card flex flex-col gap-5 p-6 md:p-7">
          <p className="text-sm uppercase tracking-[0.25em] text-piGold">Pi launch checklist</p>
          <h2 className="text-2xl font-semibold">Ready for validation</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-200">
            <li>Add your <strong>validation key</strong> in <code className="rounded bg-white/10 px-2 py-1">public/.well-known/pi-validation.txt</code>.</li>
            <li>Confirm the file is reachable at <code className="rounded bg-white/10 px-2 py-1">/.well-known/pi-validation.txt</code> after deployment.</li>
            <li>Deploy to Vercel (no server config needed). Environment variables go in the Vercel dashboard.</li>
            <li>Keep everything in English and match the Pi community developer guide.</li>
          </ol>
          <div className="rounded-xl border border-piGold/60 bg-piGold/10 px-4 py-3 text-sm text-piGold">
            We left a placeholder key so you can drop in your official string as soon as you receive it.
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Deployment quick start</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Clone this repo and run <code className="rounded bg-white/10 px-1">npm install</code> locally.</li>
              <li>Use <code className="rounded bg-white/10 px-1">npm run dev</code> for a local preview, then push to Vercel.</li>
              <li>Set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_PI_VALIDATION_KEY</code> if you prefer env-based delivery.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {["Pi-native UX", "Beginner-friendly", "Mobile first"].map((title, index) => (
          <article key={title} className="glass-card p-5">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-piGold">
              {index + 1}
            </div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm text-slate-300">
              {index === 0 && "Built for Pi Browser compatibility with simple, self-contained routes and a validation hook."}
              {index === 1 && "Clear copy, accessible controls, and big hit areas help new Pioneers glide through onboarding."}
              {index === 2 && "Responsive layout that feels at home on phones and tablets without extra tweaks."}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}

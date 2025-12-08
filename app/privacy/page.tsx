export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-piGold">Policies</p>
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-slate-300">
          This policy explains what data the Pi Currency Companion handles and how you can keep users informed.
        </p>
      </header>

      <div className="glass-card space-y-4 p-6 md:p-8">
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Data collection</h2>
          <p className="text-sm text-slate-300">
            By default, the demo does not collect personal data or persist conversion entries. If you add
            analytics, payments, or wallet integrations, disclose the provider, the data captured, and retention
            periods.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Cookies & storage</h2>
          <p className="text-sm text-slate-300">
            The current build does not set cookies or use local storage. If you introduce them for features such as
            preferences or session tracking, document their purpose and expiration.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Third parties</h2>
          <p className="text-sm text-slate-300">
            Use only HTTPS services with transparent terms. Ensure any third-party SDKs or APIs respect Pi Browser
            constraints and provide a clear opt-out if they collect personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">User controls</h2>
          <p className="text-sm text-slate-300">
            Offer a simple way for users to request deletion or export of their data if you store any records. Add
            contact details or an in-app form when you extend this demo with persistent services.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-piGold">Policies</p>
        <h1 className="text-4xl font-bold">Terms of Use</h1>
        <p className="text-sm text-slate-300">
          These terms keep the Pi Currency Companion predictable, transparent, and compliant with the Pi
          developer guidelines.
        </p>
      </header>

      <div className="glass-card space-y-4 p-6 md:p-8">
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Purpose</h2>
          <p className="text-sm text-slate-300">
            This project is a demonstration interface for exploring Pi, USD, and EUR conversions. It is not a
            wallet, exchange, or custodial service. Any additional integrations you add must continue to follow
            Pi Network policies and applicable laws.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Acceptable use</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Keep the interface in English and avoid prohibited content or products.</li>
            <li>Use only HTTPS endpoints and respect Pi Browser compatibility constraints.</li>
            <li>Do not store or process Pioneer funds. Any payments must follow official Pi guidance.</li>
            <li>Respect rate limits and terms of any third-party APIs you connect.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Liability</h2>
          <p className="text-sm text-slate-300">
            The software is provided as-is, without warranties. You are responsible for the accuracy of any
            exchange rates or API responses you expose to users.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-2xl font-semibold">Updates</h2>
          <p className="text-sm text-slate-300">
            Terms may evolve as Pi Network policies or platform requirements change. Always review and update
            these notes before deploying a new version.
          </p>
        </section>
      </div>
    </main>
  );
}

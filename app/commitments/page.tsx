import Link from "next/link";

type Commitment = {
  id: string;
  author: string;
  counterparty: string;
  description: string;
  status: "Pending" | "Completed" | "Cancelled";
};

const MOCK_COMMITMENTS: Commitment[] = [
  {
    id: "1",
    author: "giulex",
    counterparty: "alex",
    description: "Deliver UI draft for homepage",
    status: "Pending",
  },
  {
    id: "2",
    author: "giulex",
    counterparty: "marco",
    description: "Review smart contract logic",
    status: "Completed",
  },
];

function StatusBadge({ status }: { status: Commitment["status"] }) {
  const color =
    status === "Completed"
      ? "bg-green-100 text-green-700"
      : status === "Cancelled"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export default function CommitmentsPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Public commitments</h1>

        <Link
          href="/commitments/create"
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          New commitment
        </Link>
      </div>

      <p className="mb-6 text-slate-600">
        Commitments are public records that help build trust and reputation over
        time. This platform does not process payments or compensation.
      </p>

      <div className="space-y-4">
        {MOCK_COMMITMENTS.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {c.author} → {c.counterparty}
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="text-slate-800">{c.description}</div>

            <div className="text-xs text-slate-400">
              This is a commitment record only. No payments are involved.
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-12 border-t pt-4 text-sm text-slate-500">
        <div className="flex gap-4">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </footer>
    </main>
  );
}

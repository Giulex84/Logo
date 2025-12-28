"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CreateCommitmentPage() {
  const router = useRouter();
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");

  function saveCommitment() {
    const raw = localStorage.getItem("commitments");
    const items = raw ? JSON.parse(raw) : [];

    items.unshift({
      id: crypto.randomUUID(),
      author: "guest",
      counterparty,
      description,
      status: "Pending",
    });

    localStorage.setItem("commitments", JSON.stringify(items));
    router.push("/commitments");
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Create commitment</h1>

      <p className="mb-6 text-slate-300">
        This form records a public, non-financial commitment.
        No payments or settlements occur on this platform.
      </p>

      <div className="space-y-4">
        <input
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          className="w-full rounded border border-slate-600 bg-slate-900 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Counterparty username"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded border border-slate-600 bg-slate-900 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe the commitment"
        />

        <button
          onClick={saveCommitment}
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
        >
          Save commitment
        </button>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Commitments are stored locally in your browser. This is not a financial service.
      </p>

      <div className="mt-6">
        <Link href="/commitments" className="text-indigo-400 underline">
          Back to commitments
        </Link>
      </div>
    </main>
  );
}

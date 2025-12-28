"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Commitment = {
  id: string;
  author: string;
  counterparty: string;
  description: string;
  status: "Pending" | "Completed" | "Cancelled";
};

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [items, setItems] = useState<Commitment[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("commitments");
    if (!raw) return;

    const all: Commitment[] = JSON.parse(raw);
    setItems(all.filter((c) => c.author === username));
  }, [username]);

  const completed = items.filter((i) => i.status === "Completed").length;

  return (
    <main className="mx-auto max-w-4xl p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">@{username}</h1>

      <p className="mb-6 text-slate-400">
        Public commitment history. No financial activity is involved.
      </p>

      <div className="mb-6 text-sm text-slate-300">
        Commitments created: {items.length} <br />
        Completed: {completed}
      </div>

      <div className="space-y-4">
        {items.map((c) => (
          <div key={c.id} className="rounded border border-slate-700 p-4">
            <div className="text-sm text-slate-400">
              {c.author} → {c.counterparty}
            </div>

            <div className="text-slate-200">{c.description}</div>

            <div className="text-xs text-slate-500 mt-1">
              Status: {c.status}
            </div>

            <Link
              href={`/commitments/${c.id}`}
              className="text-indigo-400 underline text-sm"
            >
              View detail
            </Link>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-slate-400 text-sm">
            No commitments yet.
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-slate-700 pt-4 text-sm text-slate-400">
        <div className="flex gap-4">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </footer>
    </main>
  );
}

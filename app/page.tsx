'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const Pi = (window as any).Pi;
    if (!Pi) return;

    Pi.authenticate(
      ['username'],
      (auth: any) => {
        setUsername(auth.user.username);
        localStorage.setItem('pi_username', auth.user.username);
      },
      (err: any) => {
        console.error('Pi auth error', err);
      }
    );
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col min-h-screen">
      <div className="flex-grow">
        <h1 className="text-3xl font-bold mb-4">IOU</h1>

        <p className="mb-2 text-sm text-slate-400">
          Logged as: {username ?? 'authenticating…'}
        </p>

        <p className="mb-4">
          IOU is a transparency utility that allows users to record commitments
          between identified peers.
        </p>

        <Link
          href="/commitments/create"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white"
        >
          Create a commitment
        </Link>
      </div>

      <footer className="mt-12 border-t pt-4 text-sm text-slate-500">
        <div className="flex gap-4">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>

        <div className="mt-6">
          <Link
            href="/pay-once"
            className="text-xs text-slate-500 underline"
          >
            Internal test payment
          </Link>
        </div>
      </footer>
    </main>
  );
}

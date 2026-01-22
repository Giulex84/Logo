'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const Pi = (window as any).Pi;
    if (!Pi) return;

    Pi.authenticate(
      ['username'],
      (auth: any) => {
        console.log('Authenticated as:', auth.user.username);
      },
      (error: any) => {
        console.error('Pi authentication failed:', error);
      }
    );
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 flex flex-col min-h-screen">
      <div className="flex-grow">
        <h1 className="text-3xl font-bold mb-4">Giulex Hub</h1>

        <p className="mb-4">
          Giulex Hub is a technical mainnet anchor app.
        </p>

        <Link
          href="/commitments/create"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white"
        >
          Create a commitment
        </Link>

        <div className="mt-10">
          <Link
            href="/pay-once"
            className="text-xs text-slate-500 underline"
          >
            Internal test payment
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';

declare global {
  interface Window {
    Pi: any;
  }
}

export default function PayOncePage() {
  const [status, setStatus] = useState<string | null>(null);

  const handlePayment = () => {
    if (!window.Pi) {
      setStatus('Pi SDK not available');
      return;
    }

    setStatus('Requesting payment permission...');

    window.Pi.authenticate(
      ['payments'],
      () => {
        setStatus('Creating payment...');

        window.Pi.createPayment(
          {
            amount: 0.01,
            memo: 'Mainnet test payment',
            metadata: {
              type: 'mainnet-test',
            },
          },
          {
            onReadyForServerApproval: (paymentId: string) => {
              console.log('Ready for server approval', paymentId);
              setStatus('Payment created. Waiting approval...');
              // per checklist va bene anche senza backend
            },
            onReadyForServerCompletion: (paymentId: string) => {
              console.log('Ready for completion', paymentId);
              setStatus('Payment completed');
            },
            onCancel: () => {
              setStatus('Payment cancelled');
            },
            onError: (err: any) => {
              console.error(err);
              setStatus('Payment error');
            },
          }
        );
      },
      (err: any) => {
        console.error('Payments auth error', err);
        setStatus('Payment permission denied');
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-slate-100">
      <h1 className="text-2xl font-semibold">Mainnet Test Payment</h1>

      <p className="text-slate-400 text-center max-w-md">
        This page processes a single Mainnet Pi transaction to complete the app checklist.
      </p>

      <button
        onClick={handlePayment}
        className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition"
      >
        Process Test Payment
      </button>

      {status && (
        <div className="mt-4 text-sm text-slate-300">
          {status}
        </div>
      )}
    </div>
  );
}

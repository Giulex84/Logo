"use client";

import { useState } from "react";

declare global {
  interface Window {
    Pi: any;
  }
}

export default function PayOncePage() {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (processing || done) return;

    if (typeof window === "undefined" || !window.Pi) {
      setError("Pi SDK not available.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await window.Pi.createPayment(
        {
          amount: 0.01,
          memo: "Mainnet test payment",
        },
        {
          onReadyForServerApproval: function (_paymentId: string) {
            // NO backend approval
          },
          onReadyForServerCompletion: function (_paymentId: string, _txid: string) {
            // NO backend completion
          },
          onCancel: function () {
            setProcessing(false);
          },
          onError: function (err: any) {
            setError(err?.message || "Payment error");
            setProcessing(false);
          },
        }
      );

      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
      setProcessing(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6 flex flex-col gap-6 min-h-screen">
      <h1 className="text-2xl font-bold">Mainnet Test Payment</h1>

      <p className="text-sm text-slate-600">
        This page processes a single Mainnet Pi transaction to complete the app checklist.
      </p>

      {!done && (
        <button
          onClick={handlePayment}
          disabled={processing}
          className={`rounded-lg px-4 py-2 text-white ${
            processing ? "bg-gray-400" : "bg-indigo-600"
          }`}
        >
          {processing ? "Processing..." : "Process Test Payment"}
        </button>
      )}

      {done && (
        <div className="rounded-lg border p-4 text-green-700 border-green-300">
          Payment completed. You can close this page.
        </div>
      )}

      {error && (
        <div className="rounded-lg border p-4 text-red-700 border-red-300">
          {error}
        </div>
      )}
    </main>
  );
}

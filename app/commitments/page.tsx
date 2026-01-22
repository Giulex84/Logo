"use client";

import { usePi } from "../providers/PiProvider";
import { useState } from "react";

export default function CommitmentsPage() {
  const { ready, authenticated, username } = usePi();
  const [text, setText] = useState("");

  if (!ready) {
    return <div>Authenticating with Pi...</div>;
  }

  if (!authenticated || !username) {
    return <div>Not authenticated</div>;
  }

  const createCommitment = async () => {
    await fetch("/api/commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: username,
        text,
      }),
    });
    setText("");
  };

  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">New commitment</h1>
      <p className="mb-2">Logged as: {username}</p>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border p-2 w-full mb-2"
        placeholder="Commitment text"
      />

      <button
        onClick={createCommitment}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Create commitment
      </button>
    </main>
  );
}

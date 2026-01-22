"use client";

import { useEffect, useState } from "react";

export default function PiProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForPi = () => {
      if (cancelled) return;

      if (window.Pi) {
        window.Pi.init({
          version: "2.0",
          sandbox: false
        });
        setReady(true);
      } else {
        setTimeout(waitForPi, 100);
      }
    };

    waitForPi();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Initializing Pi SDK…
      </div>
    );
  }

  return <>{children}</>;
}

'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Pi: any;
  }
}

export default function PiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForPi = () => {
      if (window.Pi) {
        window.Pi.init({ version: '2.0' });

        window.Pi.authenticate(
          ['username', 'payments'],
          (auth: any) => {
            if (!cancelled) {
              console.log('Pi authenticated:', auth);
              localStorage.setItem('pi_user', JSON.stringify(auth));
              setReady(true);
            }
          },
          (err: any) => {
            console.error('Pi auth error', err);
          }
        );
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
    return <div className="p-6 text-slate-400">Authenticating with Pi…</div>;
  }

  return <>{children}</>;
}

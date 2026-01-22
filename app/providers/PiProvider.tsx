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
        try {
          window.Pi.init({
            version: '2.0',
            sandbox: false,
          });

          if (!cancelled) {
            setReady(true);
            console.log('[Pi SDK] initialized');
          }
        } catch (err) {
          console.error('[Pi SDK] init error', err);
        }
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
    return null;
  }

  return <>{children}</>;
}

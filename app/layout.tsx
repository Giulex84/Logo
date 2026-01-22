import Script from 'next/script';
import './globals.css';
import PiProvider from './providers/PiProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="afterInteractive"
        />

        <PiProvider>
          {children}
        </PiProvider>
      </body>
    </html>
  );
}

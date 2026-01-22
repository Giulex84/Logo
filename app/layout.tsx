import Script from 'next/script';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pi IOU',
  description: 'Promise now and settle in Pi with a simple, clear flow.',
  applicationName: 'Pi IOU',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

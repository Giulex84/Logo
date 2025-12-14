import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pi IOU",
  description: "Crea, condividi e paga IOU in Pi con un flusso chiaro per utenti reali.",
  applicationName: "Pi IOU",
  keywords: ["Pi", "Pi Network", "IOU", "debiti", "Next.js"],
  metadataBase: new URL("https://iou4088.pi"),
  openGraph: {
    title: "Pi IOU",
    description: "Segna un debito e saldalo in Pi con una UI pensata per le persone.",
    url: "https://iou4088.pi",
    siteName: "Pi IOU"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <div className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#0b0c1d] to-[#0b0f2d] text-slate-100">
          {children}
        </div>
      </body>
    </html>
  );
}

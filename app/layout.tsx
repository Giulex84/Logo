import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import { PiProvider } from "./providers/PiProvider";

export const metadata: Metadata = {
  title: "Giulex Hub",
  description: "Giulex Hub mainnet application",
  applicationName: "Giulex Hub",
  keywords: ["Pi", "Pi Network", "Giulex", "Mainnet"],
  metadataBase: new URL("https://logo-five-mu.vercel.app"),
  openGraph: {
    title: "Giulex Hub",
    description: "Giulex Hub mainnet application",
    url: "https://logo-five-mu.vercel.app",
    siteName: "Giulex Hub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Pi Network SDK */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />

        {/* Pi Provider */}
        <PiProvider>
          <div className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#0b0c1d] to-[#0b0f2d] text-slate-100">
            {children}
          </div>
        </PiProvider>
      </body>
    </html>
  );
}

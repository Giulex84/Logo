import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pi Currency Companion",
  description: "Simple Pi-friendly currency app with Pi, Dollar, and Euro values.",
  applicationName: "Pi Currency Companion",
  keywords: ["Pi", "Pi Network", "currency", "finance", "Next.js"],
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "Pi Currency Companion",
    description: "A friendly Pi app for quick currency guidance.",
    url: "https://example.com",
    siteName: "Pi Currency Companion"
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
        <div className="min-h-screen bg-gradient-to-br from-[#0f1020] via-[#0b0c1d] to-[#0b0f2d] text-slate-100">
          {children}
        </div>
      </body>
    </html>
  );
}

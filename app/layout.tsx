import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Cahier Commerce",
  description: "Ventes, Lebalma et stock de votre boutique, dans votre téléphone.",
};

export const viewport: Viewport = {
  themeColor: "#0e5a47",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={figtree.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}

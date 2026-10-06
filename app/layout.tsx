import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { EnregistrementSW } from "@/components/enregistrement-sw";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Cahier Commerce",
  description: "Ventes, Lebalma et stock de votre boutique, dans votre téléphone.",
  applicationName: "Cahier Commerce",
  // iPhone : ouverture plein écran depuis l'écran d'accueil
  appleWebApp: { capable: true, title: "Cahier", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e5a47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // utilise tout l'écran, les marges « encoche » sont gérées en CSS
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={figtree.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <EnregistrementSW />
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

// Fiche d'identité de l'application installée (icône, nom, couleurs, plein écran).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cahier Commerce",
    short_name: "Cahier",
    description: "Ventes, Lebalma et stock de votre boutique.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f1",
    theme_color: "#0e5a47",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nouvelle vente", url: "/vendre", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Lebalma", url: "/lebalma", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

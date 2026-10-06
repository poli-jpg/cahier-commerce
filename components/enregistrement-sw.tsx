"use client";

import { useEffect } from "react";

// Active le service worker (écran hors connexion + chargement plus rapide).
// Seulement en production : en développement il gênerait le rechargement à chaud.
export function EnregistrementSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

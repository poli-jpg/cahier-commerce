// Service worker du Cahier Commerce.
// Règle importante : on ne met JAMAIS en cache les pages ni les données
// (ventes, dettes, stock). Elles viennent toujours du serveur, pour ne jamais
// afficher un montant périmé. On garde seulement les fichiers techniques
// (JavaScript, CSS, icônes) et la page « hors connexion ».

const VERSION = "cahier-v1";
const HORS_LIGNE = "/hors-ligne.html";
const A_PRECHARGER = [HORS_LIGNE, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(A_PRECHARGER)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;
  if (requete.method !== "GET") return; // ventes, paiements… : jamais interceptés
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  // Pages : toujours le réseau ; sans réseau, l'écran « hors connexion ».
  if (requete.mode === "navigate") {
    event.respondWith(fetch(requete).catch(() => caches.match(HORS_LIGNE)));
    return;
  }

  // Fichiers techniques versionnés : depuis le cache, sinon le réseau.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(requete).then(
        (enCache) =>
          enCache ||
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(VERSION).then((cache) => cache.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
  }
});

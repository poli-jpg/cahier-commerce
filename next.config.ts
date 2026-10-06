import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le projet est la racine (évite l'avertissement « package-lock.json outside »).
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        // Le navigateur doit toujours vérifier s'il existe une nouvelle version du service worker.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;

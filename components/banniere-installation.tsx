"use client";

import { useEffect, useState } from "react";

type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Etat = { mode: "cache" } | { mode: "android"; evenement: EvenementInstallation } | { mode: "iphone" };

const CLE = "installation-masquee";

/** Propose d'installer l'application, sauf si elle l'est déjà ou si on a dit « Plus tard ». */
export function BanniereInstallation() {
  const [etat, setEtat] = useState<Etat>({ mode: "cache" });

  useEffect(() => {
    const dejaInstallee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let masquee = false;
    try {
      masquee = localStorage.getItem(CLE) === "1";
    } catch {}
    if (dejaInstallee || masquee) return;

    // iPhone/iPad : pas de bouton d'installation possible, on explique le geste.
    const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const minuterie = iphone ? window.setTimeout(() => setEtat({ mode: "iphone" }), 0) : undefined;

    // Android (Chrome) : le navigateur nous donne un bouton d'installation.
    const surProposition = (e: Event) => {
      e.preventDefault();
      setEtat({ mode: "android", evenement: e as EvenementInstallation });
    };
    window.addEventListener("beforeinstallprompt", surProposition);
    return () => {
      window.clearTimeout(minuterie);
      window.removeEventListener("beforeinstallprompt", surProposition);
    };
  }, []);

  if (etat.mode === "cache") return null;

  function plusTard() {
    try {
      localStorage.setItem(CLE, "1");
    } catch {}
    setEtat({ mode: "cache" });
  }

  async function installer() {
    if (etat.mode !== "android") return;
    await etat.evenement.prompt();
    await etat.evenement.userChoice;
    setEtat({ mode: "cache" });
  }

  return (
    <section aria-labelledby="titre-installation" className="flex flex-col gap-3 rounded-3xl border-2 border-vert bg-carte p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
        <div className="flex flex-col">
          <h2 id="titre-installation" className="font-bold">Installer le Cahier sur ce téléphone</h2>
          <p className="text-sm text-sourdine">Il s&apos;ouvrira en plein écran, comme une application.</p>
        </div>
      </div>

      {etat.mode === "iphone" && (
        <p className="text-[15px]">
          Dans Safari, touchez le bouton <strong>Partager</strong> (le carré avec une flèche), puis{" "}
          <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={plusTard} className="h-12 flex-1 rounded-2xl border border-bord bg-carte font-semibold">
          Plus tard
        </button>
        {etat.mode === "android" && (
          <button type="button" onClick={installer} className="h-12 flex-1 rounded-2xl bg-vert font-bold text-white">
            Installer
          </button>
        )}
      </div>
    </section>
  );
}

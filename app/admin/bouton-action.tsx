"use client";

import { useState, useTransition } from "react";

type Props = {
  libelle: string;
  action: () => Promise<{ erreur?: string }>;
  style?: "principal" | "normal" | "danger";
  confirmation?: string; // si présent : un 2e appui est demandé
};

const STYLES = {
  principal: "bg-vert text-white",
  normal: "border border-bord bg-carte text-encre",
  danger: "border border-bord bg-carte text-erreur",
};

export function BoutonAction({ libelle, action, style = "normal", confirmation }: Props) {
  const [aConfirmer, setAConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  function lancer() {
    if (confirmation && !aConfirmer) {
      setAConfirmer(true);
      return;
    }
    setAConfirmer(false);
    setErreur(null);
    startTransition(async () => {
      const r = await action();
      if (r.erreur) setErreur(r.erreur);
    });
  }

  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        onClick={lancer}
        onBlur={() => setAConfirmer(false)}
        disabled={enCours}
        className={`h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${aConfirmer ? "bg-erreur text-white" : STYLES[style]}`}
      >
        {enCours ? "Un instant…" : aConfirmer ? confirmation : libelle}
      </button>
      {erreur && (
        <span role="alert" className="text-xs font-medium text-erreur">
          {erreur}
        </span>
      )}
    </span>
  );
}

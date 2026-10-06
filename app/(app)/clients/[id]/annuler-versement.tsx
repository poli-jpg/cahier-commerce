"use client";

import { useState } from "react";
import { MessageFormulaire } from "@/components/message-formulaire";
import type { EtatFormulaire } from "@/lib/constantes";
import { useFormulaire } from "@/lib/use-formulaire";

type Props = { action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire> };

export function AnnulerVersement({ action }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, onSubmit, enCours] = useFormulaire(action, {});

  if (etat.message) return <MessageFormulaire etat={etat} />;

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="self-start text-sm font-semibold text-erreur underline underline-offset-4">
        Annuler ce paiement
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-2xl bg-erreur-pale p-3">
      <label htmlFor="motif" className="text-sm font-semibold text-erreur">
        Pourquoi annuler ? (gardé dans l&apos;historique)
      </label>
      <input id="motif" name="motif" maxLength={200} placeholder="Ex. : erreur, elle a donné 1 000" className="h-11 rounded-xl border border-bord bg-carte px-3 text-base" autoFocus required />
      <MessageFormulaire etat={etat} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOuvert(false)} className="h-11 flex-1 rounded-xl border border-bord bg-carte text-sm font-semibold">
          Garder
        </button>
        <button type="submit" disabled={enCours} className="h-11 flex-1 rounded-xl bg-erreur text-sm font-bold text-white disabled:opacity-60">
          {enCours ? "Un instant…" : "Confirmer l'annulation"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import { TYPES_BOUTIQUE } from "@/lib/constantes";
import { creerBoutique } from "./actions";

export function FormulaireBoutique() {
  const [etat, formAction, enCours] = useActionState(creerBoutique, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Champ label="Nom de la boutique" name="name" placeholder="Ex. : Awa Beauté" autoComplete="organization" maxLength={80} required />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[15px] font-semibold">Vous vendez surtout…</legend>
        {TYPES_BOUTIQUE.map((t, i) => (
          <label
            key={t.valeur}
            className="flex h-14 cursor-pointer items-center gap-3 rounded-2xl border border-bord bg-carte px-4 text-base font-semibold has-[:checked]:border-2 has-[:checked]:border-vert has-[:checked]:bg-vert-pale"
          >
            <input type="radio" name="type" value={t.valeur} defaultChecked={i === 0} className="size-5 accent-vert" />
            {t.libelle}
          </label>
        ))}
      </fieldset>

      <MessageFormulaire etat={etat} />

      <button
        type="submit"
        disabled={enCours}
        className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60"
      >
        {enCours ? "Un instant…" : "Ouvrir mon cahier"}
      </button>
    </form>
  );
}

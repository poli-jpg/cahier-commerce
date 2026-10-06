"use client";

import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import { CATEGORIES_DEPENSE } from "@/lib/depenses";
import { useFormulaire } from "@/lib/use-formulaire";
import { MOYENS_PAIEMENT } from "@/lib/ventes";
import { ajouterDepense } from "../actions";

const pastille =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-bord bg-carte px-3 text-center text-sm leading-tight font-semibold has-[:checked]:border-2 has-[:checked]:border-vert has-[:checked]:bg-vert-pale has-[:checked]:font-bold has-[:checked]:text-vert-fonce has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-vert";

export function FormulaireDepense() {
  const [etat, onSubmit, enCours] = useFormulaire(ajouterDepense, {});

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="montant" className="text-lg font-bold">
          Combien avez-vous dépensé ?
        </label>
        <input
          id="montant"
          name="montant"
          inputMode="numeric"
          placeholder="Ex. : 15000"
          required
          className="montant h-16 rounded-2xl border-2 border-vert bg-carte px-4 text-3xl font-extrabold"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-semibold">Pour quoi ?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES_DEPENSE.map((c) => (
            <label key={c.valeur} className={pastille}>
              <input type="radio" name="categorie" value={c.valeur} required className="sr-only" />
              {c.libelle}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-semibold">Payé avec</legend>
        <div className="grid grid-cols-3 gap-2">
          {MOYENS_PAIEMENT.map((m, i) => (
            <label key={m.valeur} className={pastille}>
              <input type="radio" name="moyen" value={m.valeur} defaultChecked={i === 0} className="sr-only" />
              {m.libelle}
            </label>
          ))}
        </div>
      </fieldset>

      <Champ label="Note (facultatif)" name="note" maxLength={200} placeholder="Ex. : 2 cartons de lait chez le grossiste" />

      <MessageFormulaire etat={etat} />

      <button type="submit" disabled={enCours} className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer la dépense"}
      </button>
    </form>
  );
}

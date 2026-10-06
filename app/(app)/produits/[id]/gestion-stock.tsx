"use client";

import { useFormulaire } from "@/lib/use-formulaire";
import { useState } from "react";
import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import type { EtatFormulaire } from "@/lib/constantes";

type Action = (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;

type Props = { ajouter: Action; corriger: Action; stockActuel: number };

export function GestionStock({ ajouter, corriger, stockActuel }: Props) {
  const [mode, setMode] = useState<"ajouter" | "corriger">("ajouter");
  const [etatAjout, actionAjout, ajoutEnCours] = useFormulaire(ajouter, {});
  const [etatCorrection, actionCorrection, correctionEnCours] = useFormulaire(corriger, {});

  const onglet = (valeur: typeof mode, libelle: string) => (
    <button
      type="button"
      onClick={() => setMode(valeur)}
      aria-pressed={mode === valeur}
      className={`h-11 flex-1 rounded-xl text-[15px] font-semibold ${
        mode === valeur ? "bg-encre text-white" : "bg-fond text-encre"
      }`}
    >
      {libelle}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {onglet("ajouter", "Marchandise reçue")}
        {onglet("corriger", "Corriger après comptage")}
      </div>

      {mode === "ajouter" ? (
        // key : le champ se vide après chaque ajout réussi
        <form key={etatAjout.message} onSubmit={actionAjout} className="flex flex-col gap-4">
          <Champ label="Combien de pièces sont arrivées ?" name="quantite" inputMode="numeric" placeholder="Ex. : 12" required />
          <Champ label="Note (facultatif)" name="note" placeholder="Ex. : fournisseur Sandaga" maxLength={200} />
          <MessageFormulaire etat={etatAjout} />
          <button type="submit" disabled={ajoutEnCours} className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60">
            {ajoutEnCours ? "Un instant…" : "Ajouter au stock"}
          </button>
        </form>
      ) : (
        <form key={etatCorrection.message} onSubmit={actionCorrection} className="flex flex-col gap-4">
          <Champ
            label="Combien en avez-vous compté ?"
            name="nouveau_stock"
            inputMode="numeric"
            placeholder={String(stockActuel)}
            aide="La différence est notée dans l'historique comme correction."
            required
          />
          <MessageFormulaire etat={etatCorrection} />
          <button type="submit" disabled={correctionEnCours} className="h-14 rounded-2xl bg-encre text-lg font-bold text-white disabled:opacity-60">
            {correctionEnCours ? "Un instant…" : "Corriger le stock"}
          </button>
        </form>
      )}
    </div>
  );
}

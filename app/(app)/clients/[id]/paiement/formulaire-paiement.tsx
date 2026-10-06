"use client";

import { useState } from "react";
import { MessageFormulaire } from "@/components/message-formulaire";
import type { EtatFormulaire } from "@/lib/constantes";
import { entier, fcfa } from "@/lib/format";
import { useFormulaire } from "@/lib/use-formulaire";
import { MOYENS_PAIEMENT } from "@/lib/ventes";

type Props = {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  dette: number;
  nom: string;
  versementId: string;
};

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000];

export function FormulairePaiement({ action, dette, nom, versementId }: Props) {
  const [etat, onSubmit, enCours] = useFormulaire(action, {});
  const [saisie, setSaisie] = useState("");

  const chiffres = saisie.replace(/\D/g, "");
  const montant = chiffres ? Number(chiffres) : 0;
  const tropGrand = montant > dette;
  const resteApres = dette - montant;
  const rapides = MONTANTS_RAPIDES.filter((m) => m < dette).slice(-3);

  const puce = (valeur: number, libelle: string) => (
    <button
      key={libelle}
      type="button"
      onClick={() => setSaisie(entier(valeur))}
      aria-pressed={montant === valeur}
      className={`montant h-11 rounded-full px-4 text-[15px] font-bold ${
        montant === valeur ? "border-2 border-vert bg-vert-pale text-vert-fonce" : "border border-bord bg-carte"
      }`}
    >
      {libelle}
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="versement_id" value={versementId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="montant" className="text-lg font-bold">
          Combien {nom} donne aujourd&apos;hui ?
        </label>
        <input
          id="montant"
          name="montant"
          inputMode="numeric"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Ex. : 2000"
          aria-describedby="aide-montant"
          aria-invalid={tropGrand}
          className={`montant h-16 rounded-2xl border-2 bg-carte px-4 text-3xl font-extrabold ${tropGrand ? "border-erreur" : "border-vert"}`}
          required
        />
        <p id="aide-montant" className={`text-sm ${tropGrand ? "font-semibold text-erreur" : "text-sourdine"}`}>
          {tropGrand ? `C'est plus que la dette. Maximum : ${fcfa(dette)}.` : `Maximum : ${fcfa(dette)}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {rapides.map((m) => puce(m, entier(m)))}
          {puce(dette, `Tout, ${entier(dette)}`)}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-semibold">Moyen de paiement</legend>
        <div className="grid grid-cols-3 gap-2">
          {MOYENS_PAIEMENT.map((m, i) => (
            <label
              key={m.valeur}
              className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-bord bg-carte px-1 text-center text-sm leading-tight font-semibold min-[360px]:text-[15px] has-[:checked]:border-2 has-[:checked]:border-encre has-[:checked]:font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-vert"
            >
              <input type="radio" name="moyen" value={m.valeur} defaultChecked={i === 0} className="sr-only" />
              {m.libelle}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-[15px] font-semibold">
          Note (facultatif)
        </label>
        <input id="note" name="note" maxLength={200} placeholder="Ex. : donné par sa sœur" className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base" />
      </div>

      {montant > 0 && !tropGrand && (
        <div aria-live="polite" className={`flex flex-col gap-1 bord-a-bord px-5 py-4 ${resteApres > 0 ? "bg-dette-pale text-dette" : "bg-vert-pale text-vert-fonce"}`}>
          <span className="text-[15px] font-semibold">Après ce paiement</span>
          <span className="montant text-2xl font-extrabold">{resteApres > 0 ? `Reste ${fcfa(resteApres)}` : "Dette soldée"}</span>
        </div>
      )}

      <p className="text-sm text-sourdine">
        Le paiement règle d&apos;abord les achats les plus anciens. Il reste dans l&apos;historique : en cas d&apos;erreur, on l&apos;annule, on ne l&apos;efface pas.
      </p>

      <MessageFormulaire etat={etat} />

      <button
        type="submit"
        disabled={enCours || montant === 0 || tropGrand}
        className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : montant > 0 ? `Confirmer ${fcfa(montant)}` : "Confirmer le paiement"}
      </button>
    </form>
  );
}

"use client";

import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import { formaterTelephone } from "@/lib/telephone";
import { useFormulaire } from "@/lib/use-formulaire";
import { modifierBoutique, modifierMotDePasse } from "./actions";

const classeBouton = "h-14 rounded-2xl bg-encre text-lg font-bold text-white disabled:opacity-60";

export function FormulaireBoutiqueCompte({ nom, telephone }: { nom: string; telephone: string | null }) {
  const [etat, onSubmit, enCours] = useFormulaire(modifierBoutique, {});
  return (
    <form onSubmit={onSubmit} className="bord-a-bord flex flex-col gap-4 border-y border-trait bg-carte p-5">
      <h2 className="text-lg font-bold">Ma boutique</h2>
      <Champ label="Nom de la boutique" name="name" defaultValue={nom} maxLength={80} required />
      <Champ
        label="Téléphone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={telephone ? formaterTelephone(telephone) : undefined}
        placeholder="77 123 45 67"
        required
      />
      <MessageFormulaire etat={etat} />
      <button type="submit" disabled={enCours} className={classeBouton}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function FormulaireMotDePasse() {
  const [etat, onSubmit, enCours] = useFormulaire(modifierMotDePasse, {});
  return (
    // key : les champs se vident après un changement réussi
    <form key={etat.message} onSubmit={onSubmit} className="bord-a-bord flex flex-col gap-4 border-y border-trait bg-carte p-5">
      <h2 className="text-lg font-bold">Mot de passe</h2>
      <Champ label="Mot de passe actuel" name="actuel" type="password" autoComplete="current-password" required />
      <Champ label="Nouveau mot de passe" name="nouveau" type="password" autoComplete="new-password" aide="8 caractères minimum." minLength={8} required />
      <Champ label="Confirmer le nouveau mot de passe" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
      <MessageFormulaire etat={etat} />
      <button type="submit" disabled={enCours} className={classeBouton}>
        {enCours ? "Modification…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}

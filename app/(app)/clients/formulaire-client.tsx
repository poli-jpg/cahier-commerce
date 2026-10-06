"use client";

import Link from "next/link";
import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import type { Client, EtatClient } from "@/lib/clients";
import { formaterTelephone } from "@/lib/telephone";
import { useFormulaire } from "@/lib/use-formulaire";

type Props = {
  action: (etat: EtatClient, formData: FormData) => Promise<EtatClient>;
  client?: Client; // absent = création
};

export function FormulaireClient({ action, client }: Props) {
  const [etat, onSubmit, enCours] = useFormulaire(action, {} as EtatClient);
  const creation = !client;
  const doublon = etat.doublon;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Champ label="Nom" name="name" defaultValue={client?.name} placeholder="Ex. : Fatou Diop" autoComplete="off" maxLength={60} required />
      <Champ
        label="Téléphone"
        name="phone"
        type="tel"
        inputMode="tel"
        defaultValue={client?.phone ? formaterTelephone(client.phone) : undefined}
        placeholder="77 123 45 67"
        aide="Facultatif, mais utile pour retrouver le client et l'appeler."
      />
      <Champ label="Adresse ou quartier (facultatif)" name="address" defaultValue={client?.address ?? undefined} placeholder="Ex. : Pikine, Tally Boumack" maxLength={120} />

      {doublon && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-dette-pale px-4 py-3 text-[15px] text-dette">
          <p className="font-semibold">Ce numéro est déjà enregistré pour « {doublon.name} ».</p>
          <Link href={`/clients/${doublon.id}`} className="font-bold underline underline-offset-4">
            Voir sa fiche
          </Link>
          <p>Si c&apos;est une autre personne avec le même numéro, touchez « Créer quand même ».</p>
          <input type="hidden" name="confirmer_doublon" value="1" />
        </div>
      )}

      <MessageFormulaire etat={etat} />

      <button
        type="submit"
        disabled={enCours}
        className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60"
      >
        {enCours ? "Un instant…" : doublon ? "Créer quand même" : creation ? "Ajouter le client" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}

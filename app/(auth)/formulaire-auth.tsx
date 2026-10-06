"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { MessageFormulaire } from "@/components/message-formulaire";
import type { EtatFormulaire } from "@/lib/constantes";

type Props = {
  mode: "connexion" | "inscription";
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
};

export function FormulaireAuth({ mode, action }: Props) {
  const [etat, formAction, enCours] = useActionState(action, {});
  const inscription = mode === "inscription";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Champ label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Champ
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete={inscription ? "new-password" : "current-password"}
        aide={inscription ? "8 caractères minimum." : undefined}
        minLength={inscription ? 8 : undefined}
        required
      />

      <MessageFormulaire etat={etat} />

      <button
        type="submit"
        disabled={enCours}
        className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60"
      >
        {enCours ? "Un instant…" : inscription ? "Créer mon compte" : "Se connecter"}
      </button>

      <p className="text-center text-[15px] text-sourdine">
        {inscription ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <Link href={inscription ? "/connexion" : "/inscription"} className="font-semibold text-vert underline-offset-4 hover:underline">
          {inscription ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </form>
  );
}

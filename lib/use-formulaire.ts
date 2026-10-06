"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Comme useActionState, mais les champs ne sont PAS vidés après l'envoi.
 * (React 19 vide automatiquement un <form action={…}> : en cas d'erreur,
 * la commerçante devrait tout retaper.) Pour vider après un succès,
 * changer la `key` du formulaire.
 */
export function useFormulaire<E extends object>(
  action: (etat: E, formData: FormData) => Promise<E>,
  initial: E,
) {
  // E est un simple objet (jamais une promesse) : Awaited<E> = E.
  const [etat, envoyer, enCours] = useActionState<E, FormData>(
    action as (etat: Awaited<E>, formData: FormData) => Promise<E>,
    initial as Awaited<E>,
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => envoyer(formData));
  }

  return [etat, onSubmit, enCours] as const;
}

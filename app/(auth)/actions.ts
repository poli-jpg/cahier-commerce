"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/constantes";

function lireIdentifiants(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function seConnecter(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const { email, password } = lireIdentifiants(formData);
  if (!email || !password) {
    return { erreur: "Entrez votre e-mail et votre mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { erreur: "Confirmez d'abord votre e-mail : ouvrez le lien reçu, puis reconnectez-vous." };
    }
    return { erreur: "E-mail ou mot de passe incorrect." };
  }

  redirect("/");
}

export async function creerCompte(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const { email, password } = lireIdentifiants(formData);
  if (!email) return { erreur: "Entrez votre adresse e-mail." };
  if (password.length < 8) {
    return { erreur: "Le mot de passe doit avoir au moins 8 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === "user_already_exists") {
      return { erreur: "Un compte existe déjà avec cet e-mail. Connectez-vous." };
    }
    if (error.code === "weak_password") {
      return { erreur: "Mot de passe trop simple. Mélangez lettres et chiffres." };
    }
    return { erreur: "Le compte n'a pas pu être créé. Vérifiez l'e-mail et réessayez." };
  }

  // Si la confirmation d'e-mail est activée dans Supabase, pas encore de session.
  if (!data.session) {
    return { message: "Compte créé. Ouvrez l'e-mail de confirmation, puis connectez-vous." };
  }

  redirect("/bienvenue");
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

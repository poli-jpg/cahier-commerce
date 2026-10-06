"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estTypeBoutique, type EtatFormulaire } from "@/lib/constantes";

export async function creerBoutique(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const nom = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const type = String(formData.get("type") ?? "");

  if (nom.length < 2 || nom.length > 80) {
    return { erreur: "Donnez un nom à votre boutique (entre 2 et 80 caractères)." };
  }
  if (!estTypeBoutique(type)) {
    return { erreur: "Choisissez le type de votre boutique." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, name: nom, type });

  // 23505 = la boutique existe déjà pour ce compte (double clic, retour arrière…)
  if (error && error.code !== "23505") {
    return { erreur: "La boutique n'a pas pu être créée. Vérifiez votre connexion et réessayez." };
  }

  redirect("/");
}

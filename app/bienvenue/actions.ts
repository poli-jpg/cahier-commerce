"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estTypeBoutique, type EtatFormulaire } from "@/lib/constantes";
import { normaliserTelephone } from "@/lib/telephone";

export async function creerBoutique(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const nom = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const type = String(formData.get("type") ?? "");
  const telephone = normaliserTelephone(formData.get("phone"));

  if (nom.length < 2 || nom.length > 80) {
    return { erreur: "Donnez un nom à votre boutique (entre 2 et 80 caractères)." };
  }
  if (!estTypeBoutique(type)) {
    return { erreur: "Choisissez le type de votre boutique." };
  }
  if (telephone === null || telephone === "invalide") {
    return { erreur: "Indiquez votre numéro, par exemple 77 123 45 67 : on vous contacte pour activer votre compte." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, name: nom, type, phone: telephone });

  // 23505 = la boutique existe déjà pour ce compte (double clic, retour arrière…)
  if (error && error.code !== "23505") {
    return { erreur: "La boutique n'a pas pu être créée. Vérifiez votre connexion et réessayez." };
  }

  redirect("/");
}

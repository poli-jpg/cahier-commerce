"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/constantes";
import { lireTexte } from "@/lib/format";
import { normaliserTelephone } from "@/lib/telephone";

export async function modifierBoutique(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const nom = lireTexte(formData.get("name"));
  const telephone = normaliserTelephone(formData.get("phone"));

  if (nom.length < 2 || nom.length > 80) return { erreur: "Le nom de la boutique doit faire entre 2 et 80 caractères." };
  if (telephone === null || telephone === "invalide") return { erreur: "Numéro incorrect. Exemple : 77 123 45 67." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Reconnectez-vous puis réessayez." };

  // La règle RLS ne laisse modifier que SA boutique, et seulement le nom et le téléphone.
  const { data, error } = await supabase
    .from("businesses")
    .update({ name: nom, phone: telephone })
    .eq("owner_id", user.id)
    .select("id");
  if (error || !data.length) return { erreur: "Les informations n'ont pas pu être enregistrées. Réessayez." };

  revalidatePath("/", "layout");
  return { message: "Informations de la boutique enregistrées." };
}

export async function modifierMotDePasse(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (nouveau.length < 8) return { erreur: "Le nouveau mot de passe doit faire au moins 8 caractères." };
  if (nouveau !== confirmation) return { erreur: "Les deux nouveaux mots de passe ne sont pas identiques." };
  if (nouveau === actuel) return { erreur: "Le nouveau mot de passe doit être différent de l'actuel." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { erreur: "Reconnectez-vous puis réessayez." };

  // On vérifie d'abord le mot de passe actuel (comme l'Atelier).
  const { error: e1 } = await supabase.auth.signInWithPassword({ email: user.email, password: actuel });
  if (e1) return { erreur: "Mot de passe actuel incorrect." };

  const { error } = await supabase.auth.updateUser({ password: nouveau });
  if (error) {
    if (error.code === "weak_password") return { erreur: "Mot de passe trop simple. Mélangez lettres et chiffres." };
    return { erreur: "Le mot de passe n'a pas pu être changé. Réessayez." };
  }
  return { message: "Mot de passe modifié." };
}

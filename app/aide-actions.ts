"use server";

import { createClient } from "@/lib/supabase/server";

export async function envoyerDemandeAide(message: string): Promise<{ erreur?: string }> {
  const texte = message.trim();
  if (texte.length < 3) return { erreur: "Écrivez votre problème en quelques mots." };
  if (texte.length > 1000) return { erreur: "Message trop long (1 000 caractères maximum)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("envoyer_demande_aide", { p_message: texte });
  if (error) {
    if (error.message === "TROP_DE_DEMANDES") return { erreur: "Vous avez déjà envoyé beaucoup de messages aujourd'hui. Écrivez-nous sur WhatsApp." };
    return { erreur: "Le message n'a pas pu être envoyé. Réessayez ou écrivez-nous sur WhatsApp." };
  }
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultat = { erreur?: string };

const MESSAGES: Record<string, string> = {
  ACCES_REFUSE: "Accès réservé à l'administrateur.",
  BOUTIQUE_INTROUVABLE: "Cette boutique n'existe plus.",
  DUREE_INVALIDE: "Durée incorrecte.",
};

async function appeler(fonction: string, args: Record<string, unknown>): Promise<Resultat> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fonction, args);
  if (error) return { erreur: MESSAGES[error.message] ?? "L'action n'a pas pu être faite. Réessayez." };
  revalidatePath("/admin");
  return {};
}

export async function validerBoutique(id: string) {
  return appeler("admin_valider", { p_boutique: id });
}

export async function refuserBoutique(id: string) {
  return appeler("admin_refuser", { p_boutique: id });
}

export async function prolongerBoutique(id: string, mois: number) {
  if (![1, 3, 6, 12].includes(mois)) return { erreur: MESSAGES.DUREE_INVALIDE };
  return appeler("admin_prolonger", { p_boutique: id, p_mois: mois });
}

export async function suspendreBoutique(id: string) {
  return appeler("admin_suspendre", { p_boutique: id });
}

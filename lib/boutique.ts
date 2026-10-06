import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TypeBoutique } from "@/lib/constantes";

export type StatutCompte = "en_attente" | "valide" | "refuse";

export type Boutique = {
  id: string;
  name: string;
  type: TypeBoutique;
  phone: string | null;
  statut_compte: StatutCompte;
  abonnement_jusqu_au: string | null; // "AAAA-MM-JJ"
  created_at: string;
};

// La boutique du compte connecté, QUEL QUE SOIT son statut (règle RLS sur owner_id).
// cache() évite de refaire la requête plusieurs fois pendant un même rendu.
export const getBoutique = cache(async (): Promise<Boutique | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, type, phone, statut_compte, abonnement_jusqu_au, created_at")
    .maybeSingle();

  if (error) throw new Error("Lecture de la boutique impossible : " + error.message);
  return data;
});

/** Aujourd'hui à Dakar (UTC toute l'année), au format AAAA-MM-JJ. */
export function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

/** Jours restants d'abonnement (0 = se termine aujourd'hui, négatif = expiré). */
export function joursRestants(fin: string | null) {
  if (!fin) return -1;
  return Math.round((Date.parse(fin) - Date.parse(aujourdhui())) / 86_400_000);
}

export function abonnementActif(b: Boutique) {
  return b.statut_compte === "valide" && joursRestants(b.abonnement_jusqu_au) >= 0;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOYENS_PAIEMENT, type DemandeVente } from "@/lib/ventes";

const MESSAGES: Record<string, string> = {
  VENTE_VIDE: "Ajoutez au moins un produit.",
  CLIENT_REQUIS: "Choisissez le client : il reste de l'argent à payer.",
  CLIENT_INTROUVABLE: "Ce client n'existe plus. Choisissez-en un autre.",
  PRODUIT_INTROUVABLE: "Un produit de la vente n'existe plus. Retirez-le et réessayez.",
  TROP_PAYE: "Le montant reçu dépasse le total de la vente.",
  MOYEN_INVALIDE: "Choisissez le moyen de paiement.",
  QUANTITE_INVALIDE: "Une quantité est incorrecte.",
  PRIX_INVALIDE: "Un prix est incorrect.",
  LIGNE_INVALIDE: "Une ligne « montant libre » est incomplète.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const entierOk = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

export async function enregistrerVente(demande: DemandeVente): Promise<{ erreur: string }> {
  // Vérifications de forme : la base revérifie tout de son côté.
  if (!UUID.test(demande.id)) return { erreur: "Rechargez la page et réessayez." };
  if (!Array.isArray(demande.lignes) || demande.lignes.length === 0) return { erreur: MESSAGES.VENTE_VIDE };
  for (const l of demande.lignes) {
    if (!entierOk(l.quantite, 1, 10000) || !entierOk(l.prix, 0, 100_000_000)) {
      return { erreur: MESSAGES.PRIX_INVALIDE };
    }
  }
  if (!entierOk(demande.montantPaye, 0, Number.MAX_SAFE_INTEGER)) return { erreur: "Montant reçu incorrect." };
  if (demande.montantPaye > 0 && !MOYENS_PAIEMENT.some((m) => m.valeur === demande.moyen)) {
    return { erreur: MESSAGES.MOYEN_INVALIDE };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("enregistrer_vente", {
    p_id: demande.id,
    p_lignes: demande.lignes,
    p_montant_paye: demande.montantPaye,
    p_moyen: demande.montantPaye > 0 ? demande.moyen : null,
    p_client: demande.clientId,
  });

  // 23505 : la même vente est arrivée deux fois en même temps ; elle est bien enregistrée.
  if (error && error.code !== "23505") {
    if (error.message === "STOCK_INSUFFISANT") {
      return { erreur: `Stock insuffisant pour « ${error.details} ». Corrigez le stock du produit ou la quantité.` };
    }
    return { erreur: MESSAGES[error.message] ?? "La vente n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez." };
  }

  revalidatePath("/", "layout");
  redirect(`/ventes/${demande.id}`);
}

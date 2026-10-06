"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/constantes";
import { entier, lireEntier, lireTexte } from "@/lib/format";
import { MOYENS_PAIEMENT } from "@/lib/ventes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MESSAGES: Record<string, string> = {
  AUCUNE_DETTE: "Ce client ne doit plus rien.",
  MONTANT_INVALIDE: "Indiquez le montant reçu.",
  MOYEN_INVALIDE: "Choisissez le moyen de paiement.",
  CLIENT_INTROUVABLE: "Ce client n'existe plus.",
  NOTE_TROP_LONGUE: "Note trop longue (200 caractères maximum).",
};

export async function enregistrerPaiement(
  clientId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const versement = String(formData.get("versement_id") ?? "");
  const montant = lireEntier(formData.get("montant"));
  const moyen = String(formData.get("moyen") ?? "");
  const note = lireTexte(formData.get("note"));

  if (!UUID.test(versement)) return { erreur: "Rechargez la page et réessayez." };
  if (montant === null || montant === "invalide" || montant === 0) return { erreur: MESSAGES.MONTANT_INVALIDE };
  if (!MOYENS_PAIEMENT.some((m) => m.valeur === moyen)) return { erreur: MESSAGES.MOYEN_INVALIDE };

  const supabase = await createClient();
  const { error } = await supabase.rpc("enregistrer_paiement", {
    p_versement: versement,
    p_client: clientId,
    p_montant: montant,
    p_moyen: moyen,
    p_note: note || null,
  });

  if (error) {
    if (error.message === "TROP_PAYE") {
      return { erreur: `Le montant dépasse la dette. Maximum : ${entier(Number(error.details))} F.` };
    }
    return { erreur: MESSAGES[error.message] ?? "Le paiement n'a pas pu être enregistré. Vérifiez votre connexion et réessayez." };
  }

  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}?paye=${montant}`);
}

export async function annulerVersement(
  clientId: string,
  versementId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const motif = lireTexte(formData.get("motif"));
  if (!motif) return { erreur: "Expliquez en quelques mots pourquoi vous annulez." };
  if (motif.length > 200) return { erreur: "Motif trop long (200 caractères maximum)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("annuler_versement", { p_versement: versementId, p_motif: motif });
  if (error) {
    if (error.message === "CLIENT_REQUIS") {
      return { erreur: "Ce paiement vient d'une vente au comptant sans client : il ne peut pas être annulé." };
    }
    if (error.message === "VERSEMENT_INTROUVABLE") return { erreur: "Ce paiement est déjà annulé." };
    return { erreur: "L'annulation n'a pas pu être enregistrée. Réessayez." };
  }

  revalidatePath("/", "layout");
  return { message: "Paiement annulé. La dette a été mise à jour." };
}

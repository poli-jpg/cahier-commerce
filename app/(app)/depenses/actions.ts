"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtatFormulaire } from "@/lib/constantes";
import { CATEGORIES_DEPENSE } from "@/lib/depenses";
import { lireEntier, lireTexte } from "@/lib/format";
import { MOYENS_PAIEMENT } from "@/lib/ventes";

export async function ajouterDepense(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const montant = lireEntier(formData.get("montant"));
  const categorie = String(formData.get("categorie") ?? "");
  const moyen = String(formData.get("moyen") ?? "");
  const note = lireTexte(formData.get("note"));

  if (montant === null || montant === "invalide" || montant === 0) return { erreur: "Indiquez le montant dépensé, par exemple 5000." };
  if (montant > 100_000_000) return { erreur: "Montant trop élevé." };
  if (!CATEGORIES_DEPENSE.some((c) => c.valeur === categorie)) return { erreur: "Choisissez à quoi a servi l'argent." };
  if (!MOYENS_PAIEMENT.some((m) => m.valeur === moyen)) return { erreur: "Choisissez le moyen de paiement." };
  if (note.length > 200) return { erreur: "Note trop longue (200 caractères maximum)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .insert({ amount: montant, category: categorie, payment_method: moyen, note: note || null });
  if (error) return { erreur: "La dépense n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez." };

  revalidatePath("/", "layout");
  redirect(`/depenses?ajoutee=${montant}`);
}

export async function annulerDepense(id: string, _etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const motif = lireTexte(formData.get("motif"));
  if (!motif) return { erreur: "Expliquez en quelques mots pourquoi vous annulez." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("annuler_depense", { p_depense: id, p_motif: motif });
  if (error) {
    if (error.message === "DEPENSE_INTROUVABLE") return { erreur: "Cette dépense est déjà annulée." };
    return { erreur: "L'annulation n'a pas pu être enregistrée. Réessayez." };
  }
  revalidatePath("/", "layout");
  return { message: "Dépense annulée." };
}

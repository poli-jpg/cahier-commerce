"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtatClient } from "@/lib/clients";
import { lireTexte } from "@/lib/format";
import { normaliserTelephone } from "@/lib/telephone";

type ChampsClient = { name: string; phone: string | null; address: string | null };

function lireChampsClient(formData: FormData): ChampsClient | { erreur: string } {
  const name = lireTexte(formData.get("name"));
  const phone = normaliserTelephone(formData.get("phone"));
  const address = lireTexte(formData.get("address")) || null;

  if (name.length < 1 || name.length > 60) {
    return { erreur: "Écrivez le nom du client (60 caractères maximum)." };
  }
  if (phone === "invalide") {
    return { erreur: "Numéro incorrect. Exemple : 77 123 45 67." };
  }
  if (address && address.length > 120) {
    return { erreur: "Adresse trop longue (120 caractères maximum)." };
  }
  return { name, phone, address };
}

export async function creerClient(_etat: EtatClient, formData: FormData): Promise<EtatClient> {
  const champs = lireChampsClient(formData);
  if ("erreur" in champs) return { erreur: champs.erreur };

  const supabase = await createClient();

  // Même numéro déjà enregistré ? On prévient, sauf si elle a confirmé.
  if (champs.phone && formData.get("confirmer_doublon") !== "1") {
    const { data: existant } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", champs.phone)
      .eq("archived", false)
      .limit(1)
      .maybeSingle();
    if (existant) return { doublon: existant };
  }

  const { data, error } = await supabase.from("customers").insert(champs).select("id").single();
  if (error) return { erreur: "Le client n'a pas pu être enregistré. Vérifiez votre connexion et réessayez." };

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function modifierClient(
  id: string,
  _etat: EtatClient,
  formData: FormData,
): Promise<EtatClient> {
  const champs = lireChampsClient(formData);
  if ("erreur" in champs) return { erreur: champs.erreur };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(champs)
    .eq("id", id)
    .eq("archived", false)
    .select("id");
  if (error) return { erreur: "Les modifications n'ont pas pu être enregistrées. Réessayez." };
  if (!data.length) return { erreur: "Ce client n'existe plus." };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { message: "Modifications enregistrées." };
}

export async function archiverClient(id: string) {
  const supabase = await createClient();
  // Un client qui doit encore de l'argent ne peut pas être retiré.
  const { count } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id)
    .gt("remaining_amount", 0);
  if (count) redirect(`/clients/${id}`);
  await supabase.from("customers").update({ archived: true }).eq("id", id);
  revalidatePath("/clients");
  redirect("/clients");
}

/** Depuis la caisse : crée le client (ou reprend celui qui a déjà ce numéro). */
export async function creerClientRapide(
  nom: string,
  telephone: string,
): Promise<{ client: { id: string; name: string; phone: string | null }; existant: boolean } | { erreur: string }> {
  const formData = new FormData();
  formData.set("name", nom);
  formData.set("phone", telephone);
  const champs = lireChampsClient(formData);
  if ("erreur" in champs) return { erreur: champs.erreur };

  const supabase = await createClient();
  if (champs.phone) {
    const { data: existant } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("phone", champs.phone)
      .eq("archived", false)
      .limit(1)
      .maybeSingle();
    if (existant) return { client: existant, existant: true };
  }

  const { data, error } = await supabase.from("customers").insert(champs).select("id, name, phone").single();
  if (error) return { erreur: "Le client n'a pas pu être créé. Réessayez." };
  revalidatePath("/clients");
  return { client: data, existant: false };
}

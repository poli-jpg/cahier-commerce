"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NOUVELLE_CATEGORIE, type EtatFormulaire } from "@/lib/constantes";
import { echapperLike, entier, lireEntier, lireTexte } from "@/lib/format";
import { BUCKET_PHOTOS, cheminPhotoValide } from "@/lib/photos";

type ChampsProduit = {
  name: string;
  selling_price: number;
  purchase_price: number | null;
  low_stock_threshold: number;
};

function lireChampsProduit(formData: FormData): ChampsProduit | { erreur: string } {
  const name = lireTexte(formData.get("name"));
  const prixVente = lireEntier(formData.get("selling_price"));
  const prixAchat = lireEntier(formData.get("purchase_price"));
  const seuil = lireEntier(formData.get("low_stock_threshold"));

  if (name.length < 1 || name.length > 80) {
    return { erreur: "Donnez un nom au produit (80 caractères maximum)." };
  }
  if (prixVente === null || prixVente === "invalide") {
    return { erreur: "Indiquez le prix de vente en chiffres, par exemple 3500." };
  }
  if (prixAchat === "invalide") {
    return { erreur: "Le prix d'achat doit être un nombre, ou laissez-le vide." };
  }
  if (seuil === "invalide") {
    return { erreur: "Le seuil d'alerte doit être un nombre." };
  }

  return {
    name,
    selling_price: prixVente,
    purchase_price: prixAchat,
    low_stock_threshold: seuil ?? 3,
  };
}

/** Catégorie choisie, ou créée à la volée si la commerçante en a écrit une nouvelle. */
async function resoudreCategorie(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<{ id: string | null } | { erreur: string }> {
  const choix = String(formData.get("category_id") ?? "");
  if (choix !== NOUVELLE_CATEGORIE) return { id: choix || null };

  const nom = lireTexte(formData.get("nouvelle_categorie"));
  if (!nom) return { erreur: "Écrivez le nom de la nouvelle catégorie." };
  if (nom.length > 40) return { erreur: "Nom de catégorie trop long (40 caractères maximum)." };

  // Même nom déjà existant (sans tenir compte des majuscules) : on le réutilise.
  const { data: existante } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", echapperLike(nom))
    .maybeSingle();
  if (existante) return { id: existante.id };

  const { data, error } = await supabase.from("categories").insert({ name: nom }).select("id").single();
  if (error) return { erreur: "La catégorie n'a pas pu être créée. Réessayez." };
  return { id: data.id };
}

/** Chemin de photo envoyé par le formulaire : "" = pas de photo. */
function lirePhoto(formData: FormData): { chemin: string | null } | { erreur: string } {
  const chemin = String(formData.get("image_path") ?? "").trim();
  if (!chemin) return { chemin: null };
  if (!cheminPhotoValide(chemin)) return { erreur: "La photo n'a pas pu être enregistrée. Choisissez-la à nouveau." };
  return { chemin };
}

function messageErreurProduit(code: string | undefined) {
  if (code === "23505") return "Un produit porte déjà ce nom. Ajoutez la contenance ou la teinte pour les distinguer.";
  return "Le produit n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.";
}

export async function creerProduit(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const champs = lireChampsProduit(formData);
  if ("erreur" in champs) return champs;

  const stockInitial = lireEntier(formData.get("stock_initial"));
  if (stockInitial === "invalide") return { erreur: "Le stock de départ doit être un nombre." };

  const photo = lirePhoto(formData);
  if ("erreur" in photo) return photo;

  const supabase = await createClient();
  const categorie = await resoudreCategorie(supabase, formData);
  if ("erreur" in categorie) return categorie;

  const { data: idProduit, error } = await supabase.rpc("creer_produit", {
    p_nom: champs.name,
    p_prix_vente: champs.selling_price,
    p_categorie: categorie.id,
    p_prix_achat: champs.purchase_price,
    p_seuil: champs.low_stock_threshold,
    p_stock_initial: stockInitial ?? 0,
  });
  if (error) return { erreur: messageErreurProduit(error.code) };

  // La photo est déjà dans le stockage : on la relie au produit créé.
  if (photo.chemin) await supabase.from("products").update({ image_path: photo.chemin }).eq("id", idProduit);

  revalidatePath("/produits");
  redirect(`/produits?ajoute=${encodeURIComponent(champs.name)}`);
}

export async function modifierProduit(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const champs = lireChampsProduit(formData);
  if ("erreur" in champs) return champs;

  const photo = lirePhoto(formData);
  if ("erreur" in photo) return photo;

  const supabase = await createClient();
  const categorie = await resoudreCategorie(supabase, formData);
  if ("erreur" in categorie) return categorie;

  const { data: avant } = await supabase.from("products").select("image_path").eq("id", id).maybeSingle();

  const { data, error } = await supabase
    .from("products")
    .update({ ...champs, category_id: categorie.id, image_path: photo.chemin })
    .eq("id", id)
    .eq("archived", false)
    .select("id");
  if (error) return { erreur: messageErreurProduit(error.code) };
  if (!data.length) return { erreur: "Ce produit n'existe plus." };

  // Ancienne photo remplacée ou retirée : on libère la place (sans bloquer si ça échoue).
  if (avant?.image_path && avant.image_path !== photo.chemin) {
    await supabase.storage.from(BUCKET_PHOTOS).remove([avant.image_path]);
  }

  revalidatePath("/", "layout");
  return { message: "Modifications enregistrées." };
}

export async function ajouterStock(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const quantite = lireEntier(formData.get("quantite"));
  if (quantite === null || quantite === "invalide" || quantite === 0) {
    return { erreur: "Indiquez combien de pièces sont arrivées." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stock_movements").insert({
    product_id: id,
    type: "entree",
    quantity: quantite,
    note: lireTexte(formData.get("note")) || null,
  });
  if (error) return { erreur: "Le stock n'a pas pu être ajouté. Réessayez." };

  revalidatePath(`/produits/${id}`);
  revalidatePath("/produits");
  return { message: `+ ${entier(quantite)} ajoutés au stock.` };
}

export async function corrigerStock(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const compte = lireEntier(formData.get("nouveau_stock"));
  if (compte === null || compte === "invalide") {
    return { erreur: "Indiquez combien de pièces vous avez comptées." };
  }

  const supabase = await createClient();
  const { data: ecart, error } = await supabase.rpc("corriger_stock", {
    p_produit: id,
    p_nouveau_stock: compte,
  });
  if (error) return { erreur: "Le stock n'a pas pu être corrigé. Réessayez." };

  revalidatePath(`/produits/${id}`);
  revalidatePath("/produits");
  if (ecart === 0) return { message: "Le stock était déjà juste." };
  const signe = ecart > 0 ? "+" : "−";
  return { message: `Stock corrigé (${signe} ${entier(Math.abs(ecart))}).` };
}

export async function archiverProduit(id: string) {
  const supabase = await createClient();
  await supabase.from("products").update({ archived: true }).eq("id", id);
  revalidatePath("/produits");
  redirect("/produits");
}

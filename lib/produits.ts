import { createClient } from "@/lib/supabase/server";

export type Categorie = { id: string; name: string };

export type Produit = {
  id: string;
  name: string;
  category_id: string | null;
  selling_price: number;
  purchase_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
};

export type EtatStock = "epuise" | "faible" | "ok";

export function etatStock(p: Pick<Produit, "stock_quantity" | "low_stock_threshold">): EtatStock {
  if (p.stock_quantity === 0) return "epuise";
  if (p.stock_quantity <= p.low_stock_threshold) return "faible";
  return "ok";
}

export const LIBELLES_MOUVEMENT: Record<string, string> = {
  entree: "Entrée de stock",
  ajustement: "Correction",
  vente: "Vente",
  annulation_vente: "Vente annulée",
};

export async function getCategories(): Promise<Categorie[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error("Lecture des catégories impossible : " + error.message);
  return data;
}

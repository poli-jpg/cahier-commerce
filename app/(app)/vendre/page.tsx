import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/produits";
import type { ClientCaisse } from "@/lib/ventes";
import { Caisse, type ProduitCaisse } from "./caisse";

export const metadata = { title: "Nouvelle vente — Cahier Commerce" };

export default async function PageVendre() {
  const supabase = await createClient();
  const [{ data: produits, error: e1 }, { data: clients, error: e2 }, categories] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, selling_price, stock_quantity, image_path")
      .eq("archived", false)
      .order("name")
      .returns<ProduitCaisse[]>(),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("archived", false)
      .order("name")
      .returns<ClientCaisse[]>(),
    getCategories(),
  ]);
  if (e1 || e2) throw new Error("Chargement de la caisse impossible.");

  return <Caisse produits={produits} clients={clients} categories={categories} />;
}

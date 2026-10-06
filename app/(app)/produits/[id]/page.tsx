import { notFound } from "next/navigation";
import { BoutonRetour } from "@/components/bouton-retour";
import { createClient } from "@/lib/supabase/server";
import { LIBELLES_MOUVEMENT, etatStock, getCategories, type Produit } from "@/lib/produits";
import { dateCourte, entier } from "@/lib/format";
import { ajouterStock, archiverProduit, corrigerStock, modifierProduit } from "../actions";
import { FormulaireProduit } from "../formulaire-produit";
import { GestionStock } from "./gestion-stock";

export const metadata = { title: "Produit — Cahier Commerce" };

type Mouvement = { id: string; type: string; quantity: number; note: string | null; created_at: string };

export default async function PageProduit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: produit }, { data: mouvements }, categories] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, selling_price, purchase_price, stock_quantity, low_stock_threshold")
      .eq("id", id)
      .eq("archived", false)
      .maybeSingle<Produit>(),
    supabase
      .from("stock_movements")
      .select("id, type, quantity, note, created_at")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(15)
      .returns<Mouvement[]>(),
    getCategories(),
  ]);

  if (!produit) notFound();

  const etat = etatStock(produit);

  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/produits" libelle="Retour aux produits" />
        <h1 className="min-w-0 truncate text-2xl font-extrabold">{produit.name}</h1>
      </header>

      <section aria-labelledby="titre-stock" className="flex flex-col gap-4 rounded-3xl bg-carte p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titre-stock" className="text-lg font-bold">En stock</h2>
          <p
            className={`montant text-3xl font-extrabold ${
              etat === "epuise" ? "text-erreur" : etat === "faible" ? "text-dette" : "text-encre"
            }`}
          >
            {etat === "epuise" ? "Épuisé" : entier(produit.stock_quantity)}
          </p>
        </div>
        <GestionStock
          ajouter={ajouterStock.bind(null, produit.id)}
          corriger={corrigerStock.bind(null, produit.id)}
          stockActuel={produit.stock_quantity}
        />
      </section>

      <section aria-labelledby="titre-historique" className="flex flex-col gap-3 rounded-3xl bg-carte p-5">
        <h2 id="titre-historique" className="text-lg font-bold">Historique du stock</h2>
        {mouvements?.length ? (
          <ul className="flex flex-col gap-3">
            {mouvements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{LIBELLES_MOUVEMENT[m.type] ?? m.type}</span>
                  <span className="truncate text-sm text-sourdine">
                    {dateCourte(m.created_at)}
                    {m.note ? `, ${m.note}` : ""}
                  </span>
                </span>
                <span className={`montant shrink-0 font-bold ${m.quantity > 0 ? "text-vert" : "text-dette"}`}>
                  {m.quantity > 0 ? "+" : "−"} {entier(Math.abs(m.quantity))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-sourdine">Aucun mouvement pour l&apos;instant.</p>
        )}
      </section>

      <section aria-labelledby="titre-infos" className="flex flex-col gap-4">
        <h2 id="titre-infos" className="text-lg font-bold">Informations</h2>
        <FormulaireProduit action={modifierProduit.bind(null, produit.id)} categories={categories} produit={produit} />
      </section>

      <form action={archiverProduit.bind(null, produit.id)} className="flex flex-col gap-2 border-t border-trait pt-5">
        <p className="text-sm text-sourdine">
          Vous ne vendez plus ce produit ? Retirez-le de la liste. Son historique est conservé.
        </p>
        <button type="submit" className="h-12 rounded-2xl border border-bord bg-carte font-semibold text-erreur">
          Retirer ce produit
        </button>
      </form>
    </main>
  );
}

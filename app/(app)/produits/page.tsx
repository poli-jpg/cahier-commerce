import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoirPlus } from "@/components/voir-plus";
import { lireLimite } from "@/lib/constantes";
import { etatStock, getCategories, type Produit } from "@/lib/produits";
import { echapperLike, entier, fcfa } from "@/lib/format";

export const metadata = { title: "Produits — Cahier Commerce" };

const FILTRE_STOCK_FAIBLE = "faible";

type Props = { searchParams: Promise<{ q?: string; cat?: string; ajoute?: string; n?: string }> };

export default async function PageProduits({ searchParams }: Props) {
  const { q = "", cat = "", ajoute, n } = await searchParams;
  const limite = lireLimite(n);
  const recherche = q.trim();

  const supabase = await createClient();
  let requete = supabase
    .from("products")
    .select("id, name, category_id, selling_price, purchase_price, stock_quantity, low_stock_threshold")
    .eq("archived", false)
    .order("name");
  if (recherche) requete = requete.ilike("name", `%${echapperLike(recherche)}%`);
  if (cat && cat !== FILTRE_STOCK_FAIBLE) requete = requete.eq("category_id", cat);

  // Une ligne de plus que la limite : on sait ainsi s'il reste des produits à montrer.
  if (cat !== FILTRE_STOCK_FAIBLE) requete = requete.range(0, limite);

  const [{ data, error }, categories] = await Promise.all([requete, getCategories()]);
  if (error) throw new Error("Lecture des produits impossible : " + error.message);

  let produits: Produit[] = data;
  if (cat === FILTRE_STOCK_FAIBLE) produits = produits.filter((p) => etatStock(p) !== "ok");
  const plus = produits.length > limite;
  produits = produits.slice(0, limite);

  const lienFiltre = (valeur: string) => {
    const params = new URLSearchParams();
    if (recherche) params.set("q", recherche);
    if (valeur) params.set("cat", valeur);
    const s = params.toString();
    return s ? `/produits?${s}` : "/produits";
  };

  const filtres = [
    { valeur: "", libelle: "Tout" },
    { valeur: FILTRE_STOCK_FAIBLE, libelle: "Stock faible" },
    ...categories.map((c) => ({ valeur: c.id, libelle: c.name })),
  ];

  const aucunFiltre = !recherche && !cat;

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Produits</h1>
        <Link
          href="/produits/nouveau"
          className="flex h-11 items-center rounded-full bg-vert px-5 text-[15px] font-bold text-white hover:bg-vert-fonce"
        >
          Ajouter
        </Link>
      </header>

      {ajoute && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-vert-pale px-4 py-3 text-[15px] font-medium text-vert-fonce">
          « {ajoute} » ajouté.
          <Link href="/produits/nouveau" className="shrink-0 font-bold underline underline-offset-4">
            Ajouter un autre
          </Link>
        </p>
      )}

      <form role="search" className="flex flex-col gap-1.5">
        <label htmlFor="q" className="text-[15px] font-semibold">
          Chercher un produit
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={recherche}
            placeholder="Karité, parfum, gel…"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
          {cat && <input type="hidden" name="cat" value={cat} />}
          <button type="submit" className="h-12 rounded-2xl bg-encre px-4 font-semibold text-white">
            Chercher
          </button>
        </div>
      </form>

      <nav aria-label="Filtrer les produits" className="flex flex-wrap gap-2">
        {filtres.map((f) => {
          const actif = cat === f.valeur;
          return (
            <Link
              key={f.valeur || "tout"}
              href={lienFiltre(f.valeur)}
              aria-current={actif ? "true" : undefined}
              className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                actif ? "bg-encre text-white" : "border border-bord bg-carte text-encre"
              }`}
            >
              {f.libelle}
            </Link>
          );
        })}
      </nav>

      {produits.length === 0 ? (
        <div className="flex flex-col items-start gap-3 bord-a-bord border-y border-trait bg-carte p-5">
          <p className="text-[15px] text-sourdine">
            {aucunFiltre ? "Aucun produit pour l'instant. Ajoutez ce que vous vendez." : "Aucun produit ne correspond."}
          </p>
          {aucunFiltre && (
            <Link href="/produits/nouveau" className="font-bold text-vert underline underline-offset-4">
              Ajouter un produit
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col overflow-hidden bord-a-bord border-y border-trait bg-carte">
          {produits.map((p) => {
            const etat = etatStock(p);
            return (
              <li key={p.id} className="border-b border-trait last:border-b-0">
                <Link href={`/produits/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-fond">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-bold">{p.name}</span>
                    <span className="montant text-sm text-sourdine">{fcfa(p.selling_price)}</span>
                  </span>
                  <span
                    className={`montant shrink-0 text-sm font-semibold ${
                      etat === "epuise" ? "text-erreur" : etat === "faible" ? "text-dette" : "text-sourdine"
                    }`}
                  >
                    {etat === "epuise" ? "Épuisé" : `${entier(p.stock_quantity)} en stock`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {plus && <VoirPlus chemin="/produits" params={{ q: recherche, cat }} limite={limite} />}
    </main>
  );
}

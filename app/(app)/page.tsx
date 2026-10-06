import Link from "next/link";
import { BandeauAbonnement } from "@/components/bandeau-abonnement";
import { BanniereInstallation } from "@/components/banniere-installation";
import { getBoutique } from "@/lib/boutique";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, entier, fcfa, ilYa, joursDepuis } from "@/lib/format";
import { MOYENS_PAIEMENT, libelleMoyen } from "@/lib/ventes";

export const metadata = { title: "Accueil — Cahier Commerce" };

type TableauDeBord = {
  ventes_jour: { nombre: number; total: number };
  encaisse_jour: Record<string, number>;
  credit_jour: number;
  dettes: { total: number; clients: number; plus_ancienne: string | null };
  stock_faible_nb: number;
  stock_faible: { id: string; name: string; stock_quantity: number }[];
  derniers_paiements: { versement_id: string; created_at: string; montant: number; moyen: string; client: string | null; client_id: string | null }[];
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Dakar" });

export default async function Accueil() {
  const supabase = await createClient();
  const [boutique, { data, error }, { data: admin }] = await Promise.all([
    getBoutique(),
    supabase.rpc("tableau_de_bord").returns<TableauDeBord>(),
    supabase.rpc("est_admin").returns<boolean>(),
  ]);
  if (error || !data) throw new Error("Chargement du tableau de bord impossible.");
  const tdb = data as TableauDeBord;

  // Jour 1 = jour de création de la boutique, Jour 2 = le lendemain…
  const numeroJour = joursDepuis(boutique!.created_at) + 1;

  const encaisse = Object.values(tdb.encaisse_jour).reduce((s, m) => s + m, 0);
  const detailEncaisse = MOYENS_PAIEMENT.filter((m) => tdb.encaisse_jour[m.valeur]).map(
    (m) => `${m.libelle} ${entier(tdb.encaisse_jour[m.valeur])}`,
  );

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      {/* En-tête + chiffres du jour, d'un bord à l'autre */}
      <section aria-labelledby="titre-jour" className="bord-a-bord -mt-6 flex flex-col gap-4 bg-vert px-5 pt-6 pb-6 text-white">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm text-white/80 first-letter:uppercase">{formatDate.format(new Date())}</p>
            <h1 className="truncate text-2xl font-extrabold">{boutique!.name}</h1>
          </div>
          <Link
            href="/compte"
            aria-label="Mon compte"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 focus-visible:outline-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </Link>
        </header>

        <h2 id="titre-jour" className="sr-only">Aujourd&apos;hui</h2>
        <Link href="/ventes" className="flex flex-col rounded-xl focus-visible:outline-white">
          <span className="text-sm">Ventes du jour {numeroJour}</span>
          <span className="montant text-4xl font-extrabold">{fcfa(tdb.ventes_jour.total)}</span>
          <span className="text-sm text-white/80">
            {tdb.ventes_jour.nombre === 0
              ? "Aucune vente pour l'instant"
              : `${tdb.ventes_jour.nombre} vente${tdb.ventes_jour.nombre > 1 ? "s" : ""}`}
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white/12 p-3">
            <span className="text-sm">Argent encaissé</span>
            <span className="montant text-xl font-bold">{fcfa(encaisse)}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white/12 p-3">
            <span className="text-sm">Vendu à crédit</span>
            <span className="montant text-xl font-bold">{fcfa(tdb.credit_jour)}</span>
          </div>
        </div>
        {detailEncaisse.length > 0 && <p className="montant text-sm">{detailEncaisse.join(", ")}</p>}
      </section>

      <BandeauAbonnement boutique={boutique!} />

      {admin === true && (
        <Link href="/admin" className="flex h-12 items-center justify-center rounded-2xl border-2 border-encre bg-carte text-[15px] font-bold">
          Espace admin
        </Link>
      )}

      <BanniereInstallation />

      {/* Actions rapides (la vente se fait avec le « + » vert en bas) */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/lebalma" className="flex h-14 items-center justify-center rounded-2xl border border-trait bg-carte text-center text-[15px] font-semibold">
          Recevoir un paiement
        </Link>
        <Link href="/clients/nouveau" className="flex h-14 items-center justify-center rounded-2xl border border-trait bg-carte text-[15px] font-semibold">
          Nouveau client
        </Link>
      </div>

      {/* Lebalma */}
      <Link href="/lebalma" className="flex items-center justify-between gap-3 bord-a-bord bg-dette-pale p-5 text-dette">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Lebalma : on vous doit</span>
          <span className="montant text-3xl font-extrabold">{fcfa(tdb.dettes.total)}</span>
          <span className="text-sm">
            {tdb.dettes.clients === 0
              ? "Personne ne vous doit d'argent"
              : `${tdb.dettes.clients} client${tdb.dettes.clients > 1 ? "s" : ""}, la plus ancienne ${ilYa(tdb.dettes.plus_ancienne!)}`}
          </span>
        </span>
        <span className="shrink-0 font-bold">Voir</span>
      </Link>

      {/* Stock faible */}
      <section aria-labelledby="titre-stock" className="flex flex-col gap-3 bord-a-bord border-y border-trait bg-carte p-5">
        <div className="flex items-center justify-between">
          <h2 id="titre-stock" className="text-lg font-bold">
            Stock faible{tdb.stock_faible_nb > 0 ? ` (${tdb.stock_faible_nb})` : ""}
          </h2>
          <Link href="/produits?cat=faible" className="text-sm font-semibold text-vert">
            Voir tout
          </Link>
        </div>
        {tdb.stock_faible.length === 0 ? (
          <p className="text-[15px] text-sourdine">Aucun produit à recommander.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tdb.stock_faible.map((p) => (
              <li key={p.id}>
                <Link href={`/produits/${p.id}`} className="flex justify-between gap-3 text-[15px]">
                  <span className="truncate">{p.name}</span>
                  <span className={`montant shrink-0 font-bold ${p.stock_quantity === 0 ? "text-erreur" : "text-dette"}`}>
                    {p.stock_quantity === 0 ? "Épuisé" : `${entier(p.stock_quantity)} restant${p.stock_quantity > 1 ? "s" : ""}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Derniers paiements */}
      <section aria-labelledby="titre-paiements" className="flex flex-col gap-3 bord-a-bord border-y border-trait bg-carte p-5">
        <h2 id="titre-paiements" className="text-lg font-bold">Derniers paiements reçus</h2>
        {tdb.derniers_paiements.length === 0 ? (
          <p className="text-[15px] text-sourdine">Aucun paiement pour l&apos;instant. Ils apparaîtront ici après vos ventes.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tdb.derniers_paiements.map((p) => {
              const contenu = (
                <>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{p.client ?? "Vente au comptant"}</span>
                    <span className="text-sm text-sourdine">
                      {dateCourte(p.created_at)}, {libelleMoyen(p.moyen)}
                    </span>
                  </span>
                  <span className="montant shrink-0 font-bold text-vert">+ {fcfa(p.montant)}</span>
                </>
              );
              return (
                <li key={p.versement_id}>
                  {p.client_id ? (
                    <Link href={`/clients/${p.client_id}`} className="flex items-center justify-between gap-3">
                      {contenu}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3">{contenu}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

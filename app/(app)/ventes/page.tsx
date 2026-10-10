import Link from "next/link";
import { BadgeStatut } from "@/components/badge-statut";
import { BoutonRetour } from "@/components/bouton-retour";
import { VoirPlus } from "@/components/voir-plus";
import { aujourdhui, getBoutique } from "@/lib/boutique";
import { lireLimite } from "@/lib/constantes";
import { fcfa, joursDepuis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { StatutVente } from "@/lib/ventes";

export const metadata = { title: "Ventes — Cahier Commerce" };

type Vente = {
  id: string;
  created_at: string;
  total_amount: number;
  remaining_amount: number;
  payment_status: StatutVente;
  customers: { name: string } | null;
  sale_items: { description: string; quantity: number }[];
};

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });
const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** « 2026-10-09 » + n jours → « 2026-10-10 » (Dakar = UTC toute l'année). */
function decaler(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "passage", libelle: "Clients de passage" },
  { valeur: "client", libelle: "Avec un client" },
] as const;

type Props = { searchParams: Promise<{ n?: string; date?: string; qui?: string }> };

export default async function PageVentes({ searchParams }: Props) {
  const { n, date: dateDemandee, qui = "" } = await searchParams;
  const limite = lireLimite(n);
  const boutique = (await getBoutique())!;

  // Jour affiché : celui demandé, entre l'ouverture du cahier et aujourd'hui.
  const auj = aujourdhui();
  const premier = new Date(boutique.created_at).toISOString().slice(0, 10);
  let jourAffiche = /^\d{4}-\d{2}-\d{2}$/.test(dateDemandee ?? "") ? dateDemandee! : auj;
  if (jourAffiche > auj) jourAffiche = auj;
  if (jourAffiche < premier) jourAffiche = premier;
  const debut = `${jourAffiche}T00:00:00Z`;
  const fin = `${decaler(jourAffiche, 1)}T00:00:00Z`;
  const numeroJour = joursDepuis(boutique.created_at, new Date(debut)) + 1;
  const estAujourdhui = jourAffiche === auj;

  const supabase = await createClient();
  let requete = supabase
    .from("sales")
    .select("id, created_at, total_amount, remaining_amount, payment_status, customers(name), sale_items(description, quantity)")
    .gte("created_at", debut)
    .lt("created_at", fin)
    .order("created_at", { ascending: false });
  if (qui === "passage") requete = requete.is("customer_id", null);
  if (qui === "client") requete = requete.not("customer_id", "is", null);

  const [{ data: totaux }, { data, error }] = await Promise.all([
    supabase.from("sales").select("total_amount").gte("created_at", debut).lt("created_at", fin).returns<{ total_amount: number }[]>(),
    requete.range(0, limite).returns<Vente[]>(),
  ]);
  if (error) throw new Error("Lecture des ventes impossible : " + error.message);

  const tous = totaux ?? [];
  const total = tous.reduce((s, v) => s + v.total_amount, 0);
  const plus = data.length > limite;
  const ventes = data.slice(0, limite);

  const lien = (jour: string, filtre = qui) => {
    const p = new URLSearchParams();
    if (jour !== auj) p.set("date", jour);
    if (filtre) p.set("qui", filtre);
    return p.size ? `/ventes?${p}` : "/ventes";
  };
  const titreDate = estAujourdhui ? "Aujourd'hui" : jourAffiche === decaler(auj, -1) ? "Hier" : dateLongue.format(new Date(debut));

  const fleche = "flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte";

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href={estAujourdhui ? "/" : "/journees"} libelle="Retour" />
        <h1 className="text-xl font-extrabold">Ventes</h1>
      </header>

      {/* Choix du jour */}
      <nav aria-label="Changer de jour" className="flex items-center justify-between gap-3">
        {jourAffiche > premier ? (
          <Link href={lien(decaler(jourAffiche, -1))} aria-label="Jour précédent" className={fleche} scroll={false}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        ) : (
          <span className="size-11 shrink-0" />
        )}
        <div className="flex flex-col items-center text-center">
          <span className="text-lg font-extrabold">Jour {numeroJour}</span>
          <span className="text-sm text-sourdine first-letter:uppercase">{titreDate}</span>
        </div>
        {!estAujourdhui ? (
          <Link href={lien(decaler(jourAffiche, 1))} aria-label="Jour suivant" className={fleche} scroll={false}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span className="size-11 shrink-0" />
        )}
      </nav>

      <section className="bord-a-bord flex flex-col gap-0.5 bg-vert px-5 py-4 text-white">
        <span className="text-sm">Total vendu</span>
        <span className="montant text-3xl font-extrabold">{fcfa(total)}</span>
        <span className="text-sm text-white/85">
          {tous.length === 0 ? "Aucune vente" : `${tous.length} vente${tous.length > 1 ? "s" : ""}`}
        </span>
      </section>

      <nav aria-label="Filtrer les ventes" className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur || "toutes"}
            href={lien(jourAffiche, f.valeur)}
            aria-current={qui === f.valeur ? "true" : undefined}
            scroll={false}
            className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
              qui === f.valeur ? "bg-encre text-white" : "border border-bord bg-carte"
            }`}
          >
            {f.libelle}
          </Link>
        ))}
      </nav>

      {ventes.length === 0 ? (
        <div className="bord-a-bord flex flex-col items-start gap-2 border-y border-trait bg-carte p-5">
          <p className="text-[15px] text-sourdine">{qui ? "Aucune vente de ce type ce jour-là." : "Aucune vente ce jour-là."}</p>
          {estAujourdhui && (
            <Link href="/vendre" className="font-bold text-vert underline underline-offset-4">
              Faire une vente
            </Link>
          )}
        </div>
      ) : (
        <ul className="bord-a-bord flex flex-col overflow-hidden border-y border-trait bg-carte">
          {ventes.map((v) => {
            const articles = v.sale_items.map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.description}` : i.description)).join(", ");
            return (
              <li key={v.id} className="border-b border-trait last:border-b-0">
                <Link href={`/ventes/${v.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-fond">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-bold">
                      {heure.format(new Date(v.created_at))}, {v.customers?.name ?? <span className="text-sourdine">Client de passage</span>}
                    </span>
                    <span className="truncate text-sm text-sourdine">{articles}</span>
                    <BadgeStatut statut={v.payment_status} />
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="montant font-bold">{fcfa(v.total_amount)}</span>
                    {v.remaining_amount > 0 && <span className="montant text-sm font-semibold text-dette">reste {fcfa(v.remaining_amount)}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {plus && <VoirPlus chemin="/ventes" params={{ date: estAujourdhui ? undefined : jourAffiche, qui }} limite={limite} />}

      <Link href="/journees" className="self-center py-2 text-[15px] font-semibold text-vert">
        Voir toutes mes journées
      </Link>
    </main>
  );
}

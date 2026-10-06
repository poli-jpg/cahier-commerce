import Link from "next/link";
import { BadgeStatut } from "@/components/badge-statut";
import { createClient } from "@/lib/supabase/server";
import { dateJour, echapperLike, fcfa, ilYa } from "@/lib/format";
import type { StatutVente } from "@/lib/ventes";

export const metadata = { title: "Lebalma — Cahier Commerce" };

type VenteDue = {
  created_at: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  customers: { id: string; name: string } | null;
};

type Dette = {
  clientId: string;
  nom: string;
  reste: number;
  total: number;
  depuis: string; // achat non soldé le plus ancien
  statut: StatutVente;
};

type Props = { searchParams: Promise<{ q?: string; statut?: string }> };

const FILTRES = [
  { valeur: "", libelle: "Tous" },
  { valeur: "partiel", libelle: "Partiel" },
  { valeur: "en_dette", libelle: "En dette" },
];

export default async function PageLebalma({ searchParams }: Props) {
  const { q = "", statut = "" } = await searchParams;
  const recherche = q.trim();

  const supabase = await createClient();
  let requete = supabase
    .from("sales")
    .select("created_at, total_amount, paid_amount, remaining_amount, customers!inner(id, name)")
    .gt("remaining_amount", 0)
    .order("created_at");
  if (recherche) requete = requete.ilike("customers.name", `%${echapperLike(recherche)}%`);

  const { data, error } = await requete.returns<VenteDue[]>();
  if (error) throw new Error("Lecture du Lebalma impossible : " + error.message);

  // Regroupe les achats non soldés par client.
  const parClient = new Map<string, Dette & { paye: number }>();
  for (const v of data) {
    if (!v.customers) continue;
    const d = parClient.get(v.customers.id) ?? {
      clientId: v.customers.id,
      nom: v.customers.name,
      reste: 0,
      total: 0,
      paye: 0,
      depuis: v.created_at,
      statut: "en_dette" as StatutVente,
    };
    d.reste += v.remaining_amount;
    d.total += v.total_amount;
    d.paye += v.paid_amount;
    if (v.created_at < d.depuis) d.depuis = v.created_at;
    parClient.set(v.customers.id, d);
  }

  const toutes = [...parClient.values()]
    .map((d) => ({ ...d, statut: (d.paye > 0 ? "partiel" : "en_dette") as StatutVente }))
    .sort((a, b) => a.depuis.localeCompare(b.depuis)); // les plus anciennes d'abord

  const dettes = statut ? toutes.filter((d) => d.statut === statut) : toutes;
  const totalDu = toutes.reduce((s, d) => s + d.reste, 0);

  const lien = (valeur: string) => {
    const p = new URLSearchParams();
    if (recherche) p.set("q", recherche);
    if (valeur) p.set("statut", valeur);
    return p.size ? `/lebalma?${p}` : "/lebalma";
  };

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <h1 className="text-2xl font-extrabold">Lebalma</h1>

      <section className="flex flex-col gap-0.5 bord-a-bord bg-dette-pale p-5 text-dette">
        <h2 className="text-[15px] font-semibold">{recherche ? "Total pour cette recherche" : "Total qu'on vous doit"}</h2>
        <p className="montant text-4xl font-extrabold">{fcfa(totalDu)}</p>
        <p className="text-sm">
          {toutes.length} client{toutes.length > 1 ? "s" : ""}
        </p>
      </section>

      <form role="search" className="flex flex-col gap-1.5">
        <label htmlFor="q" className="text-[15px] font-semibold">
          Chercher un client
        </label>
        <div className="flex gap-2">
          <input id="q" name="q" type="search" defaultValue={recherche} placeholder="Nom du client" className="h-12 min-w-0 flex-1 rounded-2xl border border-bord bg-carte px-4 text-base" />
          {statut && <input type="hidden" name="statut" value={statut} />}
          <button type="submit" className="h-12 rounded-2xl bg-encre px-4 font-semibold text-white">
            Chercher
          </button>
        </div>
      </form>

      <nav aria-label="Filtrer les dettes" className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur || "tous"}
            href={lien(f.valeur)}
            aria-current={statut === f.valeur ? "true" : undefined}
            className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
              statut === f.valeur ? "bg-encre text-white" : "border border-bord bg-carte"
            }`}
          >
            {f.libelle}
          </Link>
        ))}
      </nav>

      {dettes.length === 0 ? (
        <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">
          {toutes.length === 0 && !recherche ? "Personne ne vous doit d'argent." : "Aucune dette ne correspond."}
        </p>
      ) : (
        <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
          {dettes.map((d) => (
            <li key={d.clientId} className="border-b border-trait last:border-b-0">
              <Link href={`/clients/${d.clientId}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-fond">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-lg font-bold">{d.nom}</span>
                  <span className="text-sm text-sourdine">
                    Depuis le {dateJour(d.depuis)}, {ilYa(d.depuis)}
                  </span>
                  <BadgeStatut statut={d.statut} />
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="montant text-xl font-extrabold text-dette">{fcfa(d.reste)}</span>
                  <span className="montant text-xs text-sourdine">sur {fcfa(d.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {dettes.length > 1 && <p className="text-center text-sm text-sourdine">Les plus anciennes d&apos;abord</p>}
    </main>
  );
}

import Link from "next/link";
import { BadgeStatut } from "@/components/badge-statut";
import { VoirPlus } from "@/components/voir-plus";
import { lireLimite } from "@/lib/constantes";
import { BoutonRetour } from "@/components/bouton-retour";
import { createClient } from "@/lib/supabase/server";
import { fcfa } from "@/lib/format";
import type { StatutVente } from "@/lib/ventes";

export const metadata = { title: "Ventes du jour — Cahier Commerce" };

type VenteJour = {
  id: string;
  created_at: string;
  total_amount: number;
  remaining_amount: number;
  payment_status: StatutVente;
  customers: { name: string } | null;
  sale_items: { description: string; quantity: number }[];
};

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });

/** Minuit à Dakar (UTC+0 toute l'année, pas d'heure d'été). */
function debutDuJour() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export default async function PageVentesDuJour({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const limite = lireLimite((await searchParams).n);
  const supabase = await createClient();
  // Le total du jour porte sur toutes les ventes ; la liste n'en montre que « limite ».
  const { data: totaux } = await supabase
    .from("sales")
    .select("total_amount")
    .gte("created_at", debutDuJour())
    .returns<{ total_amount: number }[]>();
  const { data, error } = await supabase
    .from("sales")
    .select("id, created_at, total_amount, remaining_amount, payment_status, customers(name), sale_items(description, quantity)")
    .gte("created_at", debutDuJour())
    .order("created_at", { ascending: false })
    .range(0, limite)
    .returns<VenteJour[]>();
  if (error) throw new Error("Lecture des ventes impossible : " + error.message);

  const tous = totaux ?? [];
  const total = tous.reduce((s, v) => s + v.total_amount, 0);
  const plus = data.length > limite;
  const ventes = data.slice(0, limite);

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/" libelle="Retour à l'accueil" />
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold">Ventes du jour</h1>
          <p className="montant text-sm text-sourdine">
            {tous.length} vente{tous.length > 1 ? "s" : ""}, {fcfa(total)}
          </p>
        </div>
      </header>

      {ventes.length === 0 ? (
        <div className="flex flex-col items-start gap-2 bord-a-bord border-y border-trait bg-carte p-5">
          <p className="text-[15px] text-sourdine">Aucune vente aujourd&apos;hui.</p>
          <Link href="/vendre" className="font-bold text-vert underline underline-offset-4">
            Faire une vente
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col overflow-hidden bord-a-bord border-y border-trait bg-carte">
          {ventes.map((v) => {
            const articles = v.sale_items.map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.description}` : i.description)).join(", ");
            return (
              <li key={v.id} className="border-b border-trait last:border-b-0">
                <Link href={`/ventes/${v.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-fond">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-bold">
                      {heure.format(new Date(v.created_at))}, {v.customers?.name ?? "comptant"}
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

      {plus && <VoirPlus chemin="/ventes" params={{}} limite={limite} />}
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStatut } from "@/components/badge-statut";
import { BoutonRetour } from "@/components/bouton-retour";
import { createClient } from "@/lib/supabase/server";
import { dateCourte, entier, fcfa } from "@/lib/format";
import { libelleMoyen, type StatutVente } from "@/lib/ventes";

export const metadata = { title: "Vente — Cahier Commerce" };

type Vente = {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: StatutVente;
  customers: { id: string; name: string } | null;
  sale_items: { id: string; description: string; quantity: number; unit_price: number; subtotal: number }[];
  payments: { id: string; amount: number; payment_method: string; created_at: string; cancelled_at: string | null }[];
};

export default async function PageVente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: vente } = await supabase
    .from("sales")
    .select(
      "id, created_at, total_amount, paid_amount, remaining_amount, payment_status, customers(id, name), sale_items(id, description, quantity, unit_price, subtotal), payments(id, amount, payment_method, created_at, cancelled_at)",
    )
    .eq("id", id)
    .maybeSingle<Vente>();

  if (!vente) notFound();

  const client = vente.customers;
  const paiements = [...vente.payments].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href={client ? `/clients/${client.id}` : "/ventes"} libelle="Retour" />
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold">Vente enregistrée</h1>
          <p className="text-sm text-sourdine">{dateCourte(vente.created_at)}</p>
        </div>
      </header>

      <section className={`flex flex-col gap-2 bord-a-bord p-5 ${vente.remaining_amount > 0 ? "bg-dette-pale text-dette" : "bg-vert-pale text-vert-fonce"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">{vente.remaining_amount > 0 ? "Reste à payer" : "Payée entièrement"}</span>
          <BadgeStatut statut={vente.payment_status} />
        </div>
        <p className="montant text-4xl font-extrabold">{fcfa(vente.remaining_amount > 0 ? vente.remaining_amount : vente.total_amount)}</p>
        {client ? (
          <Link href={`/clients/${client.id}`} className="font-bold underline underline-offset-4">
            {client.name}
          </Link>
        ) : (
          <span className="font-semibold">Client de passage</span>
        )}
      </section>

      <section aria-labelledby="titre-articles" className="flex flex-col gap-3 bord-a-bord border-y border-trait bg-carte p-5">
        <h2 id="titre-articles" className="text-lg font-bold">Articles</h2>
        {vente.sale_items.map((l) => (
          <div key={l.id} className="flex items-start justify-between gap-3 text-[15px]">
            <span>
              {l.quantity} × {l.description}
              <span className="montant block text-sm text-sourdine">{entier(l.unit_price)} F l&apos;unité</span>
            </span>
            <span className="montant shrink-0 font-semibold">{fcfa(l.subtotal)}</span>
          </div>
        ))}
        <dl className="flex flex-col gap-1 border-t border-trait pt-3 text-[15px]">
          <div className="flex justify-between"><dt className="font-bold">Total</dt><dd className="montant font-extrabold">{fcfa(vente.total_amount)}</dd></div>
          <div className="flex justify-between"><dt>Payé</dt><dd className="montant">{fcfa(vente.paid_amount)}</dd></div>
          <div className="flex justify-between"><dt>Reste</dt><dd className={`montant font-bold ${vente.remaining_amount > 0 ? "text-dette" : ""}`}>{fcfa(vente.remaining_amount)}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="titre-paiements" className="flex flex-col gap-3 bord-a-bord border-y border-trait bg-carte p-5">
        <h2 id="titre-paiements" className="text-lg font-bold">Paiements</h2>
        {paiements.length ? (
          paiements.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className={`font-semibold ${p.cancelled_at ? "text-sourdine line-through" : ""}`}>
                  {libelleMoyen(p.payment_method)}
                  {p.cancelled_at ? " (annulé)" : ""}
                </span>
                <span className="text-sm text-sourdine">{dateCourte(p.created_at)}</span>
              </span>
              <span className={`montant font-bold ${p.cancelled_at ? "text-sourdine line-through" : "text-vert"}`}>+ {fcfa(p.amount)}</span>
            </div>
          ))
        ) : (
          <p className="text-[15px] text-sourdine">Aucun paiement pour l&apos;instant.</p>
        )}
      </section>

      {client && vente.remaining_amount > 0 && (
        <Link
          href={`/clients/${client.id}/paiement`}
          className="flex h-14 items-center justify-center rounded-2xl border-2 border-vert bg-carte text-lg font-bold text-vert"
        >
          Enregistrer un paiement
        </Link>
      )}

      <Link href="/vendre" className="flex h-14 items-center justify-center rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce">
        Nouvelle vente
      </Link>
    </main>
  );
}

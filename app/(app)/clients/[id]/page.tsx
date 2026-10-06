import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStatut } from "@/components/badge-statut";
import { BoutonRetour } from "@/components/bouton-retour";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";
import { dateCourte, fcfa } from "@/lib/format";
import { libelleMoyen, type StatutVente } from "@/lib/ventes";
import { formaterTelephone } from "@/lib/telephone";
import { archiverClient, modifierClient } from "../actions";
import { FormulaireClient } from "../formulaire-client";
import { AnnulerVersement } from "./annuler-versement";
import { annulerVersement } from "./paiement/actions";

export const metadata = { title: "Client — Cahier Commerce" };

type Achat = {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: StatutVente;
};

type Paiement = {
  versement_id: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

type Versement = Omit<Paiement, "amount"> & { montant: number };

const moisAnnee = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Africa/Dakar" });

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ paye?: string }> };

export default async function PageClient({ params, searchParams }: Props) {
  const { id } = await params;
  const { paye } = await searchParams;
  const supabase = await createClient();
  const [{ data: client }, { data: achats }, { data: paiements }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, address, created_at")
      .eq("id", id)
      .eq("archived", false)
      .maybeSingle<Client>(),
    supabase
      .from("sales")
      .select("id, created_at, total_amount, paid_amount, remaining_amount, payment_status")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .returns<Achat[]>(),
    supabase
      .from("payments")
      .select("versement_id, amount, payment_method, note, created_at, cancelled_at, cancel_reason")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Paiement[]>(),
  ]);

  if (!client) notFound();

  const ventes = achats ?? [];
  const dette = ventes.reduce((s, v) => s + v.remaining_amount, 0);
  const totalAchete = ventes.reduce((s, v) => s + v.total_amount, 0);

  // Un versement peut couvrir plusieurs achats : on additionne ses parts.
  const versements = new Map<string, Versement>();
  for (const p of paiements ?? []) {
    const v = versements.get(p.versement_id);
    if (v) v.montant += p.amount;
    else versements.set(p.versement_id, { ...p, montant: p.amount });
  }

  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/clients" libelle="Retour aux clients" />
        <h1 className="sr-only">{client.name}</h1>
      </header>

      {paye && (
        <p role="status" className="montant rounded-2xl bg-vert-pale px-4 py-3 text-[15px] font-semibold text-vert-fonce">
          Paiement de {fcfa(Number(paye) || 0)} enregistré.
        </p>
      )}

      <section className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-encre text-2xl font-extrabold text-white">
          {client.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-2xl font-extrabold">{client.name}</p>
          <p className="montant truncate text-sm text-sourdine">
            {[client.phone && formaterTelephone(client.phone), client.address].filter(Boolean).join(", ") || "Pas de numéro"}
          </p>
        </div>
        {client.phone && (
          <a
            href={`tel:+221${client.phone}`}
            aria-label={`Appeler ${client.name}`}
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-vert-pale text-vert"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </svg>
          </a>
        )}
      </section>

      <section className={`flex flex-col gap-1 rounded-3xl p-5 ${dette > 0 ? "bg-dette-pale text-dette" : "bg-vert-pale text-vert-fonce"}`}>
        <h2 className="text-[15px] font-semibold">{dette > 0 ? `${client.name} vous doit` : "Ne doit rien"}</h2>
        <p className="montant text-4xl font-extrabold">{fcfa(dette)}</p>
        <p className="montant text-sm">
          Total acheté : {fcfa(totalAchete)}. Client depuis {moisAnnee.format(new Date(client.created_at))}.
        </p>
        {dette > 0 && (
          <Link
            href={`/clients/${client.id}/paiement`}
            className="mt-3 flex h-14 items-center justify-center rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce"
          >
            Enregistrer un paiement
          </Link>
        )}
      </section>

      <section aria-labelledby="titre-achats" className="flex flex-col gap-3 rounded-3xl bg-carte p-5">
        <h2 id="titre-achats" className="text-lg font-bold">Achats</h2>
        {ventes.length ? (
          <ul className="flex flex-col">
            {ventes.map((v) => (
              <li key={v.id} className="border-b border-trait last:border-b-0">
                <Link href={`/ventes/${v.id}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">Vente du {dateCourte(v.created_at)}</span>
                    <BadgeStatut statut={v.payment_status} />
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="montant font-bold">{fcfa(v.total_amount)}</span>
                    {v.remaining_amount > 0 && <span className="montant text-sm font-semibold text-dette">reste {fcfa(v.remaining_amount)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-sourdine">Aucun achat enregistré.</p>
        )}
      </section>

      <section aria-labelledby="titre-paiements" className="flex flex-col gap-3 rounded-3xl bg-carte p-5">
        <h2 id="titre-paiements" className="text-lg font-bold">Paiements reçus</h2>
        {versements.size ? (
          <ul className="flex flex-col">
            {[...versements.entries()].map(([vid, v]) => (
              <li key={vid} className="flex flex-col gap-2 border-b border-trait py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className={`font-semibold ${v.cancelled_at ? "text-sourdine line-through" : ""}`}>{libelleMoyen(v.payment_method)}</span>
                    <span className="truncate text-sm text-sourdine">
                      {dateCourte(v.created_at)}
                      {v.note ? `, ${v.note}` : ""}
                    </span>
                  </span>
                  <span className={`montant shrink-0 font-bold ${v.cancelled_at ? "text-sourdine line-through" : "text-vert"}`}>+ {fcfa(v.montant)}</span>
                </div>
                {v.cancelled_at ? (
                  <p className="text-sm text-erreur">
                    Annulé le {dateCourte(v.cancelled_at)} : {v.cancel_reason}
                  </p>
                ) : (
                  <AnnulerVersement action={annulerVersement.bind(null, client.id, vid)} />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-sourdine">Aucun paiement reçu.</p>
        )}
      </section>

      <section aria-labelledby="titre-infos" className="flex flex-col gap-4">
        <h2 id="titre-infos" className="text-lg font-bold">Informations</h2>
        <FormulaireClient action={modifierClient.bind(null, client.id)} client={client} />
      </section>

      {dette > 0 ? (
        <p className="border-t border-trait pt-5 text-sm text-sourdine">
          Ce client ne peut pas être retiré tant qu&apos;il a une dette.
        </p>
      ) : (
        <form action={archiverClient.bind(null, client.id)} className="flex flex-col gap-2 border-t border-trait pt-5">
          <p className="text-sm text-sourdine">Client créé par erreur ou en double ? Retirez-le de la liste.</p>
          <button type="submit" className="h-12 rounded-2xl border border-bord bg-carte font-semibold text-erreur">
            Retirer ce client
          </button>
        </form>
      )}
    </main>
  );
}

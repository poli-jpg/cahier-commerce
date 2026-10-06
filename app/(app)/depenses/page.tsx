import Link from "next/link";
import { BoutonRetour } from "@/components/bouton-retour";
import { VoirPlus } from "@/components/voir-plus";
import { lireLimite } from "@/lib/constantes";
import { libelleCategorie } from "@/lib/depenses";
import { dateCourte, fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { libelleMoyen } from "@/lib/ventes";
import { annulerDepense } from "./actions";
import { AnnulerDepense } from "./annuler-depense";

export const metadata = { title: "Dépenses — Cahier Commerce" };

type Depense = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  payment_method: string;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

/** Minuit à Dakar (UTC toute l'année). */
function debutDuJour() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

type Props = { searchParams: Promise<{ n?: string; ajoutee?: string }> };

export default async function PageDepenses({ searchParams }: Props) {
  const { n, ajoutee } = await searchParams;
  const limite = lireLimite(n);
  const supabase = await createClient();

  const [{ data: aujourdhui }, { data, error }] = await Promise.all([
    supabase.from("expenses").select("amount").gte("created_at", debutDuJour()).is("cancelled_at", null).returns<{ amount: number }[]>(),
    supabase
      .from("expenses")
      .select("id, amount, category, note, payment_method, created_at, cancelled_at, cancel_reason")
      .order("created_at", { ascending: false })
      .range(0, limite)
      .returns<Depense[]>(),
  ]);
  if (error) throw new Error("Lecture des dépenses impossible : " + error.message);

  const totalJour = (aujourdhui ?? []).reduce((s, d) => s + d.amount, 0);
  const plus = data.length > limite;
  const depenses = data.slice(0, limite);

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/" libelle="Retour à l'accueil" />
        <h1 className="text-2xl font-extrabold">Dépenses</h1>
      </header>

      {ajoutee && (
        <p role="status" className="montant rounded-2xl bg-vert-pale px-4 py-3 text-[15px] font-semibold text-vert-fonce">
          Dépense de {fcfa(Number(ajoutee) || 0)} enregistrée.
        </p>
      )}

      <section className="bord-a-bord flex flex-col gap-0.5 border-y border-trait bg-carte p-5">
        <h2 className="text-[15px] font-semibold text-sourdine">Dépensé aujourd&apos;hui</h2>
        <p className="montant text-4xl font-extrabold">{fcfa(totalJour)}</p>
      </section>

      <Link href="/depenses/nouvelle" className="flex h-14 items-center justify-center rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce">
        Ajouter une dépense
      </Link>

      {depenses.length === 0 ? (
        <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">Aucune dépense enregistrée.</p>
      ) : (
        <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
          {depenses.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 border-b border-trait px-5 py-3.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className={`font-bold ${d.cancelled_at ? "text-sourdine line-through" : ""}`}>{libelleCategorie(d.category)}</span>
                  <span className="truncate text-sm text-sourdine">
                    {dateCourte(d.created_at)}, {libelleMoyen(d.payment_method)}
                    {d.note ? `, ${d.note}` : ""}
                  </span>
                </span>
                <span className={`montant shrink-0 font-bold ${d.cancelled_at ? "text-sourdine line-through" : "text-dette"}`}>− {fcfa(d.amount)}</span>
              </div>
              {d.cancelled_at ? (
                <p className="text-sm text-erreur">
                  Annulée le {dateCourte(d.cancelled_at)} : {d.cancel_reason}
                </p>
              ) : (
                <AnnulerDepense action={annulerDepense.bind(null, d.id)} />
              )}
            </li>
          ))}
        </ul>
      )}

      {plus && <VoirPlus chemin="/depenses" params={{}} limite={limite} />}
    </main>
  );
}

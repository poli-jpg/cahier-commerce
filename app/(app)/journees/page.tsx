import Link from "next/link";
import { BoutonRetour } from "@/components/bouton-retour";
import { VoirPlus } from "@/components/voir-plus";
import { lireLimite } from "@/lib/constantes";
import { entier, fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mes journées — Cahier Commerce" };

type Journee = {
  jour: number;
  date: string; // AAAA-MM-JJ
  ventes: number;
  montant: number;
  encaisse: number;
  depenses: number;
  credit: number;
};

const dateJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function libelleDate(date: string, i: number) {
  if (i === 0) return "Aujourd'hui";
  if (i === 1) return "Hier";
  const t = dateJour.format(new Date(date));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function PageJournees({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const limite = lireLimite((await searchParams).n);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mes_journees").returns<Journee[]>();
  if (error) throw new Error("Lecture de l'historique impossible : " + error.message);

  const journees = data as Journee[];
  const affichees = journees.slice(0, limite);

  // Repères sur les 7 derniers jours (aujourd'hui compris)
  const semaine = journees.slice(0, 7);
  const totalSemaine = semaine.reduce((s, j) => s + j.montant, 0);
  const meilleure = journees.reduce<Journee | null>((m, j) => (j.montant > (m?.montant ?? 0) ? j : m), null);

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/compte" libelle="Retour à Mon compte" />
        <h1 className="text-2xl font-extrabold">Mes journées</h1>
      </header>

      <section className="bord-a-bord -mt-1 flex flex-col gap-3 bg-vert px-5 py-5 text-white">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{semaine.length < 7 ? `Vendu depuis le début (${semaine.length} jour${semaine.length > 1 ? "s" : ""})` : "Vendu ces 7 derniers jours"}</span>
          <span className="montant text-4xl font-extrabold">{fcfa(totalSemaine)}</span>
        </div>
        {meilleure && (
          <p className="text-sm text-white/85">
            Meilleure journée : Jour {meilleure.jour}, {fcfa(meilleure.montant)}
          </p>
        )}
      </section>

      <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
        {affichees.map((j, i) => {
          const reste = j.encaisse - j.depenses;
          return (
            <li key={j.date} className="flex flex-col gap-2 border-b border-trait px-5 py-4 last:border-b-0">
              <Link href={i === 0 ? "/ventes" : `/ventes?date=${j.date}`} className="flex items-baseline justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold">Jour {j.jour}</span>
                  <span className="text-sm text-sourdine">{libelleDate(j.date, i)}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="montant text-2xl font-extrabold">{fcfa(j.montant)}</span>
                  <span className="text-sm text-sourdine">
                    {j.ventes === 0 ? "aucune vente" : `${entier(j.ventes)} vente${j.ventes > 1 ? "s" : ""} ›`}
                  </span>
                </span>
              </Link>

              {(j.montant > 0 || j.encaisse > 0 || j.depenses > 0) && (
                <dl className="montant grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-fond px-3 py-2.5 text-sm">
                  <dt className="text-sourdine">Argent encaissé</dt>
                  <dd className="text-right font-semibold">{fcfa(j.encaisse)}</dd>
                  <dt className="text-sourdine">Vendu à crédit</dt>
                  <dd className={`text-right font-semibold ${j.credit > 0 ? "text-dette" : ""}`}>{fcfa(j.credit)}</dd>
                  <dt className="text-sourdine">Dépenses</dt>
                  <dd className="text-right font-semibold">{j.depenses > 0 ? `− ${fcfa(j.depenses)}` : fcfa(0)}</dd>
                  <dt className="border-t border-trait pt-1 font-bold">Reste en caisse</dt>
                  <dd className={`border-t border-trait pt-1 text-right font-extrabold ${reste < 0 ? "text-erreur" : "text-vert-fonce"}`}>
                    {reste < 0 ? `− ${fcfa(-reste)}` : fcfa(reste)}
                  </dd>
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      {journees.length > limite && <VoirPlus chemin="/journees" params={{}} limite={limite} />}

      <p className="text-center text-sm text-sourdine">Touchez un jour pour voir le détail de ses ventes. Jour 1 = le jour où vous avez ouvert votre cahier.</p>
    </main>
  );
}

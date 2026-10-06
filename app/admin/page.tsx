import Link from "next/link";
import { notFound } from "next/navigation";
import { IconeWhatsApp } from "@/components/bouton-whatsapp";
import { joursRestants, type StatutCompte } from "@/lib/boutique";
import { lienWhatsApp } from "@/lib/contact";
import { TYPES_BOUTIQUE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import { fcfa, ilYa, joursDepuis } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";
import { prolongerBoutique, refuserBoutique, suspendreBoutique, validerBoutique } from "./actions";
import { BoutonAction } from "./bouton-action";

export const metadata = { title: "Espace admin — Cahier Commerce" };
export const dynamic = "force-dynamic";

type BoutiqueAdmin = {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string;
  cree_le: string;
  statut_compte: StatutCompte;
  abonnement_jusqu_au: string | null;
  ventes_7j: number;
  montant_7j: number;
  derniere_vente: string | null;
  nb_produits: number;
  nb_clients: number;
  par_jour: { jour: number; date: string; ventes: number; montant: number }[]; // le plus récent d'abord
};

type Etat = "a_valider" | "active" | "bientot" | "expiree" | "refusee";

function etatDe(b: BoutiqueAdmin): Etat {
  if (b.statut_compte === "en_attente") return "a_valider";
  if (b.statut_compte === "refuse") return "refusee";
  const j = joursRestants(b.abonnement_jusqu_au);
  if (j < 0) return "expiree";
  if (j <= 5) return "bientot";
  return "active";
}

const ETATS: { valeur: Etat; libelle: string; badge: string }[] = [
  { valeur: "a_valider", libelle: "À valider", badge: "bg-dette-pale text-dette" },
  { valeur: "bientot", libelle: "Bientôt finies", badge: "bg-dette-pale text-dette" },
  { valeur: "expiree", libelle: "Expirées", badge: "bg-erreur-pale text-erreur" },
  { valeur: "active", libelle: "Actives", badge: "bg-vert-pale text-vert-fonce" },
  { valeur: "refusee", libelle: "Refusées", badge: "bg-trait text-encre" },
];

const jourSemaine = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const libelleType = (t: string) => TYPES_BOUTIQUE.find((x) => x.valeur === t)?.libelle ?? t;

// Boutique inscrite il y a moins de 7 jours : on compte depuis son inscription.
const periode = (creeLe: string) =>
  joursDepuis(creeLe) < 7 ? `Depuis l'inscription (${ilYa(creeLe)})` : "7 derniers jours";

function ligneAbonnement(b: BoutiqueAdmin, etat: Etat) {
  if (etat === "a_valider") return `Inscrite ${ilYa(b.cree_le)}`;
  if (etat === "refusee") return "Compte refusé";
  const fin = dateCourte.format(new Date(b.abonnement_jusqu_au!));
  const j = joursRestants(b.abonnement_jusqu_au);
  if (etat === "expiree") return `Expirée depuis le ${fin}`;
  return `Jusqu'au ${fin} (${j === 0 ? "dernier jour" : `${j} j`})`;
}

export default async function PageAdmin({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre = "" } = await searchParams;
  const supabase = await createClient();

  const { data: estAdmin } = await supabase.rpc("est_admin").returns<boolean>();
  if (estAdmin !== true) notFound(); // la page n'existe pas pour les autres

  const { data, error } = await supabase.rpc("admin_boutiques").returns<BoutiqueAdmin[]>();
  if (error) throw new Error("Lecture des boutiques impossible.");
  // par_jour ?? [] : la page fonctionne même si la migration 0008 n'est pas encore passée.
  const boutiques = (data as BoutiqueAdmin[]).map((b) => ({ ...b, par_jour: b.par_jour ?? [], etat: etatDe(b) }));

  const compte = (e: Etat) => boutiques.filter((b) => b.etat === e).length;
  const affichees = filtre ? boutiques.filter((b) => b.etat === filtre) : boutiques;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Retour" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold">Espace admin</h1>
          <p className="text-sm text-sourdine">
            {boutiques.length} boutique{boutiques.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <nav aria-label="Filtrer les boutiques" className="flex flex-wrap gap-2">
        {[{ valeur: "", libelle: "Toutes", n: boutiques.length }, ...ETATS.map((e) => ({ ...e, n: compte(e.valeur) }))].map((f) => (
          <Link
            key={f.valeur || "toutes"}
            href={f.valeur ? `/admin?filtre=${f.valeur}` : "/admin"}
            aria-current={filtre === f.valeur ? "true" : undefined}
            className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
              filtre === f.valeur ? "bg-encre text-white" : "border border-bord bg-carte"
            } ${f.valeur === "a_valider" && f.n > 0 && filtre !== f.valeur ? "border-2 border-dette text-dette" : ""}`}
          >
            {f.libelle} ({f.n})
          </Link>
        ))}
      </nav>

      {affichees.length === 0 ? (
        <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">Aucune boutique ici.</p>
      ) : (
        <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
          {affichees.map((b) => {
            const style = ETATS.find((e) => e.valeur === b.etat)!;
            const messageWhatsApp =
              b.etat === "a_valider" || b.statut_compte === "valide"
                ? `Bonjour, ici Cahier Commerce. Votre boutique « ${b.nom} » `
                : `Bonjour, ici Cahier Commerce, au sujet de votre boutique « ${b.nom} ». `;
            return (
              <li key={b.id} className="flex flex-col gap-3 border-b border-trait px-5 py-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-lg font-bold">{b.nom}</span>
                    <span className="truncate text-sm text-sourdine">
                      {libelleType(b.type)}, {b.email}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-extrabold ${style.badge}`}>{style.libelle}</span>
                </div>

                <p className="text-[15px] font-semibold">{ligneAbonnement(b, b.etat)}</p>

                {b.statut_compte === "valide" && (
                  <p className="montant text-sm text-sourdine">
                    {periode(b.cree_le)} : {b.ventes_7j} vente{b.ventes_7j > 1 ? "s" : ""}, {fcfa(b.montant_7j)}. {b.nb_produits} produits,{" "}
                    {b.nb_clients} clients.{b.derniere_vente ? ` Dernière vente ${ilYa(b.derniere_vente)}.` : " Aucune vente."}
                  </p>
                )}

                {b.statut_compte === "valide" && b.par_jour.length > 0 && (
                  <details className="rounded-xl bg-fond px-3 py-2" open={b.par_jour.length <= 7}>
                    <summary className="cursor-pointer py-1 text-sm font-semibold">
                      Jour par jour ({b.par_jour.length} jour{b.par_jour.length > 1 ? "s" : ""})
                    </summary>
                    <ul className="flex flex-col pt-1">
                      {b.par_jour.map((j, i) => (
                        <li key={j.date} className="flex items-baseline justify-between gap-3 border-t border-trait py-1.5 text-sm first:border-t-0">
                          <span>
                            <span className="font-bold">Jour {j.jour}</span>{" "}
                            <span className="text-sourdine">({i === 0 ? "aujourd'hui" : jourSemaine.format(new Date(j.date))})</span>
                          </span>
                          {j.ventes > 0 ? (
                            <span className="montant shrink-0 font-semibold">
                              {j.ventes} vente{j.ventes > 1 ? "s" : ""}, {fcfa(j.montant)}
                            </span>
                          ) : (
                            <span className="shrink-0 text-sourdine">aucune vente</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex flex-wrap items-start gap-2">
                  {b.etat === "a_valider" && (
                    <>
                      <BoutonAction libelle="Valider (14 j d'essai)" style="principal" action={validerBoutique.bind(null, b.id)} />
                      <BoutonAction libelle="Refuser" style="danger" confirmation="Confirmer le refus" action={refuserBoutique.bind(null, b.id)} />
                    </>
                  )}
                  {b.etat === "refusee" && <BoutonAction libelle="Valider quand même" action={validerBoutique.bind(null, b.id)} />}
                  {b.statut_compte === "valide" && (
                    <>
                      <BoutonAction libelle="+1 mois" style="principal" action={prolongerBoutique.bind(null, b.id, 1)} />
                      <BoutonAction libelle="+3 mois" action={prolongerBoutique.bind(null, b.id, 3)} />
                      {b.etat !== "expiree" && (
                        <BoutonAction libelle="Suspendre" style="danger" confirmation="Confirmer" action={suspendreBoutique.bind(null, b.id)} />
                      )}
                    </>
                  )}
                </div>

                {b.telephone ? (
                  <a
                    href={lienWhatsApp(b.telephone, messageWhatsApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="montant flex items-center gap-2 self-start text-sm font-semibold text-vert"
                  >
                    <IconeWhatsApp />
                    {formaterTelephone(b.telephone)}
                  </a>
                ) : (
                  <p className="text-sm text-sourdine">Pas de numéro</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

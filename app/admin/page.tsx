import Link from "next/link";
import { notFound } from "next/navigation";
import { IconeWhatsApp } from "@/components/bouton-whatsapp";
import { joursRestants, type StatutCompte } from "@/lib/boutique";
import { lienWhatsApp } from "@/lib/contact";
import { TYPES_BOUTIQUE } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import { entier, fcfa, ilYa, joursDepuis } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";
import { prolongerBoutique, refuserBoutique, suspendreBoutique, traiterDemande, validerBoutique } from "./actions";
import { BoutonAction } from "./bouton-action";

export const metadata = { title: "Espace admin — Cahier Commerce" };
export const dynamic = "force-dynamic";

/* ---------------- Types renvoyés par la base ---------------- */

type BoutiqueAdmin = {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string;
  cree_le: string;
  statut_compte: StatutCompte;
  abonnement_jusqu_au: string | null;
  pro: boolean;
  mois_payes: number;
  actif: boolean;
  ventes_total: number;
  montant_total: number;
  ventes_7j: number;
  montant_7j: number;
  lebalma: number;
  derniere_vente: string | null;
  nb_produits: number;
  nb_clients: number;
  par_jour: { jour: number; date: string; ventes: number; montant: number }[];
};

type Stats = Record<
  | "inscrits" | "sans_boutique" | "boutiques" | "a_valider" | "essai" | "pro" | "expirees" | "refusees"
  | "actives" | "inactives" | "ventes_total" | "montant_total" | "ventes_7j" | "montant_7j"
  | "lebalma_total" | "produits" | "clients" | "mois_vendus" | "demandes_ouvertes",
  number
>;

type Demande = {
  id: string;
  message: string;
  statut: "ouverte" | "traitee";
  created_at: string;
  traitee_le: string | null;
  email: string;
  boutique: string | null;
  telephone: string | null;
};

type CompteSansBoutique = { email: string; inscrit_le: string; derniere_connexion: string | null };

/* ---------------- Plan et état de chaque boutique ---------------- */

type Plan = "a_valider" | "essai" | "pro" | "expiree" | "refusee";

function planDe(b: BoutiqueAdmin): Plan {
  if (b.statut_compte === "en_attente") return "a_valider";
  if (b.statut_compte === "refuse") return "refusee";
  if (joursRestants(b.abonnement_jusqu_au) < 0) return "expiree";
  return b.pro ? "pro" : "essai";
}

const PLANS: Record<Plan, { libelle: string; badge: string }> = {
  a_valider: { libelle: "À valider", badge: "bg-dette-pale text-dette" },
  essai: { libelle: "Essai gratuit", badge: "bg-trait text-encre" },
  pro: { libelle: "Pro", badge: "bg-vert text-white" },
  expiree: { libelle: "Expirée", badge: "bg-erreur-pale text-erreur" },
  refusee: { libelle: "Refusée", badge: "bg-trait text-sourdine" },
};

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "a_valider", libelle: "À valider" },
  { valeur: "essai", libelle: "Essai" },
  { valeur: "pro", libelle: "Pro" },
  { valeur: "bientot", libelle: "Bientôt finies" },
  { valeur: "expiree", libelle: "Expirées" },
  { valeur: "inactive", libelle: "Inactives" },
  { valeur: "refusee", libelle: "Refusées" },
] as const;

function correspond(b: BoutiqueAdmin & { plan: Plan }, filtre: string) {
  if (!filtre) return true;
  if (filtre === "bientot") return (b.plan === "essai" || b.plan === "pro") && joursRestants(b.abonnement_jusqu_au) <= 5;
  if (filtre === "inactive") return (b.plan === "essai" || b.plan === "pro") && !b.actif;
  return b.plan === filtre;
}

const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const jourSemaine = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dateHeure = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });
const libelleType = (t: string) => TYPES_BOUTIQUE.find((x) => x.valeur === t)?.libelle ?? t;

function ligneAbonnement(b: BoutiqueAdmin, plan: Plan) {
  if (plan === "a_valider") return "En attente de ta validation";
  if (plan === "refusee") return "Compte refusé";
  const fin = dateCourte.format(new Date(b.abonnement_jusqu_au!));
  const j = joursRestants(b.abonnement_jusqu_au);
  if (plan === "expiree") return `Expirée depuis le ${fin}`;
  const reste = j === 0 ? "dernier jour" : `${j} j`;
  return plan === "pro" ? `Pro jusqu'au ${fin} (${reste}), ${b.mois_payes} mois payés` : `Essai jusqu'au ${fin} (${reste})`;
}

/* ---------------- Petits composants ---------------- */

function Chiffre({ libelle, valeur, detail, alerte }: { libelle: string; valeur: string; detail?: string; alerte?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl p-3 ${alerte ? "bg-dette-pale text-dette" : "bg-carte"}`}>
      <span className="text-xs font-semibold">{libelle}</span>
      <span className="montant text-xl font-extrabold">{valeur}</span>
      {detail && <span className="text-xs opacity-80">{detail}</span>}
    </div>
  );
}

function Onglet({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold ${actif ? "bg-encre text-white" : "bg-carte text-encre"}`}
    >
      {children}
    </Link>
  );
}

/* ---------------- Page ---------------- */

type Props = { searchParams: Promise<{ vue?: string; filtre?: string; demandes?: string }> };

export default async function PageAdmin({ searchParams }: Props) {
  const { vue = "boutiques", filtre = "", demandes: filtreDemandes = "ouvertes" } = await searchParams;
  const supabase = await createClient();

  const { data: estAdmin } = await supabase.rpc("est_admin").returns<boolean>();
  if (estAdmin !== true) notFound(); // la page n'existe pas pour les autres

  const [rStats, rBoutiques, rDemandes, rComptes] = await Promise.all([
    supabase.rpc("admin_stats").returns<Stats>(),
    supabase.rpc("admin_boutiques").returns<BoutiqueAdmin[]>(),
    supabase.rpc("admin_demandes").returns<Demande[]>(),
    supabase.rpc("admin_comptes_sans_boutique").returns<CompteSansBoutique[]>(),
  ]);
  const erreur = rStats.error ?? rBoutiques.error ?? rDemandes.error ?? rComptes.error;
  if (erreur) {
    // Page réservée à l'admin : on peut afficher le vrai message pour corriger vite.
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 py-6">
        <h1 className="text-2xl font-extrabold">Espace admin</h1>
        <p className="rounded-2xl bg-erreur-pale p-4 text-[15px] text-erreur">
          Erreur de la base : {erreur.message}. As-tu exécuté la migration 0010 dans Supabase ?
        </p>
      </main>
    );
  }

  const s = rStats.data as Stats;
  const boutiques = (rBoutiques.data as BoutiqueAdmin[]).map((b) => ({ ...b, par_jour: b.par_jour ?? [], plan: planDe(b) }));
  const demandes = rDemandes.data as Demande[];
  const comptes = rComptes.data as CompteSansBoutique[];

  const affichees = boutiques.filter((b) => correspond(b, filtre));
  const demandesAffichees = demandes.filter((d) => (filtreDemandes === "traitees" ? d.statut === "traitee" : d.statut === "ouverte"));

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Retour" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-extrabold">Espace admin</h1>
      </header>

      {/* -------- Statistiques globales -------- */}
      <section aria-labelledby="titre-stats" className="bord-a-bord flex flex-col gap-3 bg-encre px-5 py-5 text-white">
        <h2 id="titre-stats" className="text-[15px] font-semibold">Cahier en chiffres</h2>
        <div className="grid grid-cols-2 gap-2.5 text-encre">
          <Chiffre libelle="Inscrits" valeur={entier(s.inscrits)} detail={s.sans_boutique ? `dont ${s.sans_boutique} sans boutique` : undefined} />
          <Chiffre libelle="Commerces" valeur={entier(s.boutiques)} detail={`${s.actives} actifs, ${s.inactives} inactifs`} />
          <Chiffre libelle="Essai / Pro" valeur={`${s.essai} / ${s.pro}`} detail={`${s.mois_vendus} mois payés au total`} />
          <Chiffre libelle="Expirés" valeur={entier(s.expirees)} alerte={s.expirees > 0} />
          <Chiffre libelle="Ventes enregistrées" valeur={entier(s.ventes_total)} detail={`${s.ventes_7j} ces 7 jours`} />
          <Chiffre libelle="Montant des ventes" valeur={fcfa(s.montant_total)} detail={`${fcfa(s.montant_7j)} ces 7 jours`} />
          <Chiffre libelle="Lebalma en cours" valeur={fcfa(s.lebalma_total)} detail="dû aux commerçantes" />
          <Chiffre libelle="Produits / Clients" valeur={`${entier(s.produits)} / ${entier(s.clients)}`} />
          <Chiffre libelle="À valider" valeur={entier(s.a_valider)} alerte={s.a_valider > 0} />
          <Chiffre libelle="Demandes d'aide" valeur={entier(s.demandes_ouvertes)} detail="non traitées" alerte={s.demandes_ouvertes > 0} />
        </div>
      </section>

      {/* -------- Onglets -------- */}
      <nav aria-label="Sections de l'admin" className="flex gap-2 rounded-2xl bg-trait p-1">
        <Onglet href="/admin" actif={vue === "boutiques"}>
          Commerces
        </Onglet>
        <Onglet href="/admin?vue=demandes" actif={vue === "demandes"}>
          Aide ({s.demandes_ouvertes})
        </Onglet>
        <Onglet href="/admin?vue=comptes" actif={vue === "comptes"}>
          Sans boutique ({s.sans_boutique})
        </Onglet>
      </nav>

      {/* -------- Commerces -------- */}
      {vue === "boutiques" && (
        <>
          <nav aria-label="Filtrer les commerces" className="flex flex-wrap gap-2">
            {FILTRES.map((f) => {
              const n = boutiques.filter((b) => correspond(b, f.valeur)).length;
              const actif = filtre === f.valeur;
              return (
                <Link
                  key={f.valeur || "toutes"}
                  href={f.valeur ? `/admin?filtre=${f.valeur}` : "/admin"}
                  aria-current={actif ? "true" : undefined}
                  className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                    actif ? "bg-encre text-white" : "border border-bord bg-carte"
                  } ${f.valeur === "a_valider" && n > 0 && !actif ? "border-2 border-dette text-dette" : ""}`}
                >
                  {f.libelle} ({n})
                </Link>
              );
            })}
          </nav>

          {affichees.length === 0 ? (
            <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">Aucun commerce ici.</p>
          ) : (
            <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
              {affichees.map((b) => {
                const plan = PLANS[b.plan];
                const enService = b.plan === "essai" || b.plan === "pro";
                const periode = joursDepuis(b.cree_le) < 7 ? `Depuis l'inscription (${ilYa(b.cree_le)})` : "7 derniers jours";
                return (
                  <li key={b.id} className="flex flex-col gap-3 border-b border-trait px-5 py-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-lg font-bold">{b.nom}</span>
                        <span className="truncate text-sm text-sourdine">
                          {libelleType(b.type)}, {b.email}
                        </span>
                        <span className="text-sm text-sourdine">Inscrite le {dateCourte.format(new Date(b.cree_le))}</span>
                      </div>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${plan.badge}`}>{plan.libelle}</span>
                        {enService && (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${b.actif ? "bg-vert-pale text-vert-fonce" : "bg-erreur-pale text-erreur"}`}>
                            {b.actif ? "Active" : "Inactive"}
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-[15px] font-semibold">{ligneAbonnement(b, b.plan)}</p>

                    {b.statut_compte === "valide" && (
                      <dl className="montant grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <dt className="text-sourdine">Ventes (total)</dt>
                        <dd className="text-right font-semibold">
                          {entier(b.ventes_total)}, {fcfa(b.montant_total)}
                        </dd>
                        <dt className="text-sourdine">{periode}</dt>
                        <dd className="text-right font-semibold">
                          {entier(b.ventes_7j)}, {fcfa(b.montant_7j)}
                        </dd>
                        <dt className="text-sourdine">Lebalma en cours</dt>
                        <dd className={`text-right font-semibold ${b.lebalma > 0 ? "text-dette" : ""}`}>{fcfa(b.lebalma)}</dd>
                        <dt className="text-sourdine">Produits / Clients</dt>
                        <dd className="text-right font-semibold">
                          {entier(b.nb_produits)} / {entier(b.nb_clients)}
                        </dd>
                        <dt className="text-sourdine">Dernière vente</dt>
                        <dd className="text-right font-semibold">{b.derniere_vente ? ilYa(b.derniere_vente) : "aucune"}</dd>
                      </dl>
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
                      {b.plan === "a_valider" && (
                        <>
                          <BoutonAction libelle="Valider (14 j d'essai)" style="principal" action={validerBoutique.bind(null, b.id)} />
                          <BoutonAction libelle="Refuser" style="danger" confirmation="Confirmer le refus" action={refuserBoutique.bind(null, b.id)} />
                        </>
                      )}
                      {b.plan === "refusee" && <BoutonAction libelle="Valider quand même" action={validerBoutique.bind(null, b.id)} />}
                      {b.statut_compte === "valide" && (
                        <>
                          <BoutonAction libelle="+1 mois" style="principal" action={prolongerBoutique.bind(null, b.id, 1)} />
                          <BoutonAction libelle="+3 mois" action={prolongerBoutique.bind(null, b.id, 3)} />
                          {b.plan !== "expiree" && (
                            <BoutonAction libelle="Suspendre" style="danger" confirmation="Confirmer" action={suspendreBoutique.bind(null, b.id)} />
                          )}
                        </>
                      )}
                    </div>

                    {b.telephone ? (
                      <a
                        href={lienWhatsApp(b.telephone, `Bonjour, ici Cahier Commerce, au sujet de votre boutique « ${b.nom} ». `)}
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
        </>
      )}

      {/* -------- Demandes d'aide -------- */}
      {vue === "demandes" && (
        <>
          <nav aria-label="Filtrer les demandes" className="flex gap-2">
            {[
              { valeur: "ouvertes", libelle: "À traiter" },
              { valeur: "traitees", libelle: "Traitées" },
            ].map((f) => (
              <Link
                key={f.valeur}
                href={`/admin?vue=demandes&demandes=${f.valeur}`}
                aria-current={filtreDemandes === f.valeur ? "true" : undefined}
                className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                  filtreDemandes === f.valeur ? "bg-encre text-white" : "border border-bord bg-carte"
                }`}
              >
                {f.libelle}
              </Link>
            ))}
          </nav>

          {demandesAffichees.length === 0 ? (
            <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">
              {filtreDemandes === "traitees" ? "Aucune demande traitée." : "Aucune demande à traiter."}
            </p>
          ) : (
            <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
              {demandesAffichees.map((d) => (
                <li key={d.id} className="flex flex-col gap-2 border-b border-trait px-5 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-bold">{d.boutique ?? "Sans boutique"}</span>
                      <span className="truncate text-sm text-sourdine">{d.email}</span>
                    </span>
                    <span className="shrink-0 text-sm text-sourdine">{dateHeure.format(new Date(d.created_at))}</span>
                  </div>
                  <p className="rounded-xl bg-fond px-3 py-2 text-[15px] whitespace-pre-line">{d.message}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {d.statut === "ouverte" ? (
                      <BoutonAction libelle="Marquer traitée" style="principal" action={traiterDemande.bind(null, d.id, true)} />
                    ) : (
                      <BoutonAction libelle="Rouvrir" action={traiterDemande.bind(null, d.id, false)} />
                    )}
                    {d.telephone && (
                      <a
                        href={lienWhatsApp(d.telephone, `Bonjour, ici Cahier Commerce. Suite à votre message : « ${d.message.slice(0, 80)} »… `)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-vert"
                      >
                        <IconeWhatsApp />
                        Répondre sur WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* -------- Comptes sans boutique -------- */}
      {vue === "comptes" && (
        <>
          <p className="text-sm text-sourdine">
            Ces personnes ont créé un compte mais n&apos;ont pas fini l&apos;étape « Votre boutique ». Elles n&apos;apparaissent pas encore dans
            « À valider ».
          </p>
          {comptes.length === 0 ? (
            <p className="bord-a-bord border-y border-trait bg-carte p-5 text-[15px] text-sourdine">Aucun compte sans boutique.</p>
          ) : (
            <ul className="bord-a-bord flex flex-col border-y border-trait bg-carte">
              {comptes.map((c) => (
                <li key={c.email} className="flex flex-col gap-0.5 border-b border-trait px-5 py-3.5 last:border-b-0">
                  <span className="truncate font-bold">{c.email}</span>
                  <span className="text-sm text-sourdine">
                    Inscrit le {dateCourte.format(new Date(c.inscrit_le))}
                    {c.derniere_connexion ? `, dernière connexion ${ilYa(c.derniere_connexion)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

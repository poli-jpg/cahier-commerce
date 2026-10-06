"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { fcfa, entier } from "@/lib/format";
import type { Categorie } from "@/lib/produits";
import { MOYENS_PAIEMENT, type ClientCaisse, type LigneVente, type MoyenPaiement } from "@/lib/ventes";
import { enregistrerVente } from "./actions";
import { ChoixClient } from "./choix-client";

export type ProduitCaisse = {
  id: string;
  name: string;
  category_id: string | null;
  selling_price: number;
  stock_quantity: number;
};

type Ligne = {
  cle: string;
  produitId: string | null; // null = montant libre
  description: string;
  prix: number;
  quantite: number;
  stock: number | null; // null = pas de limite (montant libre)
};

type ModePaiement = "tout" | "partie" | "rien";

/** « 5 000 » → 5000 ; vide ou incorrect → null */
function lireMontant(texte: string) {
  const chiffres = texte.replace(/\D/g, "");
  return chiffres ? Number(chiffres) : null;
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const classeBoutonQuantite =
  "flex size-11 items-center justify-center rounded-xl text-2xl font-bold disabled:opacity-40";

type Props = { produits: ProduitCaisse[]; clients: ClientCaisse[]; categories: Categorie[] };

export function Caisse({ produits, clients: clientsInitiaux, categories }: Props) {
  // Identifiant fixé dès l'ouverture : un double envoi ne crée pas deux ventes.
  const [idVente] = useState(() => crypto.randomUUID());
  const [etape, setEtape] = useState<"produits" | "paiement">("produits");
  const [lignes, setLignes] = useState<Ligne[]>([]);

  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [libre, setLibre] = useState({ ouvert: false, description: "", prix: "" });

  const [mode, setMode] = useState<ModePaiement>("tout");
  const [montantPartie, setMontantPartie] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement>("especes");
  const [clients, setClients] = useState(clientsInitiaux);
  const [clientId, setClientId] = useState<string | null>(null);

  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  const total = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  const nbArticles = lignes.reduce((s, l) => s + l.quantite, 0);
  const paye = mode === "tout" ? total : mode === "rien" ? 0 : (lireMontant(montantPartie) ?? 0);
  const reste = Math.max(total - paye, 0);

  const produitsAffiches = useMemo(() => {
    const q = sansAccents(recherche.trim());
    return produits.filter(
      (p) => (!categorie || p.category_id === categorie) && (!q || sansAccents(p.name).includes(q)),
    );
  }, [produits, recherche, categorie]);

  const lignesLibres = lignes.filter((l) => l.produitId === null);

  function ajouterProduit(p: ProduitCaisse) {
    setErreur(null);
    setLignes((ls) =>
      ls.some((l) => l.produitId === p.id)
        ? ls
        : [...ls, { cle: p.id, produitId: p.id, description: p.name, prix: p.selling_price, quantite: 1, stock: p.stock_quantity }],
    );
  }

  function changerQuantite(cle: string, delta: number) {
    setErreur(null);
    setLignes((ls) =>
      ls.flatMap((l) => {
        if (l.cle !== cle) return [l];
        const q = l.quantite + delta;
        if (q <= 0) return [];
        if (l.stock !== null && q > l.stock) return [l];
        return [{ ...l, quantite: q }];
      }),
    );
  }

  function changerPrix(cle: string, texte: string) {
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, prix: lireMontant(texte) ?? 0 } : l)));
  }

  function ajouterMontantLibre() {
    const description = libre.description.trim();
    const prix = lireMontant(libre.prix);
    if (!description || prix === null) {
      setErreur("Pour un montant libre, écrivez ce que c'est et son prix.");
      return;
    }
    setErreur(null);
    setLignes((ls) => [...ls, { cle: crypto.randomUUID(), produitId: null, description, prix, quantite: 1, stock: null }]);
    setLibre({ ouvert: false, description: "", prix: "" });
  }

  function valider() {
    if (lignes.length === 0) return setErreur("Ajoutez au moins un produit.");
    if (mode === "partie") {
      const m = lireMontant(montantPartie);
      if (!m) return setErreur("Indiquez le montant reçu.");
      if (m >= total) return setErreur("Le client paie tout : choisissez « Tout payé ».");
    }
    if (reste > 0 && !clientId) return setErreur("Choisissez le client : il reste de l'argent à payer.");

    const lignesVente: LigneVente[] = lignes.map((l) =>
      l.produitId
        ? { produit_id: l.produitId, quantite: l.quantite, prix: l.prix }
        : { description: l.description, quantite: l.quantite, prix: l.prix },
    );

    setErreur(null);
    startTransition(async () => {
      const resultat = await enregistrerVente({
        id: idVente,
        lignes: lignesVente,
        montantPaye: paye,
        moyen: paye > 0 ? moyen : null,
        clientId,
      });
      if (resultat?.erreur) setErreur(resultat.erreur);
    });
  }

  const messageErreur = erreur && (
    <p role="alert" className="rounded-2xl bg-erreur-pale px-4 py-3 text-[15px] font-medium text-erreur">
      {erreur}
    </p>
  );

  /* ---------------- Étape 1 : produits ---------------- */
  if (etape === "produits") {
    return (
      <main className="flex flex-col gap-4 px-5 pt-6 pb-48">
        <header className="flex items-center gap-3">
          <Link href="/" aria-label="Annuler la vente" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold">Nouvelle vente</h1>
            <p className="text-sm text-sourdine">Étape 1 sur 2 : produits</p>
          </div>
        </header>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="recherche-produit" className="text-[15px] font-semibold">
            Chercher un produit
          </label>
          <input
            id="recherche-produit"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Karité, parfum, gel…"
            className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories">
            {[{ id: "", name: "Tout" }, ...categories].map((c) => (
              <button
                key={c.id || "tout"}
                type="button"
                onClick={() => setCategorie(c.id)}
                aria-pressed={categorie === c.id}
                className={`h-10 rounded-full px-4 text-sm font-semibold ${
                  categorie === c.id ? "bg-encre text-white" : "border border-bord bg-carte text-encre"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {produits.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-3xl bg-carte p-5">
            <p className="text-[15px] text-sourdine">Aucun produit enregistré. Ajoutez vos produits, ou vendez avec un montant libre.</p>
            <Link href="/produits/nouveau" className="font-bold text-vert underline underline-offset-4">
              Ajouter un produit
            </Link>
          </div>
        ) : produitsAffiches.length === 0 ? (
          <p className="rounded-3xl bg-carte p-5 text-[15px] text-sourdine">Aucun produit ne correspond.</p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-3xl bg-carte">
            {produitsAffiches.map((p) => {
              const ligne = lignes.find((l) => l.produitId === p.id);
              const epuise = p.stock_quantity === 0;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-3 border-b border-trait px-4 py-3 last:border-b-0 ${ligne ? "bg-vert-pale" : ""}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className={`truncate text-base font-bold ${epuise ? "text-sourdine" : ""}`}>{p.name}</span>
                    <span className={`montant text-sm ${epuise ? "font-semibold text-erreur" : "text-sourdine"}`}>
                      {fcfa(p.selling_price)}, {epuise ? "épuisé" : `${entier(p.stock_quantity)} en stock`}
                    </span>
                  </span>
                  {ligne ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => changerQuantite(p.id, -1)} aria-label={`Retirer un ${p.name}`} className={`${classeBoutonQuantite} border border-bord bg-carte`}>
                        −
                      </button>
                      <span className="montant min-w-6 text-center text-lg font-extrabold" aria-live="polite">
                        {ligne.quantite}
                      </span>
                      <button
                        type="button"
                        onClick={() => changerQuantite(p.id, 1)}
                        disabled={ligne.quantite >= p.stock_quantity}
                        aria-label={`Ajouter un ${p.name}`}
                        className={`${classeBoutonQuantite} bg-vert text-white`}
                      >
                        +
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ajouterProduit(p)}
                      disabled={epuise}
                      className="h-11 shrink-0 rounded-xl border border-vert bg-carte px-4 font-bold text-vert disabled:border-trait disabled:text-sourdine"
                    >
                      {epuise ? "Épuisé" : "Ajouter"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <section aria-label="Montant libre" className="flex flex-col gap-3">
          {lignesLibres.map((l) => (
            <div key={l.cle} className="flex items-center justify-between gap-3 rounded-2xl bg-vert-pale px-4 py-3">
              <span className="min-w-0 truncate font-semibold">
                {l.description}, {fcfa(l.prix)}
              </span>
              <button type="button" onClick={() => changerQuantite(l.cle, -l.quantite)} className="shrink-0 text-sm font-bold text-erreur">
                Retirer
              </button>
            </div>
          ))}

          {libre.ouvert ? (
            <div className="flex flex-col gap-3 rounded-3xl bg-carte p-4">
              <label htmlFor="libre-description" className="text-[15px] font-semibold">
                Ce que vous vendez
              </label>
              <input
                id="libre-description"
                value={libre.description}
                onChange={(e) => setLibre({ ...libre, description: e.target.value })}
                placeholder="Ex. : Pinces à cheveux"
                maxLength={80}
                className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
              />
              <label htmlFor="libre-prix" className="text-[15px] font-semibold">
                Prix (F)
              </label>
              <input
                id="libre-prix"
                inputMode="numeric"
                value={libre.prix}
                onChange={(e) => setLibre({ ...libre, prix: e.target.value })}
                placeholder="Ex. : 500"
                className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setLibre({ ouvert: false, description: "", prix: "" })} className="h-12 flex-1 rounded-2xl border border-bord bg-carte font-semibold">
                  Annuler
                </button>
                <button type="button" onClick={ajouterMontantLibre} className="h-12 flex-1 rounded-2xl bg-vert font-bold text-white">
                  Ajouter
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setLibre({ ...libre, ouvert: true })} className="self-center py-2 text-[15px] font-semibold text-vert">
              + Montant libre (produit hors liste)
            </button>
          )}
        </section>

        {messageErreur}

        <div className="fixed inset-x-0 bottom-[var(--hauteur-nav)] z-10 border-t border-trait bg-carte">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-3">
            <span className="flex flex-col">
              <span className="text-sm text-sourdine">
                {nbArticles} article{nbArticles > 1 ? "s" : ""}
              </span>
              <span className="montant text-2xl font-extrabold">{fcfa(total)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setErreur(null);
                setEtape("paiement");
              }}
              disabled={lignes.length === 0}
              className="h-14 rounded-2xl bg-vert px-7 text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-40"
            >
              Continuer
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------- Étape 2 : paiement ---------------- */
  const choixMode = (valeur: ModePaiement, libelle: string) => (
    <button
      type="button"
      onClick={() => {
        setErreur(null);
        setMode(valeur);
      }}
      aria-pressed={mode === valeur}
      className={`h-14 rounded-2xl px-4 text-left text-base font-bold ${
        mode === valeur ? "border-2 border-vert bg-vert-pale text-vert-fonce" : "border border-bord bg-carte"
      }`}
    >
      {libelle}
    </button>
  );

  return (
    <main className="flex flex-col gap-5 px-5 pt-6 pb-48">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEtape("produits")}
          aria-label="Retour aux produits"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-trait bg-carte"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold">Paiement</h1>
          <p className="text-sm text-sourdine">Étape 2 sur 2</p>
        </div>
      </header>

      <section aria-label="Récapitulatif" className="flex flex-col gap-3 rounded-3xl bg-carte p-4">
        {lignes.map((l) => (
          <div key={l.cle} className="flex flex-col gap-2 border-b border-trait pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <span className="font-bold">{l.description}</span>
              <span className="montant shrink-0 font-bold">{fcfa(l.prix * l.quantite)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <button type="button" onClick={() => changerQuantite(l.cle, -1)} aria-label={`Retirer un ${l.description}`} className="flex size-9 items-center justify-center rounded-lg border border-bord text-xl font-bold">
                  −
                </button>
                <span className="montant min-w-5 text-center font-extrabold">{l.quantite}</span>
                <button
                  type="button"
                  onClick={() => changerQuantite(l.cle, 1)}
                  disabled={l.stock !== null && l.quantite >= l.stock}
                  aria-label={`Ajouter un ${l.description}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-bord text-xl font-bold disabled:opacity-40"
                >
                  +
                </button>
              </span>
              <label className="flex items-center gap-2 text-sm text-sourdine">
                Prix
                <input
                  inputMode="numeric"
                  value={entier(l.prix)}
                  onChange={(e) => changerPrix(l.cle, e.target.value)}
                  aria-label={`Prix unitaire de ${l.description}`}
                  className="montant h-9 w-24 rounded-lg border border-bord px-2 text-right text-base text-encre"
                />
              </label>
            </div>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-trait pt-3">
          <span className="text-base font-bold">Total</span>
          <span className="montant text-3xl font-extrabold">{fcfa(total)}</span>
        </div>
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">Le client paie combien maintenant ?</legend>
        {choixMode("tout", `Tout payé, ${fcfa(total)}`)}
        {choixMode("partie", "Une partie")}
        {choixMode("rien", "Rien pour l'instant (Lebalma)")}
      </fieldset>

      {mode === "partie" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="montant-recu" className="text-[15px] font-semibold">
            Montant reçu (F)
          </label>
          <input
            id="montant-recu"
            inputMode="numeric"
            value={montantPartie}
            onChange={(e) => setMontantPartie(e.target.value)}
            placeholder="Ex. : 5000"
            className="montant h-14 rounded-2xl border-2 border-vert bg-carte px-4 text-2xl font-bold"
          />
        </div>
      )}

      {paye > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-semibold">Moyen de paiement</legend>
          <div className="grid grid-cols-3 gap-2">
            {MOYENS_PAIEMENT.map((m) => (
              <button
                key={m.valeur}
                type="button"
                onClick={() => setMoyen(m.valeur)}
                aria-pressed={moyen === m.valeur}
                className={`h-12 rounded-xl px-1 text-sm leading-tight font-semibold min-[360px]:text-[15px] ${
                  moyen === m.valeur ? "border-2 border-encre bg-carte font-bold" : "border border-bord bg-carte"
                }`}
              >
                {m.libelle}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className={`flex flex-col gap-1 rounded-3xl p-4 ${reste > 0 ? "bg-dette-pale text-dette" : "bg-vert-pale text-vert-fonce"}`} aria-live="polite">
        <span className="text-[15px] font-semibold">Reste à payer</span>
        <span className="montant text-3xl font-extrabold">{fcfa(reste)}</span>
      </div>

      <ChoixClient
        clients={clients}
        clientId={clientId}
        obligatoire={reste > 0}
        onChoisir={(id) => {
          setErreur(null);
          setClientId(id);
        }}
        onCree={(c) => {
          setClients((cs) => (cs.some((x) => x.id === c.id) ? cs : [...cs, c].sort((a, b) => a.name.localeCompare(b.name))));
          setClientId(c.id);
        }}
      />

      {messageErreur}

      <div className="fixed inset-x-0 bottom-[var(--hauteur-nav)] z-10 border-t border-trait bg-carte">
        <div className="mx-auto max-w-md px-5 py-3">
          <button
            type="button"
            onClick={valider}
            disabled={enCours}
            className="h-14 w-full rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60"
          >
            {enCours ? "Enregistrement…" : "Valider la vente"}
          </button>
        </div>
      </div>
    </main>
  );
}

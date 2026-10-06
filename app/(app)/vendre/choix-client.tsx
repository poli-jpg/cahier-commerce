"use client";

import { useState, useTransition } from "react";
import { formaterTelephone } from "@/lib/telephone";
import type { ClientCaisse } from "@/lib/ventes";
import { creerClientRapide } from "../clients/actions";

type Props = {
  clients: ClientCaisse[];
  clientId: string | null;
  obligatoire: boolean;
  onChoisir: (id: string | null) => void;
  onCree: (client: ClientCaisse) => void;
};

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function ChoixClient({ clients, clientId, obligatoire, onChoisir, onCree }: Props) {
  const [recherche, setRecherche] = useState("");
  const [nouveau, setNouveau] = useState<{ nom: string; tel: string } | null>(null);
  const [info, setInfo] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [enCours, startTransition] = useTransition();

  const choisi = clients.find((c) => c.id === clientId);
  const titre = obligatoire ? "Client (obligatoire pour le Lebalma)" : "Client (facultatif)";

  if (choisi) {
    return (
      <section aria-label={titre} className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold">{titre}</h2>
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-vert bg-carte px-4 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-bold">{choisi.name}</span>
            <span className="montant text-sm text-sourdine">{choisi.phone ? formaterTelephone(choisi.phone) : "Pas de numéro"}</span>
          </span>
          <button type="button" onClick={() => onChoisir(null)} className="h-10 shrink-0 rounded-xl bg-fond px-3 text-sm font-semibold">
            Changer
          </button>
        </div>
        {info && !info.erreur && <p className="text-sm text-vert-fonce">{info.texte}</p>}
      </section>
    );
  }

  const q = sansAccents(recherche.trim());
  const chiffres = recherche.replace(/\D/g, "");
  const resultats = clients
    .filter((c) => !q || sansAccents(c.name).includes(q) || (chiffres.length >= 2 && c.phone?.includes(chiffres)))
    .slice(0, 6);

  function creer() {
    if (!nouveau) return;
    setInfo(null);
    startTransition(async () => {
      const r = await creerClientRapide(nouveau.nom, nouveau.tel);
      if ("erreur" in r) {
        setInfo({ texte: r.erreur, erreur: true });
        return;
      }
      onCree(r.client);
      setNouveau(null);
      setRecherche("");
      setInfo({
        texte: r.existant ? `Ce numéro était déjà celui de ${r.client.name} : client sélectionné.` : "Client créé.",
        erreur: false,
      });
    });
  }

  return (
    <section aria-label={titre} className="flex flex-col gap-2">
      <h2 className="text-[15px] font-semibold">{titre}</h2>

      {nouveau ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-carte p-4">
          <label htmlFor="nouveau-nom" className="text-[15px] font-semibold">
            Nom
          </label>
          <input
            id="nouveau-nom"
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            placeholder="Ex. : Fatou Diop"
            maxLength={60}
            className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
          <label htmlFor="nouveau-tel" className="text-[15px] font-semibold">
            Téléphone (facultatif)
          </label>
          <input
            id="nouveau-tel"
            type="tel"
            inputMode="tel"
            value={nouveau.tel}
            onChange={(e) => setNouveau({ ...nouveau, tel: e.target.value })}
            placeholder="77 123 45 67"
            className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
          {info?.erreur && (
            <p role="alert" className="text-sm font-medium text-erreur">
              {info.texte}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setNouveau(null)} className="h-12 flex-1 rounded-2xl border border-bord bg-carte font-semibold">
              Annuler
            </button>
            <button type="button" onClick={creer} disabled={enCours || !nouveau.nom.trim()} className="h-12 flex-1 rounded-2xl bg-vert font-bold text-white disabled:opacity-50">
              {enCours ? "Un instant…" : "Créer et choisir"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <label htmlFor="recherche-client" className="sr-only">
            Chercher un client
          </label>
          <input
            id="recherche-client"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom ou numéro du client"
            className="h-12 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
          {resultats.length > 0 && (
            <ul className="flex flex-col overflow-hidden rounded-2xl bg-carte">
              {resultats.map((c) => (
                <li key={c.id} className="border-b border-trait last:border-b-0">
                  <button type="button" onClick={() => onChoisir(c.id)} className="flex w-full flex-col px-4 py-3 text-left hover:bg-fond">
                    <span className="font-bold">{c.name}</span>
                    <span className="montant text-sm text-sourdine">{c.phone ? formaterTelephone(c.phone) : "Pas de numéro"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && resultats.length === 0 && <p className="text-sm text-sourdine">Aucun client ne correspond.</p>}
          <button
            type="button"
            onClick={() => {
              setInfo(null);
              setNouveau({ nom: chiffres.length >= 2 ? "" : recherche.trim(), tel: chiffres.length >= 2 ? recherche : "" });
            }}
            className="self-start py-2 text-[15px] font-semibold text-vert"
          >
            + Nouveau client
          </button>
        </>
      )}
    </section>
  );
}

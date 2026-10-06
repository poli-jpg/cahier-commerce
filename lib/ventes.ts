// Partagé entre le serveur et le navigateur (aucun import serveur ici).

export const MOYENS_PAIEMENT = [
  { valeur: "especes", libelle: "Espèces" },
  { valeur: "wave", libelle: "Wave" },
  { valeur: "orange_money", libelle: "Orange Money" },
] as const;

export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number]["valeur"];

export function libelleMoyen(valeur: string) {
  return MOYENS_PAIEMENT.find((m) => m.valeur === valeur)?.libelle ?? "Autre";
}

export type StatutVente = "paye" | "partiel" | "en_dette";

export const STATUTS: Record<StatutVente, { libelle: string; classes: string }> = {
  paye: { libelle: "PAYÉ", classes: "bg-vert-pale text-vert-fonce" },
  partiel: { libelle: "PARTIEL", classes: "bg-dette-pale text-dette" },
  en_dette: { libelle: "EN DETTE", classes: "bg-trait text-encre" },
};

/** Ligne envoyée au serveur pour enregistrer une vente. */
export type LigneVente =
  | { produit_id: string; quantite: number; prix: number }
  | { description: string; quantite: number; prix: number };

export type DemandeVente = {
  id: string;
  lignes: LigneVente[];
  montantPaye: number;
  moyen: MoyenPaiement | null;
  clientId: string | null;
};

export type ClientCaisse = { id: string; name: string; phone: string | null };

export const TYPES_BOUTIQUE = [
  { valeur: "cosmetiques", libelle: "Cosmétiques" },
  { valeur: "alimentation", libelle: "Alimentation" },
  { valeur: "autre", libelle: "Autre commerce" },
] as const;

export type TypeBoutique = (typeof TYPES_BOUTIQUE)[number]["valeur"];

export function estTypeBoutique(v: string): v is TypeBoutique {
  return TYPES_BOUTIQUE.some((t) => t.valeur === v);
}

// État renvoyé par les Server Actions des formulaires.
export type EtatFormulaire = { erreur?: string; message?: string };

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

// Valeur spéciale du menu « Catégorie » pour en créer une nouvelle.
export const NOUVELLE_CATEGORIE = "__nouvelle";

// Nombre de lignes affichées dans une liste avant « Voir plus ».
export const PAR_PAGE = 5;

/** Lit « ?n=40 » dans l'adresse : combien de lignes afficher. */
export function lireLimite(valeur: string | undefined) {
  const n = Number(valeur);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 2000) : PAR_PAGE;
}

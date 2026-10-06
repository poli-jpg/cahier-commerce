// Partagé entre le serveur et le navigateur.
export const CATEGORIES_DEPENSE = [
  { valeur: "marchandise", libelle: "Marchandise" },
  { valeur: "transport", libelle: "Transport" },
  { valeur: "loyer", libelle: "Loyer" },
  { valeur: "electricite_eau", libelle: "Électricité / eau" },
  { valeur: "salaire", libelle: "Salaire" },
  { valeur: "telephone", libelle: "Téléphone / crédit" },
  { valeur: "autre", libelle: "Autre" },
] as const;

export function libelleCategorie(valeur: string) {
  return CATEGORIES_DEPENSE.find((c) => c.valeur === valeur)?.libelle ?? "Autre";
}

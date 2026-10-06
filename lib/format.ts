const nombre = new Intl.NumberFormat("fr-FR");

/** 15000 → « 15 000 F » */
export function fcfa(montant: number) {
  return nombre.format(montant).replace(/[\u202f\u00a0]/g, " ") + " F";
}

/** 15000 → « 15 000 » (sans le F) */
export function entier(n: number) {
  return nombre.format(n).replace(/[\u202f\u00a0]/g, " ");
}

export type EntierLu = number | null | "invalide";

/**
 * Lit un nombre entier positif saisi par la commerçante.
 * Accepte les espaces (« 15 000 »). Champ vide → null.
 */
export function lireEntier(valeur: FormDataEntryValue | null): EntierLu {
  const texte = String(valeur ?? "").replace(/[\s\u202f\u00a0.]/g, "");
  if (texte === "") return null;
  if (!/^\d+$/.test(texte)) return "invalide";
  const n = Number(texte);
  return n <= 1_000_000_000 ? n : "invalide";
}

/** Nettoie un texte saisi : espaces en trop retirés. */
export function lireTexte(valeur: FormDataEntryValue | null) {
  return String(valeur ?? "").trim().replace(/\s+/g, " ");
}

/** Échappe % et _ pour une recherche ilike. */
export function echapperLike(texte: string) {
  return texte.replace(/[\\%_]/g, (c) => "\\" + c);
}

const dateHeure = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Dakar",
});

export function dateCourte(iso: string) {
  return dateHeure.format(new Date(iso));
}

/** Nombre de jours entiers écoulés depuis une date (heure de Dakar = UTC). */
export function joursDepuis(iso: string, maintenant = new Date()) {
  const jour = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.max(0, Math.round((jour(maintenant) - jour(new Date(iso))) / 86_400_000));
}

/** « aujourd'hui », « hier », « il y a 12 jours » */
export function ilYa(iso: string) {
  const j = joursDepuis(iso);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "hier";
  return `il y a ${j} jours`;
}

const dateSeule = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Dakar" });

export function dateJour(iso: string) {
  return dateSeule.format(new Date(iso));
}

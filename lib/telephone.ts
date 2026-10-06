/**
 * Numéros sénégalais : 9 chiffres commençant par 7 (mobile) ou 3 (fixe).
 * Accepte « 77 123 45 67 », « +221771234567 », « 00221 77… ».
 * Renvoie « 771234567 », null si vide, ou « invalide ».
 */
export function normaliserTelephone(valeur: FormDataEntryValue | null): string | null | "invalide" {
  let chiffres = String(valeur ?? "").replace(/\D/g, "");
  if (chiffres === "") return null;
  if (chiffres.startsWith("00221")) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith("221") && chiffres.length === 12) chiffres = chiffres.slice(3);
  return /^[37]\d{8}$/.test(chiffres) ? chiffres : "invalide";
}

/** « 771234567 » → « 77 123 45 67 » */
export function formaterTelephone(tel: string) {
  return tel.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
}

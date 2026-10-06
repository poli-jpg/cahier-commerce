// Ton numéro WhatsApp, format international sans + ni espaces (ex. 221771234567)
export const CONTACT_WHATSAPP = "221784653251";

// Prix affiché aux commerçantes. Laisse null tant que le prix n'est pas décidé.
export const PRIX_MENSUEL: string | null = null; // ex. "3 000 F / mois"

export function lienContact(message: string) {
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/** Lien WhatsApp vers une commerçante (numéro sénégalais sur 9 chiffres). */
export function lienWhatsApp(telephone: string, message: string) {
  return `https://wa.me/221${telephone}?text=${encodeURIComponent(message)}`;
}

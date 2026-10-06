import { joursRestants, type Boutique } from "@/lib/boutique";
import { lienContact } from "@/lib/contact";

/** S'affiche seulement pendant les 5 derniers jours de l'abonnement (comme l'Atelier). */
export function BandeauAbonnement({ boutique }: { boutique: Boutique }) {
  const jours = joursRestants(boutique.abonnement_jusqu_au);
  if (jours > 5 || jours < 0) return null;
  const texte =
    jours === 0 ? "Votre abonnement se termine aujourd'hui." : `Votre abonnement se termine dans ${jours} jour${jours > 1 ? "s" : ""}.`;
  const message = `Bonjour, je voudrais renouveler l'abonnement de ma boutique « ${boutique.name} » (réf. ${boutique.id.slice(0, 8)}).`;
  return (
    <a
      href={lienContact(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl bg-dette-pale px-4 py-3 text-sm text-dette"
    >
      <span>{texte}</span>
      <span className="shrink-0 font-semibold underline underline-offset-4">Renouveler</span>
    </a>
  );
}

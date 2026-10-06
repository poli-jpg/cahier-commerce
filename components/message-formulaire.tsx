import type { EtatFormulaire } from "@/lib/constantes";

export function MessageFormulaire({ etat }: { etat: EtatFormulaire }) {
  if (etat.erreur) {
    return (
      <p role="alert" className="rounded-2xl bg-erreur-pale px-4 py-3 text-[15px] font-medium text-erreur">
        {etat.erreur}
      </p>
    );
  }
  if (etat.message) {
    return (
      <p role="status" className="rounded-2xl bg-vert-pale px-4 py-3 text-[15px] font-medium text-vert-fonce">
        {etat.message}
      </p>
    );
  }
  return null;
}

import { STATUTS, type StatutVente } from "@/lib/ventes";

export function BadgeStatut({ statut }: { statut: StatutVente }) {
  const s = STATUTS[statut];
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide ${s.classes}`}>
      {s.libelle}
    </span>
  );
}

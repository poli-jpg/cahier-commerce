import Link from "next/link";
import { PAR_PAGE } from "@/lib/constantes";

type Props = {
  chemin: string;
  params: Record<string, string | undefined>; // filtres à garder (recherche, catégorie…)
  limite: number;
  cle?: string; // nom du paramètre dans l'adresse (« n » par défaut)
};

/** Affiche PAR_PAGE lignes de plus, sans remonter en haut de la page. */
export function VoirPlus({ chemin, params, limite, cle = "n" }: Props) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  p.set(cle, String(limite + PAR_PAGE));
  return (
    <Link
      href={`${chemin}?${p}`}
      scroll={false}
      replace
      className="flex h-12 items-center justify-center rounded-2xl border border-bord bg-carte text-[15px] font-semibold text-vert"
    >
      Voir plus
    </Link>
  );
}

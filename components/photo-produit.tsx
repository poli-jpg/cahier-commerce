import { urlPhoto } from "@/lib/photos";

// Couleurs des vignettes sans photo (la même couleur revient toujours pour un même produit).
const TEINTES = [
  ["#E8EFE9", "#2F6B55"],
  ["#F6EADF", "#8A4B1F"],
  ["#EDE7F3", "#5A4580"],
  ["#E6EEF6", "#2E5A84"],
  ["#F7E6E8", "#9A3B4C"],
  ["#F3EFE2", "#6E5E2A"],
];

function teinte(nom: string) {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

type Props = {
  chemin: string | null;
  nom: string;
  className?: string; // taille et arrondi, ex. "size-14 rounded-2xl"
  grand?: boolean; // lettre plus grosse (grille de la caisse)
};

/** Photo du produit, ou sa première lettre sur un fond coloré s'il n'en a pas. */
export function PhotoProduit({ chemin, nom, className = "size-14 rounded-2xl", grand = false }: Props) {
  const url = urlPhoto(chemin);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" loading="lazy" decoding="async" className={`shrink-0 bg-trait object-cover ${className}`} />
    );
  }
  const [fond, encre] = teinte(nom);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-extrabold ${grand ? "text-5xl" : "text-xl"} ${className}`}
      style={{ background: fond, color: encre }}
    >
      {nom.trim().charAt(0).toUpperCase()}
    </span>
  );
}

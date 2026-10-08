// Photos des produits (stockage Supabase « produits », public en lecture).

export const BUCKET_PHOTOS = "produits";

/** Format imposé par la base : <id boutique>/<identifiant>-<horodatage>.jpg */
const FORMAT = /^[0-9a-f-]{36}\/[0-9a-f-]{36}-[0-9]+\.jpg$/;

export function cheminPhotoValide(chemin: string) {
  return FORMAT.test(chemin);
}

/** Adresse publique d'une photo (null si pas de photo). */
export function urlPhoto(chemin: string | null | undefined) {
  if (!chemin) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PHOTOS}/${chemin}`;
}

/**
 * Réduit une photo sur le téléphone avant l'envoi : 800 px maximum, JPEG.
 * Une photo de 4 Mo devient environ 80–150 Ko : envoi rapide même avec peu de réseau.
 */
export async function compresserPhoto(fichier: File, cote = 800, qualite = 0.75): Promise<Blob> {
  // Une balise <img> marche partout (anciens iPhone compris) et respecte le sens de la photo.
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = await new Promise<HTMLImageElement>((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ko(new Error("Image illisible"));
      img.src = adresse;
    });
    const echelle = Math.min(1, cote / Math.max(image.naturalWidth, image.naturalHeight));
    const largeur = Math.max(1, Math.round(image.naturalWidth * echelle));
    const hauteur = Math.max(1, Math.round(image.naturalHeight * echelle));

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.fillStyle = "#ffffff"; // fond blanc si l'image a de la transparence
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.drawImage(image, 0, 0, largeur, hauteur);

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualite));
    if (!blob) throw new Error("Compression impossible");
    return blob;
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

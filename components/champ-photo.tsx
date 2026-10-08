"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_PHOTOS, compresserPhoto, urlPhoto } from "@/lib/photos";

type Props = {
  boutiqueId: string;
  initial?: string | null; // chemin de la photo actuelle (modification)
  onEnvoi?: (enCours: boolean) => void; // bloque l'enregistrement pendant l'envoi
};

/**
 * Photo du produit : « Prendre une photo » ou « Galerie ».
 * La photo est réduite sur le téléphone puis envoyée tout de suite ;
 * le formulaire ne reçoit que son chemin (champ caché « image_path »).
 */
export function ChampPhoto({ boutiqueId, initial = null, onEnvoi }: Props) {
  const [chemin, setChemin] = useState<string | null>(initial);
  const [apercu, setApercu] = useState<string | null>(urlPhoto(initial));
  const [etat, setEtat] = useState<"repos" | "envoi" | "erreur">("repos");
  const camera = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de choisir à nouveau la même photo
    if (!fichier) return;

    setEtat("envoi");
    onEnvoi?.(true);
    try {
      const blob = await compresserPhoto(fichier);
      const nouveau = `${boutiqueId}/${crypto.randomUUID()}-${Date.now()}.jpg`;
      const { error } = await createClient()
        .storage.from(BUCKET_PHOTOS)
        .upload(nouveau, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw error;
      setChemin(nouveau);
      setApercu(URL.createObjectURL(blob));
      setEtat("repos");
    } catch {
      setEtat("erreur");
    } finally {
      onEnvoi?.(false);
    }
  }

  function retirer() {
    setChemin(null);
    setApercu(null);
    setEtat("repos");
  }

  const bouton =
    "flex h-14 items-center justify-center gap-2 rounded-2xl text-[15px] font-bold disabled:opacity-60";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[15px] font-semibold">Photo du produit (facultatif)</legend>
      <input type="hidden" name="image_path" value={chemin ?? ""} />
      <input ref={camera} type="file" accept="image/*" capture="environment" onChange={choisir} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <input ref={galerie} type="file" accept="image/*" onChange={choisir} className="sr-only" tabIndex={-1} aria-hidden="true" />

      <div className="flex items-stretch gap-3">
        <div className="relative flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-bord bg-carte text-sourdine">
          {apercu ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu} alt="Photo du produit" className="size-full object-cover" />
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          )}
          {etat === "envoi" && (
            <span className="absolute inset-0 flex items-center justify-center bg-carte/80 text-sm font-bold text-encre">Envoi…</span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2">
          <button type="button" onClick={() => camera.current?.click()} disabled={etat === "envoi"} className={`${bouton} bg-vert text-white`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Prendre une photo
          </button>
          <button type="button" onClick={() => galerie.current?.click()} disabled={etat === "envoi"} className={`${bouton} border border-bord bg-carte text-encre`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-9 9" />
            </svg>
            Galerie
          </button>
        </div>
      </div>

      {chemin && etat !== "envoi" && (
        <button type="button" onClick={retirer} className="self-start py-1 text-sm font-semibold text-erreur underline underline-offset-4">
          Retirer la photo
        </button>
      )}
      {etat === "erreur" && (
        <p role="alert" className="text-sm font-medium text-erreur">
          La photo n&apos;a pas pu être envoyée. Vérifiez votre connexion et réessayez, ou enregistrez le produit sans photo.
        </p>
      )}
    </fieldset>
  );
}

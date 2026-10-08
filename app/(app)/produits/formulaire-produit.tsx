"use client";

import { useFormulaire } from "@/lib/use-formulaire";
import { useState } from "react";
import { Champ } from "@/components/champ";
import { ChampPhoto } from "@/components/champ-photo";
import { MessageFormulaire } from "@/components/message-formulaire";
import { NOUVELLE_CATEGORIE, type EtatFormulaire } from "@/lib/constantes";
import type { Categorie, Produit } from "@/lib/produits";

type Props = {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  categories: Categorie[];
  produit?: Produit; // absent = création
  boutiqueId: string;
};

export function FormulaireProduit({ action, categories, produit, boutiqueId }: Props) {
  const [etat, formAction, enCours] = useFormulaire(action, {});
  const [categorie, setCategorie] = useState(produit?.category_id ?? "");
  const creation = !produit;
  const [envoiPhoto, setEnvoiPhoto] = useState(false);

  return (
    <form onSubmit={formAction} className="flex flex-col gap-5">
      <ChampPhoto boutiqueId={boutiqueId} initial={produit?.image_path} onEnvoi={setEnvoiPhoto} />

      <Champ
        label="Nom du produit"
        name="name"
        defaultValue={produit?.name}
        placeholder="Ex. : Lait corporel karité 400 ml"
        aide="Ajoutez la contenance ou la teinte si le produit existe en plusieurs versions."
        maxLength={80}
        required
      />

      <Champ
        label="Prix de vente (F)"
        name="selling_price"
        inputMode="numeric"
        defaultValue={produit?.selling_price}
        placeholder="Ex. : 3500"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category_id" className="text-[15px] font-semibold">
          Catégorie
        </label>
        <select
          id="category_id"
          name="category_id"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="h-14 rounded-2xl border border-bord bg-carte px-4 text-base text-encre"
        >
          <option value="">Sans catégorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NOUVELLE_CATEGORIE}>+ Nouvelle catégorie…</option>
        </select>
      </div>

      {categorie === NOUVELLE_CATEGORIE && (
        <Champ label="Nom de la nouvelle catégorie" name="nouvelle_categorie" placeholder="Ex. : Ongles" maxLength={40} autoFocus required />
      )}

      {creation && (
        <Champ
          label="Combien en avez-vous maintenant ?"
          name="stock_initial"
          inputMode="numeric"
          placeholder="0"
          aide="Vous pourrez ajouter du stock plus tard."
        />
      )}

      <details className="group rounded-2xl bg-carte px-4 py-3" open={produit?.purchase_price != null}>
        <summary className="cursor-pointer py-1 text-[15px] font-semibold">Plus de détails (facultatif)</summary>
        <div className="flex flex-col gap-5 pt-4 pb-1">
          <Champ
            label="Prix d'achat (F)"
            name="purchase_price"
            inputMode="numeric"
            defaultValue={produit?.purchase_price ?? undefined}
            aide="Sert plus tard à calculer votre bénéfice."
          />
          <Champ
            label="Prévenir quand il reste…"
            name="low_stock_threshold"
            inputMode="numeric"
            defaultValue={produit?.low_stock_threshold ?? 3}
            aide="Le produit apparaîtra dans « Stock faible »."
          />
        </div>
      </details>

      <MessageFormulaire etat={etat} />

      <button
        type="submit"
        disabled={enCours || envoiPhoto}
        className="h-14 rounded-2xl bg-vert text-lg font-bold text-white hover:bg-vert-fonce disabled:opacity-60"
      >
        {envoiPhoto ? "Envoi de la photo…" : enCours ? "Un instant…" : creation ? "Ajouter le produit" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}

import { getBoutique } from "@/lib/boutique";
import { getCategories } from "@/lib/produits";
import { BoutonRetour } from "@/components/bouton-retour";
import { creerProduit } from "../actions";
import { FormulaireProduit } from "../formulaire-produit";

export const metadata = { title: "Nouveau produit — Cahier Commerce" };

export default async function PageNouveauProduit() {
  const [categories, boutique] = await Promise.all([getCategories(), getBoutique()]);
  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/produits" libelle="Retour aux produits" />
        <h1 className="text-2xl font-extrabold">Nouveau produit</h1>
      </header>
      <FormulaireProduit action={creerProduit} categories={categories} boutiqueId={boutique!.id} />
    </main>
  );
}

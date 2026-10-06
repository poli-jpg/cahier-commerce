import { BoutonRetour } from "@/components/bouton-retour";
import { FormulaireDepense } from "./formulaire-depense";

export const metadata = { title: "Nouvelle dépense — Cahier Commerce" };

export default function PageNouvelleDepense() {
  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/depenses" libelle="Retour aux dépenses" />
        <h1 className="text-2xl font-extrabold">Nouvelle dépense</h1>
      </header>
      <FormulaireDepense />
    </main>
  );
}

import { BoutonRetour } from "@/components/bouton-retour";
import { creerClient } from "../actions";
import { FormulaireClient } from "../formulaire-client";

export const metadata = { title: "Nouveau client — Cahier Commerce" };

export default function PageNouveauClient() {
  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/clients" libelle="Retour aux clients" />
        <h1 className="text-2xl font-extrabold">Nouveau client</h1>
      </header>
      <FormulaireClient action={creerClient} />
    </main>
  );
}

import { creerCompte } from "../actions";
import { FormulaireAuth } from "../formulaire-auth";

export const metadata = { title: "Créer un compte — Cahier Commerce" };

export default function PageInscription() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Créer un compte</h1>
      <FormulaireAuth mode="inscription" action={creerCompte} />
    </>
  );
}

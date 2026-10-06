import { seConnecter } from "../actions";
import { FormulaireAuth } from "../formulaire-auth";

export const metadata = { title: "Connexion — Cahier Commerce" };

export default function PageConnexion() {
  return (
    <>
      <h1 className="text-3xl font-extrabold">Connexion</h1>
      <FormulaireAuth mode="connexion" action={seConnecter} />
    </>
  );
}

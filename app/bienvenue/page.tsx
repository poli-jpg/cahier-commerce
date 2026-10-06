import { redirect } from "next/navigation";
import { getBoutique } from "@/lib/boutique";
import { FormulaireBoutique } from "./formulaire-boutique";

export const metadata = { title: "Votre boutique — Cahier Commerce" };

export default async function PageBienvenue() {
  // Déjà une boutique : pas besoin de repasser par ici.
  if (await getBoutique()) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Votre boutique</h1>
        <p className="text-sourdine">Deux informations et votre cahier est prêt.</p>
      </div>
      <FormulaireBoutique />
    </main>
  );
}

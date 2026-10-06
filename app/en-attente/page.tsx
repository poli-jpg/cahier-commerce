import Link from "next/link";
import { redirect } from "next/navigation";
import { IconeWhatsApp } from "@/components/bouton-whatsapp";
import { getBoutique } from "@/lib/boutique";
import { lienContact } from "@/lib/contact";
import { seDeconnecter } from "../(auth)/actions";

export const metadata = { title: "Compte en attente — Cahier Commerce" };
export const dynamic = "force-dynamic";

export default async function PageEnAttente() {
  const boutique = await getBoutique();
  if (!boutique) redirect("/bienvenue");
  if (boutique.statut_compte === "valide") redirect("/");

  const refuse = boutique.statut_compte === "refuse";
  const message = `Bonjour, je viens de créer ma boutique « ${boutique.name} » sur Cahier Commerce (réf. ${boutique.id.slice(0, 8)}). Pouvez-vous activer mon compte ?`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-sourdine">{boutique.name}</p>
        <h1 className="text-3xl font-extrabold">{refuse ? "Compte non activé" : "Compte en attente de validation"}</h1>
        <p className="text-sourdine">
          {refuse
            ? "Votre compte n'a pas été activé. Écrivez-nous sur WhatsApp si vous pensez que c'est une erreur."
            : "Nous vérifions votre boutique et l'activons rapidement, en général dans la journée. Vous aurez ensuite 14 jours d'essai gratuit."}
        </p>
      </div>

      <a
        href={lienContact(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-vert text-lg font-bold text-white"
      >
        <IconeWhatsApp />
        Nous écrire sur WhatsApp
      </a>

      {!refuse && (
        <Link href="/" className="flex h-14 items-center justify-center rounded-2xl border border-bord bg-carte text-lg font-semibold">
          Mon compte est-il activé ?
        </Link>
      )}

      <form action={seDeconnecter}>
        <button type="submit" className="w-full text-center text-sm font-semibold underline underline-offset-4">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

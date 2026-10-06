import { redirect } from "next/navigation";
import { IconeWhatsApp } from "@/components/bouton-whatsapp";
import { abonnementActif, getBoutique } from "@/lib/boutique";
import { PRIX_MENSUEL, lienContact } from "@/lib/contact";
import { seDeconnecter } from "../(auth)/actions";

export const metadata = { title: "Abonnement — Cahier Commerce" };
export const dynamic = "force-dynamic";

const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PageAbonnement() {
  const boutique = await getBoutique();
  if (!boutique) redirect("/bienvenue");
  if (boutique.statut_compte !== "valide") redirect("/en-attente");
  if (abonnementActif(boutique)) redirect("/");

  const message = `Bonjour, je voudrais renouveler l'abonnement de ma boutique « ${boutique.name} » (réf. ${boutique.id.slice(0, 8)}).`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-sourdine">{boutique.name}</p>
        <h1 className="text-3xl font-extrabold">Votre abonnement est terminé</h1>
        <p className="text-sourdine">
          Il a pris fin le {dateLongue.format(new Date(boutique.abonnement_jusqu_au!))}. Vos ventes, votre Lebalma et votre stock sont
          bien conservés : tout revient dès le renouvellement.
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl border border-trait bg-carte p-5">
        <span className="text-sm text-sourdine">Abonnement</span>
        {PRIX_MENSUEL && <span className="montant text-2xl font-extrabold">{PRIX_MENSUEL}</span>}
        <span className="text-sm text-sourdine">
          Paiement par Wave ou Orange Money. Envoyez-nous un message : votre accès revient dans la journée.
        </span>
      </div>

      <a
        href={lienContact(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-vert text-lg font-bold text-white"
      >
        <IconeWhatsApp />
        Renouveler sur WhatsApp
      </a>

      <form action={seDeconnecter}>
        <button type="submit" className="w-full text-center text-sm font-semibold underline underline-offset-4">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

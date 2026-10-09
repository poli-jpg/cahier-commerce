import Link from "next/link";
import { BoutonRetour } from "@/components/bouton-retour";
import { getBoutique, joursRestants } from "@/lib/boutique";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "../../(auth)/actions";
import { FormulaireBoutiqueCompte, FormulaireMotDePasse } from "./formulaires";

export const metadata = { title: "Mon compte — Cahier Commerce" };

const dateLongue = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PageCompte() {
  const boutique = (await getBoutique())!; // garanti par le layout
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const jours = joursRestants(boutique.abonnement_jusqu_au);

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href="/" libelle="Retour à l'accueil" />
        <h1 className="text-2xl font-extrabold">Mon compte</h1>
      </header>

      <section className="bord-a-bord flex items-center justify-between gap-3 border-y border-trait bg-carte p-5">
        <div className="flex flex-col">
          <span className="text-sm text-sourdine">Abonnement</span>
          <span className="font-semibold">Actif jusqu&apos;au {dateLongue.format(new Date(boutique.abonnement_jusqu_au!))}</span>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${
            jours <= 5 ? "bg-dette-pale text-dette" : "bg-vert-pale text-vert-fonce"
          }`}
        >
          {jours === 0 ? "Dernier jour" : `${jours} j`}
        </span>
      </section>

      <Link
        href="/journees"
        className="bord-a-bord flex items-center justify-between gap-3 border-y border-trait bg-carte p-5 hover:bg-fond"
      >
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-vert-pale text-vert">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-bold">Mes journées</span>
            <span className="text-sm text-sourdine">Le total vendu de chaque jour</span>
          </span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-sourdine">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      <FormulaireBoutiqueCompte nom={boutique.name} telephone={boutique.phone} />

      <section className="bord-a-bord flex flex-col gap-1 border-y border-trait bg-carte p-5">
        <h2 className="text-lg font-bold">Adresse e-mail</h2>
        <p className="text-[15px]">{user?.email}</p>
        <p className="text-sm text-sourdine">Pour la changer, écrivez-nous depuis l&apos;aide (le rond en bas à droite).</p>
      </section>

      <FormulaireMotDePasse />

      <form action={seDeconnecter}>
        <button type="submit" className="h-14 w-full rounded-2xl border-2 border-erreur bg-carte text-lg font-bold text-erreur">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}

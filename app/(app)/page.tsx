import { getBoutique } from "@/lib/boutique";
import { seDeconnecter } from "../(auth)/actions";

export const metadata = { title: "Accueil — Cahier Commerce" };

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Africa/Dakar",
});

export default async function Accueil() {
  const boutique = (await getBoutique())!;
  const aujourdhui = formatDate.format(new Date());

  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-sourdine first-letter:uppercase">{aujourdhui}</p>
          <h1 className="text-2xl font-extrabold">{boutique.name}</h1>
        </div>
        <form action={seDeconnecter}>
          <button type="submit" className="h-11 rounded-full border border-trait bg-carte px-4 text-sm font-semibold">
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-2 rounded-3xl bg-carte p-5">
        <h2 className="text-lg font-bold">Votre cahier est prêt</h2>
        <p className="text-sourdine">
          Ajoutez vos produits et vos clients pour enregistrer vos premières ventes.
        </p>
      </section>
    </main>
  );
}

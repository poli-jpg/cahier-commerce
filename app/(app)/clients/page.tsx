import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/clients";
import { VoirPlus } from "@/components/voir-plus";
import { lireLimite } from "@/lib/constantes";
import { echapperLike } from "@/lib/format";
import { formaterTelephone } from "@/lib/telephone";

export const metadata = { title: "Clients — Cahier Commerce" };

type Props = { searchParams: Promise<{ q?: string; n?: string }> };

export default async function PageClients({ searchParams }: Props) {
  const { q = "", n } = await searchParams;
  const limite = lireLimite(n);
  const recherche = q.trim();
  const chiffres = recherche.replace(/\D/g, "");
  // Que des chiffres (et espaces) : on cherche dans les numéros, sinon dans les noms.
  const parTelephone = chiffres.length >= 2 && /^[\d\s+]+$/.test(recherche);

  const supabase = await createClient();
  let requete = supabase
    .from("customers")
    .select("id, name, phone, address, created_at")
    .eq("archived", false)
    .order("name");
  if (parTelephone) requete = requete.like("phone", `%${chiffres}%`);
  else if (recherche) requete = requete.ilike("name", `%${echapperLike(recherche)}%`);

  const { data, error } = await requete.range(0, limite).returns<Client[]>();
  if (error) throw new Error("Lecture des clients impossible : " + error.message);
  const plus = data.length > limite;
  const clients = data.slice(0, limite);

  return (
    <main className="flex flex-col gap-5 px-5 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Clients</h1>
        <Link
          href="/clients/nouveau"
          className="flex h-11 items-center rounded-full bg-vert px-5 text-[15px] font-bold text-white hover:bg-vert-fonce"
        >
          Ajouter
        </Link>
      </header>

      <form role="search" className="flex flex-col gap-1.5">
        <label htmlFor="q" className="text-[15px] font-semibold">
          Chercher un client
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={recherche}
            placeholder="Nom ou numéro"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-bord bg-carte px-4 text-base"
          />
          <button type="submit" className="h-12 rounded-2xl bg-encre px-4 font-semibold text-white">
            Chercher
          </button>
        </div>
      </form>

      {clients.length === 0 ? (
        <div className="flex flex-col items-start gap-3 bord-a-bord border-y border-trait bg-carte p-5">
          <p className="text-[15px] text-sourdine">
            {recherche ? "Aucun client ne correspond." : "Aucun client pour l'instant."}
          </p>
          <Link href="/clients/nouveau" className="font-bold text-vert underline underline-offset-4">
            Ajouter un client
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col overflow-hidden bord-a-bord border-y border-trait bg-carte">
          {clients.map((c) => (
            <li key={c.id} className="border-b border-trait last:border-b-0">
              <Link href={`/clients/${c.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-fond">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-encre font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-bold">{c.name}</span>
                  <span className="montant truncate text-sm text-sourdine">
                    {c.phone ? formaterTelephone(c.phone) : "Pas de numéro"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {plus && <VoirPlus chemin="/clients" params={{ q: recherche }} limite={limite} />}
    </main>
  );
}

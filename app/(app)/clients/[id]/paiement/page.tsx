import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { BoutonRetour } from "@/components/bouton-retour";
import { createClient } from "@/lib/supabase/server";
import { fcfa } from "@/lib/format";
import { enregistrerPaiement } from "./actions";
import { FormulairePaiement } from "./formulaire-paiement";

export const metadata = { title: "Enregistrer un paiement — Cahier Commerce" };

export default async function PagePaiement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: ventes }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("id", id).maybeSingle<{ id: string; name: string }>(),
    supabase.from("sales").select("remaining_amount").eq("customer_id", id).gt("remaining_amount", 0).returns<{ remaining_amount: number }[]>(),
  ]);

  if (!client) notFound();
  const dette = (ventes ?? []).reduce((s, v) => s + v.remaining_amount, 0);
  if (dette === 0) redirect(`/clients/${id}`);

  return (
    <main className="flex flex-col gap-6 px-5 py-6">
      <header className="flex items-center gap-3">
        <BoutonRetour href={`/clients/${id}`} libelle="Annuler" />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-xl font-extrabold">Paiement de {client.name}</h1>
          <p className="montant text-sm text-sourdine">Doit actuellement {fcfa(dette)}</p>
        </div>
      </header>
      {/* Identifiant unique par ouverture de page : un double appui ne compte qu'une fois. */}
      <FormulairePaiement action={enregistrerPaiement.bind(null, id)} dette={dette} nom={client.name} versementId={randomUUID()} />
    </main>
  );
}

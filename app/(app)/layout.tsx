import { redirect } from "next/navigation";
import { AideChat } from "@/components/aide-chat";
import { Navigation } from "@/components/navigation";
import { abonnementActif, getBoutique } from "@/lib/boutique";

// Toutes les pages du cahier exigent une boutique créée, validée et abonnée.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const boutique = await getBoutique();
  if (!boutique) redirect("/bienvenue");
  if (boutique.statut_compte !== "valide") redirect("/en-attente");
  if (!abonnementActif(boutique)) redirect("/abonnement");
  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-md pb-[calc(var(--hauteur-nav)+2rem)]">{children}</div>
      <Navigation />
      <AideChat />
    </>
  );
}

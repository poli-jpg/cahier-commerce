import { redirect } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { getBoutique } from "@/lib/boutique";

// Toutes les pages du cahier exigent une boutique créée.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getBoutique())) redirect("/bienvenue");
  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-md pb-[calc(var(--hauteur-nav)+2rem)]">{children}</div>
      <Navigation />
    </>
  );
}

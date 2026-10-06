import { redirect } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { getBoutique } from "@/lib/boutique";

// Toutes les pages du cahier exigent une boutique créée.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getBoutique())) redirect("/bienvenue");
  return (
    <>
      <div className="mx-auto w-full max-w-md pb-24">{children}</div>
      <Navigation />
    </>
  );
}

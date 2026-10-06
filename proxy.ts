import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 : ce fichier remplace middleware.ts.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Fichiers publics de la PWA exclus : sinon un visiteur non connecté
    // serait redirigé vers /connexion et l'installation échouerait.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|hors-ligne.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

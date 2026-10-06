import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PAGES_PUBLIQUES = ["/connexion", "/inscription"];

// Rafraîchit la session à chaque requête et protège les pages privées.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne rien exécuter entre createServerClient et getClaims.
  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims);

  const chemin = request.nextUrl.pathname;
  const pagePublique = PAGES_PUBLIQUES.some((p) => chemin.startsWith(p));

  if (!connecte && !pagePublique) return rediriger(request, response, "/connexion");
  if (connecte && pagePublique) return rediriger(request, response, "/");

  return response;
}

// Redirige en gardant les cookies de session éventuellement rafraîchis.
function rediriger(request: NextRequest, source: NextResponse, chemin: string) {
  const url = request.nextUrl.clone();
  url.pathname = chemin;
  url.search = "";
  const redirection = NextResponse.redirect(url);
  source.cookies.getAll().forEach((c) => redirection.cookies.set(c));
  return redirection;
}

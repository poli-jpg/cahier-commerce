import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TypeBoutique } from "@/lib/constantes";

export type Boutique = { id: string; name: string; type: TypeBoutique };

// La boutique du compte connecté (RLS : on ne peut lire que la sienne).
// cache() évite de refaire la requête plusieurs fois pendant un même rendu.
export const getBoutique = cache(async (): Promise<Boutique | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, type")
    .maybeSingle();

  if (error) throw new Error("Lecture de la boutique impossible : " + error.message);
  return data;
});

import type { EtatFormulaire } from "@/lib/constantes";

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
};

/** Un client avec le même numéro existe déjà : on prévient avant de créer. */
export type EtatClient = EtatFormulaire & { doublon?: { id: string; name: string } };

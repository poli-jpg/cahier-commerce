-- 0009 — Essai gratuit : 14 jours au lieu de 30
-- Ne change que les FUTURES validations. Les boutiques déjà validées gardent leur date.
create or replace function public.admin_valider(p_boutique uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fin date;
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.businesses
     set statut_compte = 'valide',
         abonnement_jusqu_au = coalesce(abonnement_jusqu_au, current_date + 14),
         valide_le = coalesce(valide_le, now())
   where id = p_boutique
  returning abonnement_jusqu_au into v_fin;
  if v_fin is null then
    raise exception 'BOUTIQUE_INTROUVABLE' using errcode = 'P0001';
  end if;
  return v_fin;
end;
$$;

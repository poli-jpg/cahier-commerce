-- 0008 — Espace admin : activité jour par jour depuis l'inscription
-- Jour 1 = jour de création de la boutique, Jour 2 = le lendemain… jusqu'à aujourd'hui.
-- On garde les 60 derniers jours au maximum (la liste resterait sinon trop longue).
-- Toujours des totaux seulement : nombre de ventes et montant par jour.

-- La liste des colonnes change : il faut supprimer puis recréer la fonction.
drop function if exists public.admin_boutiques();

create function public.admin_boutiques()
returns table (
  id                  uuid,
  nom                 text,
  type                text,
  telephone           text,
  email               text,
  cree_le             timestamptz,
  statut_compte       text,
  abonnement_jusqu_au date,
  ventes_7j           bigint,
  montant_7j          bigint,
  derniere_vente      timestamptz,
  nb_produits         bigint,
  nb_clients          bigint,
  par_jour            jsonb   -- [{"jour":1,"date":"2026-10-06","ventes":7,"montant":25500}, …]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;

  return query
  select b.id, b.name, b.type, b.phone, u.email::text, b.created_at,
         b.statut_compte, b.abonnement_jusqu_au,
         (select count(*) from public.sales s
           where s.business_id = b.id and s.created_at >= now() - interval '7 days'),
         (select coalesce(sum(s.total_amount), 0)::bigint from public.sales s
           where s.business_id = b.id and s.created_at >= now() - interval '7 days'),
         (select max(s.created_at) from public.sales s where s.business_id = b.id),
         (select count(*) from public.products p where p.business_id = b.id and not p.archived),
         (select count(*) from public.customers c where c.business_id = b.id and not c.archived),
         (select coalesce(jsonb_agg(jsonb_build_object(
                    'jour',    (j.d - b.created_at::date) + 1,
                    'date',    j.d,
                    'ventes',  coalesce(v.nombre, 0),
                    'montant', coalesce(v.montant, 0)
                  ) order by j.d desc), '[]'::jsonb)
            from (
              select g::date as d
                from generate_series(
                       greatest(b.created_at::date, current_date - 59),
                       current_date,
                       interval '1 day'
                     ) as g
            ) j
            left join (
              select s.created_at::date as d, count(*) as nombre, sum(s.total_amount) as montant
                from public.sales s
               where s.business_id = b.id
                 and s.created_at >= greatest(b.created_at::date, current_date - 59)
               group by s.created_at::date
            ) v on v.d = j.d)
    from public.businesses b
    join auth.users u on u.id = b.owner_id
   order by (b.statut_compte = 'en_attente') desc, b.created_at desc;
end;
$$;

revoke all on function public.admin_boutiques() from public, anon;
grant execute on function public.admin_boutiques() to authenticated;

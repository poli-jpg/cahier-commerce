-- 0013 — Historique des journées de la commerçante
-- Une ligne par jour, de la création de la boutique jusqu'à aujourd'hui
-- (365 jours au maximum). Jour 1 = jour de création de la boutique.
-- security invoker : les règles RLS s'appliquent, chaque boutique ne voit que ses chiffres.
-- Les jours sont comptés à l'heure de Dakar.

create or replace function public.mes_journees()
returns table (
  jour     integer,
  date     date,
  ventes   bigint,   -- nombre de ventes
  montant  bigint,   -- total vendu
  encaisse bigint,   -- argent reçu ce jour-là (ventes + remboursements), hors annulations
  depenses bigint,   -- dépenses du jour, hors annulations
  credit   bigint    -- part des ventes du jour non payée à la caisse
)
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (
    select (created_at at time zone 'Africa/Dakar')::date as debut
      from public.businesses
     where id = public.ma_boutique_id()
  ),
  aujourdhui as (
    select (now() at time zone 'Africa/Dakar')::date as d
  ),
  jours as (
    select g::date as d
      from b, aujourdhui,
           generate_series(greatest(b.debut, aujourdhui.d - 364), aujourdhui.d, interval '1 day') as g
  ),
  v as (
    select (s.created_at at time zone 'Africa/Dakar')::date as d,
           count(*) as nombre,
           sum(s.total_amount) as montant,
           sum(s.total_amount - coalesce((
             select sum(p.amount) from public.payments p
              where p.sale_id = s.id and p.created_at = s.created_at
           ), 0)) as credit
      from public.sales s
     group by 1
  ),
  p as (
    select (created_at at time zone 'Africa/Dakar')::date as d, sum(amount) as montant
      from public.payments
     where cancelled_at is null
     group by 1
  ),
  e as (
    select (created_at at time zone 'Africa/Dakar')::date as d, sum(amount) as montant
      from public.expenses
     where cancelled_at is null
     group by 1
  )
  select (j.d - b.debut + 1)::integer,
         j.d,
         coalesce(v.nombre, 0)::bigint,
         coalesce(v.montant, 0)::bigint,
         coalesce(p.montant, 0)::bigint,
         coalesce(e.montant, 0)::bigint,
         greatest(coalesce(v.credit, 0), 0)::bigint
    from jours j
    cross join b
    left join v on v.d = j.d
    left join p on p.d = j.d
    left join e on e.d = j.d
   order by j.d desc;
$$;

revoke all on function public.mes_journees() from public, anon;
grant execute on function public.mes_journees() to authenticated;

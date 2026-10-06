-- 0006 — Tableau de bord
-- Une seule fonction calcule tous les chiffres de l'accueil.
-- security invoker : les règles RLS s'appliquent, chaque boutique ne voit que ses données.
-- « Aujourd'hui » = depuis minuit, heure de Dakar.

create or replace function public.tableau_de_bord()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  debut as (
    select date_trunc('day', now(), 'Africa/Dakar') as jour
  ),
  ventes_jour as (
    select count(*)                          as nombre,
           coalesce(sum(s.total_amount), 0)  as total
      from public.sales s, debut
     where s.created_at >= debut.jour
  ),
  -- Tout l'argent reçu aujourd'hui : ventes du jour ET remboursements de dettes.
  encaisse as (
    select p.payment_method, sum(p.amount) as montant
      from public.payments p, debut
     where p.created_at >= debut.jour and p.cancelled_at is null
     group by p.payment_method
  ),
  -- Vendu à crédit aujourd'hui : la part NON payée au moment de la vente.
  -- (Le paiement fait à la caisse est dans la même transaction : même horodatage.)
  credit_jour as (
    select coalesce(sum(s.total_amount - coalesce(a.paye, 0)), 0) as montant
      from public.sales s
      cross join debut
      left join lateral (
        select sum(p.amount) as paye from public.payments p
         where p.sale_id = s.id and p.created_at = s.created_at
      ) a on true
     where s.created_at >= debut.jour
  ),
  dettes as (
    select coalesce(sum(s.remaining_amount), 0) as total,
           count(distinct s.customer_id)        as clients,
           min(s.created_at)                    as plus_ancienne
      from public.sales s
     where s.remaining_amount > 0
  ),
  stock_faible as (
    select pr.id, pr.name, pr.stock_quantity, pr.low_stock_threshold
      from public.products pr
     where not pr.archived and pr.stock_quantity <= pr.low_stock_threshold
  ),
  derniers as (
    select p.versement_id,
           max(p.created_at)         as created_at,
           sum(p.amount)             as montant,
           max(p.payment_method)     as moyen,
           max(c.name)               as client,
           max(p.customer_id::text)  as client_id
      from public.payments p
      left join public.customers c on c.id = p.customer_id
     where p.cancelled_at is null
     group by p.versement_id
     order by max(p.created_at) desc
     limit 5
  )
  select jsonb_build_object(
    'ventes_jour',     (select jsonb_build_object('nombre', nombre, 'total', total) from ventes_jour),
    'encaisse_jour',   coalesce((select jsonb_object_agg(payment_method, montant) from encaisse), '{}'::jsonb),
    'credit_jour',     (select greatest(montant, 0) from credit_jour),
    'dettes',          (select jsonb_build_object('total', total, 'clients', clients, 'plus_ancienne', plus_ancienne) from dettes),
    'stock_faible_nb', (select count(*) from stock_faible),
    'stock_faible',    coalesce((select jsonb_agg(to_jsonb(sf) order by sf.stock_quantity, sf.name)
                                   from (select * from stock_faible order by stock_quantity, name limit 5) sf), '[]'::jsonb),
    'derniers_paiements', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from derniers d), '[]'::jsonb)
  );
$$;

revoke all on function public.tableau_de_bord() from public, anon;
grant execute on function public.tableau_de_bord() to authenticated;

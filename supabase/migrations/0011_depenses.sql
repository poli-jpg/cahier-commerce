-- 0011 — Dépenses
-- La commerçante note l'argent qui sort (marchandise, transport, loyer…).
-- Comme les paiements : une dépense n'est jamais effacée. En cas d'erreur,
-- elle est ANNULÉE (date + motif) et ne compte plus dans les totaux.

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null default public.ma_boutique_id()
                 references public.businesses (id) on delete cascade,
  amount         bigint not null check (amount > 0 and amount <= 100000000),
  category       text not null check (category in
                   ('marchandise', 'transport', 'loyer', 'electricite_eau', 'salaire', 'telephone', 'autre')),
  note           text check (char_length(note) <= 200),
  payment_method text not null default 'especes'
                 check (payment_method in ('especes', 'wave', 'orange_money', 'autre')),
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  cancelled_at   timestamptz,
  cancel_reason  text check (char_length(cancel_reason) <= 200),
  check ((cancelled_at is null) = (cancel_reason is null))
);

create index expenses_boutique_date on public.expenses (business_id, created_at desc);

alter table public.expenses enable row level security;

create policy "depenses_lecture" on public.expenses for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "depenses_ajout" on public.expenses for insert to authenticated
  with check (business_id = (select public.ma_boutique_id()));

-- Ajout seulement (montant, catégorie, note, moyen). Ni modification ni suppression directe.
revoke insert, update, delete on public.expenses from anon, authenticated;
grant insert (amount, category, note, payment_method) on public.expenses to authenticated;

-- Annuler une dépense saisie par erreur (la trace reste visible).
create or replace function public.annuler_depense(p_depense uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motif text := nullif(btrim(p_motif), '');
begin
  if public.ma_boutique_id() is null then
    raise exception 'AUCUNE_BOUTIQUE' using errcode = '42501';
  end if;
  if v_motif is null or char_length(v_motif) > 200 then
    raise exception 'MOTIF_REQUIS' using errcode = 'P0001';
  end if;
  update public.expenses
     set cancelled_at = now(), cancel_reason = v_motif
   where id = p_depense
     and business_id = public.ma_boutique_id()
     and cancelled_at is null;
  if not found then
    raise exception 'DEPENSE_INTROUVABLE' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.annuler_depense(uuid, text) from public, anon;
grant execute on function public.annuler_depense(uuid, text) to authenticated;

------------------------------------------------------------------
-- Tableau de bord : + dépenses du jour
------------------------------------------------------------------
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
  encaisse as (
    select p.payment_method, sum(p.amount) as montant
      from public.payments p, debut
     where p.created_at >= debut.jour and p.cancelled_at is null
     group by p.payment_method
  ),
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
  depenses_jour as (
    select count(*) as nombre, coalesce(sum(e.amount), 0) as montant
      from public.expenses e, debut
     where e.created_at >= debut.jour and e.cancelled_at is null
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
    'depenses_jour',   (select jsonb_build_object('nombre', nombre, 'montant', montant) from depenses_jour),
    'dettes',          (select jsonb_build_object('total', total, 'clients', clients, 'plus_ancienne', plus_ancienne) from dettes),
    'stock_faible_nb', (select count(*) from stock_faible),
    'stock_faible',    coalesce((select jsonb_agg(to_jsonb(sf) order by sf.stock_quantity, sf.name)
                                   from (select * from stock_faible order by stock_quantity, name limit 5) sf), '[]'::jsonb),
    'derniers_paiements', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from derniers d), '[]'::jsonb)
  );
$$;

-- 0004 — Ventes, lignes de vente et paiements
-- Règles :
--  * Le montant payé d'une vente n'est jamais écrit à la main : c'est la somme
--    de ses paiements (trigger). Le reste et le statut sont CALCULÉS par la base.
--  * Une vente non payée entièrement doit avoir un client (Lebalma).
--  * On ne peut pas payer plus que le total.
--  * Toute vente fait baisser le stock (mouvement « vente »).
--  * Tout passe par la fonction enregistrer_vente : une seule transaction,
--    rien n'est enregistré à moitié. L'application n'écrit rien directement.

------------------------------------------------------------------
-- Ventes
------------------------------------------------------------------
create table public.sales (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  customer_id      uuid,
  total_amount     bigint not null default 0 check (total_amount >= 0),
  paid_amount      bigint not null default 0 check (paid_amount >= 0),
  remaining_amount bigint generated always as (total_amount - paid_amount) stored,
  payment_status   text generated always as (
                     case
                       when paid_amount >= total_amount then 'paye'
                       when paid_amount > 0 then 'partiel'
                       else 'en_dette'
                     end
                   ) stored,
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (business_id, id),
  check (paid_amount <= total_amount),
  foreign key (business_id, customer_id) references public.customers (business_id, id)
);

create index sales_boutique_date on public.sales (business_id, created_at desc);
create index sales_client on public.sales (customer_id, created_at desc) where customer_id is not null;
create index sales_dettes on public.sales (business_id) where paid_amount < total_amount;

-- Vérifiée à la fin de la transaction (la vente est créée avant ses paiements).
create or replace function public.verifier_client_si_dette()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.sales s
     where s.id = new.id
       and s.paid_amount < s.total_amount
       and s.customer_id is null
  ) then
    raise exception 'CLIENT_REQUIS' using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger vente_client_si_dette
  after insert or update on public.sales
  deferrable initially deferred
  for each row execute function public.verifier_client_si_dette();

------------------------------------------------------------------
-- Lignes de vente (photo du produit au moment de la vente)
------------------------------------------------------------------
create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id     uuid not null,
  product_id  uuid,                -- null = montant libre
  description text not null check (char_length(btrim(description)) between 1 and 80),
  quantity    integer not null check (quantity between 1 and 10000),
  unit_price  integer not null check (unit_price between 0 and 100000000),
  subtotal    bigint generated always as (quantity::bigint * unit_price) stored,
  foreign key (business_id, sale_id) references public.sales (business_id, id) on delete cascade,
  foreign key (business_id, product_id) references public.products (business_id, id)
);

create index sale_items_vente on public.sale_items (sale_id);
create index sale_items_produit on public.sale_items (product_id) where product_id is not null;

------------------------------------------------------------------
-- Paiements (chaque versement est une ligne, jamais modifiée)
------------------------------------------------------------------
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null,
  sale_id        uuid not null,
  customer_id    uuid,
  amount         bigint not null check (amount > 0),
  payment_method text not null check (payment_method in ('especes', 'wave', 'orange_money', 'autre')),
  note           text check (char_length(note) <= 200),
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  foreign key (business_id, sale_id) references public.sales (business_id, id),
  foreign key (business_id, customer_id) references public.customers (business_id, id)
);

create index payments_vente on public.payments (sale_id);
create index payments_boutique_date on public.payments (business_id, created_at desc);

create or replace function public.appliquer_paiement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sales
     set paid_amount = paid_amount + new.amount
   where id = new.sale_id
     and business_id = new.business_id;
  return new;
end;
$$;

create trigger paiement_applique
  after insert on public.payments
  for each row execute function public.appliquer_paiement();

------------------------------------------------------------------
-- Lien mouvement de stock → vente
------------------------------------------------------------------
alter table public.stock_movements add column sale_id uuid;
alter table public.stock_movements
  add foreign key (business_id, sale_id) references public.sales (business_id, id);
alter table public.stock_movements
  add check (type not in ('vente', 'annulation_vente') or sale_id is not null);

------------------------------------------------------------------
-- Sécurité : lecture seule depuis l'application
------------------------------------------------------------------
alter table public.sales      enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments   enable row level security;

create policy "ventes_lecture" on public.sales for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "lignes_lecture" on public.sale_items for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "paiements_lecture" on public.payments for select to authenticated
  using (business_id = (select public.ma_boutique_id()));

revoke insert, update, delete on public.sales, public.sale_items, public.payments from anon, authenticated;

------------------------------------------------------------------
-- Enregistrer une vente
--   p_id     : identifiant créé par l'application (un double clic ne crée pas 2 ventes)
--   p_lignes : [{"produit_id": "...", "quantite": 2, "prix": 3500},
--               {"description": "Pinces", "quantite": 1, "prix": 500}]
--              (« prix » facultatif pour un produit : prix de vente par défaut)
------------------------------------------------------------------
create or replace function public.enregistrer_vente(
  p_id           uuid,
  p_lignes       jsonb,
  p_montant_paye bigint,
  p_moyen        text default null,
  p_client       uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boutique   uuid := public.ma_boutique_id();
  v_ligne      jsonb;
  v_produit_id uuid;
  v_produit    record;
  v_quantite   integer;
  v_prix       integer;
  v_desc       text;
  v_total      bigint := 0;
begin
  if v_boutique is null then
    raise exception 'AUCUNE_BOUTIQUE' using errcode = '42501';
  end if;

  -- Déjà enregistrée (double clic, réseau qui renvoie) : on renvoie la même.
  if exists (select 1 from public.sales where id = p_id and business_id = v_boutique) then
    return p_id;
  end if;

  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'VENTE_VIDE' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_lignes) > 100 then
    raise exception 'TROP_DE_LIGNES' using errcode = 'P0001';
  end if;
  if p_montant_paye is null or p_montant_paye < 0 then
    raise exception 'MONTANT_INVALIDE' using errcode = 'P0001';
  end if;
  if p_montant_paye > 0 and (p_moyen is null or p_moyen not in ('especes', 'wave', 'orange_money', 'autre')) then
    raise exception 'MOYEN_INVALIDE' using errcode = 'P0001';
  end if;
  if p_client is not null and not exists (
    select 1 from public.customers where id = p_client and business_id = v_boutique and not archived
  ) then
    raise exception 'CLIENT_INTROUVABLE' using errcode = 'P0001';
  end if;

  insert into public.sales (id, business_id, customer_id)
  values (p_id, v_boutique, p_client);

  for v_ligne in select * from jsonb_array_elements(p_lignes) loop
    v_quantite := (v_ligne ->> 'quantite')::integer;
    if v_quantite is null or v_quantite < 1 or v_quantite > 10000 then
      raise exception 'QUANTITE_INVALIDE' using errcode = 'P0001';
    end if;

    v_produit_id := nullif(v_ligne ->> 'produit_id', '')::uuid;

    if v_produit_id is not null then
      select id, name, selling_price, stock_quantity into v_produit
        from public.products
       where id = v_produit_id and business_id = v_boutique and not archived
         for update;
      if not found then
        raise exception 'PRODUIT_INTROUVABLE' using errcode = 'P0001';
      end if;
      if v_produit.stock_quantity < v_quantite then
        raise exception 'STOCK_INSUFFISANT' using errcode = 'P0001', detail = v_produit.name;
      end if;
      v_prix := coalesce((v_ligne ->> 'prix')::integer, v_produit.selling_price);
      v_desc := v_produit.name;
    else
      v_desc := btrim(v_ligne ->> 'description');
      v_prix := (v_ligne ->> 'prix')::integer;
      if v_desc is null or v_desc = '' or v_prix is null then
        raise exception 'LIGNE_INVALIDE' using errcode = 'P0001';
      end if;
    end if;

    if v_prix < 0 or v_prix > 100000000 then
      raise exception 'PRIX_INVALIDE' using errcode = 'P0001';
    end if;

    insert into public.sale_items (business_id, sale_id, product_id, description, quantity, unit_price)
    values (v_boutique, p_id, v_produit_id, left(v_desc, 80), v_quantite, v_prix);

    if v_produit_id is not null then
      insert into public.stock_movements (business_id, product_id, type, quantity, sale_id)
      values (v_boutique, v_produit_id, 'vente', -v_quantite, p_id);
    end if;

    v_total := v_total + v_quantite::bigint * v_prix;
  end loop;

  if p_montant_paye > v_total then
    raise exception 'TROP_PAYE' using errcode = 'P0001';
  end if;
  if p_montant_paye < v_total and p_client is null then
    raise exception 'CLIENT_REQUIS' using errcode = 'P0001';
  end if;

  update public.sales set total_amount = v_total where id = p_id;

  if p_montant_paye > 0 then
    insert into public.payments (business_id, sale_id, customer_id, amount, payment_method)
    values (v_boutique, p_id, p_client, p_montant_paye, p_moyen);
  end if;

  return p_id;
end;
$$;

revoke all on function public.enregistrer_vente(uuid, jsonb, bigint, text, uuid) from public, anon;
grant execute on function public.enregistrer_vente(uuid, jsonb, bigint, text, uuid) to authenticated;

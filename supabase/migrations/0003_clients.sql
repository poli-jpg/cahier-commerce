-- 0003 — Clients
-- Téléphone stocké sur 9 chiffres sans indicatif (ex. 771234567), facultatif.
-- Pas d'unicité sur le téléphone : une mère et sa fille peuvent partager un numéro.
-- L'application prévient simplement quand le numéro existe déjà.

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.ma_boutique_id()
              references public.businesses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  phone       text check (phone ~ '^[0-9]{9}$'),
  address     text check (char_length(address) <= 120),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (business_id, id)
);

create index customers_boutique_nom on public.customers (business_id, lower(name)) where not archived;
create index customers_boutique_tel on public.customers (business_id, phone) where not archived;

alter table public.customers enable row level security;

create policy "clients_lecture" on public.customers for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "clients_ajout" on public.customers for insert to authenticated
  with check (business_id = (select public.ma_boutique_id()));
create policy "clients_modif" on public.customers for update to authenticated
  using (business_id = (select public.ma_boutique_id()))
  with check (business_id = (select public.ma_boutique_id()));
-- Pas de suppression : un client peut avoir des ventes et des dettes. On l'archive.

revoke insert, update, delete on public.customers from anon, authenticated;
grant insert (name, phone, address) on public.customers to authenticated;
grant update (name, phone, address, archived) on public.customers to authenticated;

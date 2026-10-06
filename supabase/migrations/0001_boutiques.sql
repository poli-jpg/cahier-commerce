-- 0001 — Boutiques
-- Une boutique appartient à un seul compte (MVP : un compte = une boutique).
-- Toutes les tables suivantes (clients, produits, ventes…) pointeront vers businesses.id.

create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  type        text not null default 'cosmetiques'
              check (type in ('cosmetiques', 'alimentation', 'autre')),
  created_at  timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- Chaque commerçant ne voit et ne modifie que SA boutique.
create policy "proprietaire_lit_sa_boutique"
  on public.businesses for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "proprietaire_cree_sa_boutique"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "proprietaire_modifie_sa_boutique"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Pas de politique DELETE : on ne supprime pas une boutique depuis l'application.

-- Renvoie l'id de la boutique du compte connecté.
-- Servira dans les politiques RLS des prochaines tables :
--   using (business_id = public.ma_boutique_id())
create or replace function public.ma_boutique_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.businesses where owner_id = (select auth.uid())
$$;

revoke all on function public.ma_boutique_id() from public, anon;
grant execute on function public.ma_boutique_id() to authenticated;

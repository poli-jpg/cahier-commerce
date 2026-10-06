-- 0002 — Catégories, produits et mouvements de stock
-- Règle clé : le stock ne se modifie JAMAIS directement.
-- Chaque changement passe par une ligne dans stock_movements (historique),
-- et un trigger met à jour products.stock_quantity.
-- Montants en FCFA entiers (pas de centimes) : aucun arrondi possible.

------------------------------------------------------------------
-- Catégories (créées par la commerçante)
------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.ma_boutique_id()
              references public.businesses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  created_at  timestamptz not null default now(),
  unique (business_id, id)
);

create unique index categories_nom_unique
  on public.categories (business_id, lower(name));

------------------------------------------------------------------
-- Produits
------------------------------------------------------------------
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null default public.ma_boutique_id()
                      references public.businesses (id) on delete cascade,
  category_id         uuid,
  name                text not null check (char_length(btrim(name)) between 1 and 80),
  selling_price       integer not null check (selling_price >= 0),
  purchase_price      integer check (purchase_price >= 0),
  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  archived            boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (business_id, id),
  -- La catégorie doit appartenir à la même boutique que le produit.
  foreign key (business_id, category_id)
    references public.categories (business_id, id)
    on delete set null (category_id)
);

create index products_boutique on public.products (business_id) where not archived;
create unique index products_nom_actif_unique
  on public.products (business_id, lower(name)) where not archived;

------------------------------------------------------------------
-- Mouvements de stock (historique, jamais modifié ni supprimé)
------------------------------------------------------------------
create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.ma_boutique_id()
              references public.businesses (id) on delete cascade,
  product_id  uuid not null,
  type        text not null
              check (type in ('entree', 'ajustement', 'vente', 'annulation_vente')),
  quantity    integer not null check (quantity <> 0),  -- + entrée, − sortie
  note        text check (char_length(note) <= 200),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (type <> 'entree' or quantity > 0),
  foreign key (business_id, product_id)
    references public.products (business_id, id) on delete cascade
);

create index stock_movements_produit
  on public.stock_movements (product_id, created_at desc);

-- Applique chaque mouvement au stock du produit.
-- Si le stock devient négatif, la contrainte check fait échouer le mouvement.
create or replace function public.appliquer_mouvement_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products
     set stock_quantity = stock_quantity + new.quantity
   where id = new.product_id
     and business_id = new.business_id;
  return new;
end;
$$;

create trigger mouvement_stock_applique
  after insert on public.stock_movements
  for each row execute function public.appliquer_mouvement_stock();

------------------------------------------------------------------
-- Sécurité : RLS (chaque boutique ne voit que ses lignes)
------------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.stock_movements enable row level security;

create policy "categories_lecture" on public.categories for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "categories_ajout" on public.categories for insert to authenticated
  with check (business_id = (select public.ma_boutique_id()));
create policy "categories_modif" on public.categories for update to authenticated
  using (business_id = (select public.ma_boutique_id()))
  with check (business_id = (select public.ma_boutique_id()));
create policy "categories_suppression" on public.categories for delete to authenticated
  using (business_id = (select public.ma_boutique_id()));

create policy "produits_lecture" on public.products for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
create policy "produits_ajout" on public.products for insert to authenticated
  with check (business_id = (select public.ma_boutique_id()));
create policy "produits_modif" on public.products for update to authenticated
  using (business_id = (select public.ma_boutique_id()))
  with check (business_id = (select public.ma_boutique_id()));
-- Pas de suppression de produit : on l'archive (il peut figurer dans d'anciennes ventes).

create policy "mouvements_lecture" on public.stock_movements for select to authenticated
  using (business_id = (select public.ma_boutique_id()));
-- Depuis l'application : seulement entrées et corrections.
-- Les mouvements « vente » viendront de la fonction d'enregistrement des ventes.
create policy "mouvements_ajout" on public.stock_movements for insert to authenticated
  with check (
    business_id = (select public.ma_boutique_id())
    and type in ('entree', 'ajustement')
  );

-- Droits par colonne : impossible d'écrire stock_quantity ou business_id à la main.
revoke insert, update, delete on public.products from anon, authenticated;
grant insert (category_id, name, selling_price, purchase_price, low_stock_threshold)
  on public.products to authenticated;
grant update (category_id, name, selling_price, purchase_price, low_stock_threshold, archived)
  on public.products to authenticated;

revoke insert, update, delete on public.stock_movements from anon, authenticated;
grant insert (product_id, type, quantity, note) on public.stock_movements to authenticated;

revoke insert, update on public.categories from anon, authenticated;
grant insert (name) on public.categories to authenticated;
grant update (name) on public.categories to authenticated;

------------------------------------------------------------------
-- Fonctions appelées par l'application (RPC)
------------------------------------------------------------------

-- Crée un produit ET son stock de départ en une seule transaction.
create or replace function public.creer_produit(
  p_nom           text,
  p_prix_vente    integer,
  p_categorie     uuid    default null,
  p_prix_achat    integer default null,
  p_seuil         integer default 3,
  p_stock_initial integer default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_stock_initial, 0) < 0 then
    raise exception 'Le stock de départ ne peut pas être négatif' using errcode = '22023';
  end if;

  insert into public.products (name, selling_price, category_id, purchase_price, low_stock_threshold)
  values (btrim(p_nom), p_prix_vente, p_categorie, p_prix_achat, coalesce(p_seuil, 3))
  returning id into v_id;

  if coalesce(p_stock_initial, 0) > 0 then
    insert into public.stock_movements (product_id, type, quantity, note)
    values (v_id, 'entree', p_stock_initial, 'Stock de départ');
  end if;

  return v_id;
end;
$$;

-- Après un comptage : enregistre l'écart (+/−) comme correction visible.
create or replace function public.corriger_stock(
  p_produit       uuid,
  p_nouveau_stock integer,
  p_note          text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actuel integer;
  v_ecart  integer;
begin
  if p_nouveau_stock is null or p_nouveau_stock < 0 then
    raise exception 'Le stock compté ne peut pas être négatif' using errcode = '22023';
  end if;

  select stock_quantity into v_actuel
    from public.products
   where id = p_produit and not archived
     for update;

  if not found then
    raise exception 'Produit introuvable' using errcode = 'P0002';
  end if;

  v_ecart := p_nouveau_stock - v_actuel;

  if v_ecart <> 0 then
    insert into public.stock_movements (product_id, type, quantity, note)
    values (p_produit, 'ajustement', v_ecart,
            coalesce(nullif(btrim(p_note), ''), 'Correction après comptage'));
  end if;

  return v_ecart;
end;
$$;

revoke all on function public.creer_produit(text, integer, uuid, integer, integer, integer) from public, anon;
revoke all on function public.corriger_stock(uuid, integer, text) from public, anon;
grant execute on function public.creer_produit(text, integer, uuid, integer, integer, integer) to authenticated;
grant execute on function public.corriger_stock(uuid, integer, text) to authenticated;

------------------------------------------------------------------
-- Catégories de départ selon le type de boutique (modifiables ensuite)
------------------------------------------------------------------
create or replace function public.categories_depart(p_type text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'cosmetiques'  then array['Visage', 'Corps', 'Cheveux', 'Parfums', 'Maquillage']
    when 'alimentation' then array['Épicerie', 'Boissons', 'Hygiène']
    else array[]::text[]
  end
$$;

create or replace function public.creer_categories_depart()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (business_id, name)
  select new.id, c from unnest(public.categories_depart(new.type)) as c;
  return new;
end;
$$;

create trigger boutique_categories_depart
  after insert on public.businesses
  for each row execute function public.creer_categories_depart();

-- Boutiques déjà créées pendant les tests de l'étape 1.
insert into public.categories (business_id, name)
select b.id, c
  from public.businesses b
  cross join lateral unnest(public.categories_depart(b.type)) as c
 where not exists (select 1 from public.categories x where x.business_id = b.id);

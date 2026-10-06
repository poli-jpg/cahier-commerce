-- 0007 — Validation des comptes, abonnement et espace admin
-- * Chaque nouvelle boutique attend ta validation (statut « en_attente »).
-- * À la validation : 30 jours d'essai. Ensuite, abonnement prolongé par toi.
-- * Boutique en attente, refusée ou expirée : plus aucun accès aux données
--   (elles restent conservées). Le blocage est dans ma_boutique_id(), utilisée
--   par TOUTES les règles RLS et toutes les fonctions : rien ne passe à côté.
-- * L'admin ne voit que des totaux par boutique, jamais les clients ni les dettes.

------------------------------------------------------------------
-- Boutiques : téléphone, statut du compte, fin d'abonnement
------------------------------------------------------------------
alter table public.businesses
  add column phone               text check (phone ~ '^[0-9]{9}$'),
  add column statut_compte       text not null default 'en_attente'
                                 check (statut_compte in ('en_attente', 'valide', 'refuse')),
  add column abonnement_jusqu_au date,
  add column valide_le           timestamptz;

-- Boutiques déjà créées (tests + la boutique de cosmétiques) : validées,
-- 30 jours d'essai à partir d'aujourd'hui.
update public.businesses
   set statut_compte = 'valide', abonnement_jusqu_au = current_date + 30, valide_le = now();

alter table public.businesses
  add check (statut_compte <> 'valide' or abonnement_jusqu_au is not null);

-- La commerçante choisit le nom, le type et le téléphone. Jamais son statut
-- ni sa date d'abonnement.
revoke insert, update on public.businesses from anon, authenticated;
grant insert (owner_id, name, type, phone) on public.businesses to authenticated;
grant update (name, phone) on public.businesses to authenticated;

-- Boutique utilisable seulement si validée ET abonnement en cours.
create or replace function public.ma_boutique_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.businesses
   where owner_id = (select auth.uid())
     and statut_compte = 'valide'
     and abonnement_jusqu_au >= current_date
$$;

------------------------------------------------------------------
-- Administrateurs (toi)
------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Aucune règle : personne ne lit ni n'écrit cette table depuis l'application.
revoke all on public.admins from anon, authenticated;

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

------------------------------------------------------------------
-- Fonctions de l'espace admin (chacune vérifie est_admin)
------------------------------------------------------------------
create or replace function public.admin_boutiques()
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
  nb_clients          bigint
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
         (select count(*) from public.customers c where c.business_id = b.id and not c.archived)
    from public.businesses b
    join auth.users u on u.id = b.owner_id
   order by (b.statut_compte = 'en_attente') desc, b.created_at desc;
end;
$$;

-- Valider : démarre 30 jours d'essai (sans toucher à une date déjà fixée).
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
         abonnement_jusqu_au = coalesce(abonnement_jusqu_au, current_date + 30),
         valide_le = coalesce(valide_le, now())
   where id = p_boutique
  returning abonnement_jusqu_au into v_fin;
  if v_fin is null then
    raise exception 'BOUTIQUE_INTROUVABLE' using errcode = 'P0001';
  end if;
  return v_fin;
end;
$$;

create or replace function public.admin_refuser(p_boutique uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.businesses set statut_compte = 'refuse' where id = p_boutique;
  if not found then
    raise exception 'BOUTIQUE_INTROUVABLE' using errcode = 'P0001';
  end if;
end;
$$;

-- Prolonger de N mois, à partir de la fin actuelle (ou d'aujourd'hui si déjà expiré).
create or replace function public.admin_prolonger(p_boutique uuid, p_mois integer)
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
  if p_mois is null or p_mois < 1 or p_mois > 24 then
    raise exception 'DUREE_INVALIDE' using errcode = 'P0001';
  end if;
  update public.businesses
     set abonnement_jusqu_au =
           (greatest(coalesce(abonnement_jusqu_au, current_date), current_date)
            + make_interval(months => p_mois))::date,
         statut_compte = 'valide',
         valide_le = coalesce(valide_le, now())
   where id = p_boutique
  returning abonnement_jusqu_au into v_fin;
  if v_fin is null then
    raise exception 'BOUTIQUE_INTROUVABLE' using errcode = 'P0001';
  end if;
  return v_fin;
end;
$$;

-- Suspendre : l'abonnement se termine hier (données conservées).
create or replace function public.admin_suspendre(p_boutique uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.businesses
     set abonnement_jusqu_au = current_date - 1
   where id = p_boutique and statut_compte = 'valide';
  if not found then
    raise exception 'BOUTIQUE_INTROUVABLE' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.est_admin() from public, anon;
revoke all on function public.admin_boutiques() from public, anon;
revoke all on function public.admin_valider(uuid) from public, anon;
revoke all on function public.admin_refuser(uuid) from public, anon;
revoke all on function public.admin_prolonger(uuid, integer) from public, anon;
revoke all on function public.admin_suspendre(uuid) from public, anon;
grant execute on function public.est_admin() to authenticated;
grant execute on function public.admin_boutiques() to authenticated;
grant execute on function public.admin_valider(uuid) to authenticated;
grant execute on function public.admin_refuser(uuid) to authenticated;
grant execute on function public.admin_prolonger(uuid, integer) to authenticated;
grant execute on function public.admin_suspendre(uuid) to authenticated;

------------------------------------------------------------------
-- À FAIRE UNE FOIS, À LA MAIN (remplace par TON e-mail de connexion) :
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'ton-email@exemple.com';
------------------------------------------------------------------

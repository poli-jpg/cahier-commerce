-- 0010 — Espace admin complet
--  * Plan : « Essai gratuit » jusqu'à la 1re prolongation, puis « Pro ».
--    Chaque prolongation est gardée dans abonnement_historique.
--  * Actif = au moins une vente dans les 7 derniers jours.
--  * Par boutique : ventes totales, montant total, Lebalma en cours (totaux seulement).
--  * Demandes d'aide envoyées depuis l'appli, à traiter par l'admin.
--  * Comptes inscrits qui n'ont pas encore créé leur boutique.
--  * Statistiques globales du SaaS.

------------------------------------------------------------------
-- Historique des prolongations (= abonnements payés)
------------------------------------------------------------------
create table public.abonnement_historique (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  mois        integer not null check (mois between 1 and 24),
  nouvelle_fin date not null,
  par         uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index abonnement_historique_boutique on public.abonnement_historique (business_id);
alter table public.abonnement_historique enable row level security;
revoke all on public.abonnement_historique from anon, authenticated;

-- Prolonger : même effet qu'avant, et la prolongation est enregistrée.
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
  insert into public.abonnement_historique (business_id, mois, nouvelle_fin, par)
  values (p_boutique, p_mois, v_fin, auth.uid());
  return v_fin;
end;
$$;

------------------------------------------------------------------
-- Demandes d'aide
------------------------------------------------------------------
create table public.demandes_aide (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  message     text not null check (char_length(btrim(message)) between 3 and 1000),
  statut      text not null default 'ouverte' check (statut in ('ouverte', 'traitee')),
  created_at  timestamptz not null default now(),
  traitee_le  timestamptz
);
create index demandes_aide_ouvertes on public.demandes_aide (created_at desc) where statut = 'ouverte';
alter table public.demandes_aide enable row level security;
revoke all on public.demandes_aide from anon, authenticated;

-- Depuis l'appli : n'importe quel compte connecté peut écrire (même en attente).
create or replace function public.envoyer_demande_aide(p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_message text := btrim(p_message);
begin
  if auth.uid() is null then
    raise exception 'NON_CONNECTE' using errcode = '42501';
  end if;
  if v_message is null or char_length(v_message) < 3 or char_length(v_message) > 1000 then
    raise exception 'MESSAGE_INVALIDE' using errcode = 'P0001';
  end if;
  -- Limite anti-abus : 10 demandes par jour et par compte.
  if (select count(*) from public.demandes_aide
       where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'TROP_DE_DEMANDES' using errcode = 'P0001';
  end if;
  insert into public.demandes_aide (user_id, business_id, message)
  values (auth.uid(), (select id from public.businesses where owner_id = auth.uid()), v_message)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_demandes()
returns table (
  id         uuid,
  message    text,
  statut     text,
  created_at timestamptz,
  traitee_le timestamptz,
  email      text,
  boutique   text,
  telephone  text
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
  select d.id, d.message, d.statut, d.created_at, d.traitee_le, u.email::text, b.name, b.phone
    from public.demandes_aide d
    join auth.users u on u.id = d.user_id
    left join public.businesses b on b.id = d.business_id
   order by (d.statut = 'ouverte') desc, d.created_at desc
   limit 200;
end;
$$;

create or replace function public.admin_traiter_demande(p_demande uuid, p_traitee boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;
  update public.demandes_aide
     set statut = case when p_traitee then 'traitee' else 'ouverte' end,
         traitee_le = case when p_traitee then now() else null end
   where id = p_demande;
  if not found then
    raise exception 'DEMANDE_INTROUVABLE' using errcode = 'P0001';
  end if;
end;
$$;

------------------------------------------------------------------
-- Comptes inscrits sans boutique
------------------------------------------------------------------
create or replace function public.admin_comptes_sans_boutique()
returns table (email text, inscrit_le timestamptz, derniere_connexion timestamptz)
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
  select u.email::text, u.created_at, u.last_sign_in_at
    from auth.users u
   where not exists (select 1 from public.businesses b where b.owner_id = u.id)
     and not exists (select 1 from public.admins a where a.user_id = u.id)
   order by u.created_at desc;
end;
$$;

------------------------------------------------------------------
-- Liste des boutiques (enrichie)
------------------------------------------------------------------
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
  pro                 boolean,   -- au moins une prolongation (abonnement payé)
  mois_payes          bigint,
  actif               boolean,   -- au moins une vente ces 7 derniers jours
  ventes_total        bigint,
  montant_total       bigint,
  ventes_7j           bigint,
  montant_7j          bigint,
  lebalma             bigint,    -- total dû par ses clients en ce moment
  derniere_vente      timestamptz,
  nb_produits         bigint,
  nb_clients          bigint,
  par_jour            jsonb
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
         exists (select 1 from public.abonnement_historique h where h.business_id = b.id),
         (select coalesce(sum(h.mois), 0)::bigint from public.abonnement_historique h where h.business_id = b.id),
         exists (select 1 from public.sales s where s.business_id = b.id and s.created_at >= now() - interval '7 days'),
         (select count(*) from public.sales s where s.business_id = b.id),
         (select coalesce(sum(s.total_amount), 0)::bigint from public.sales s where s.business_id = b.id),
         (select count(*) from public.sales s
           where s.business_id = b.id and s.created_at >= now() - interval '7 days'),
         (select coalesce(sum(s.total_amount), 0)::bigint from public.sales s
           where s.business_id = b.id and s.created_at >= now() - interval '7 days'),
         (select coalesce(sum(s.remaining_amount), 0)::bigint from public.sales s
           where s.business_id = b.id and s.remaining_amount > 0),
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

------------------------------------------------------------------
-- Statistiques globales du SaaS
------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.est_admin() then
    raise exception 'ACCES_REFUSE' using errcode = '42501';
  end if;

  with b as (
    select bo.*,
           exists (select 1 from public.abonnement_historique h where h.business_id = bo.id) as pro,
           exists (select 1 from public.sales s where s.business_id = bo.id
                    and s.created_at >= now() - interval '7 days') as actif
      from public.businesses bo
  )
  select jsonb_build_object(
    'inscrits',          (select count(*) from auth.users u
                           where not exists (select 1 from public.admins a where a.user_id = u.id)),
    'sans_boutique',     (select count(*) from auth.users u
                           where not exists (select 1 from public.businesses x where x.owner_id = u.id)
                             and not exists (select 1 from public.admins a where a.user_id = u.id)),
    'boutiques',         (select count(*) from b),
    'a_valider',         (select count(*) from b where statut_compte = 'en_attente'),
    'essai',             (select count(*) from b where statut_compte = 'valide' and abonnement_jusqu_au >= current_date and not pro),
    'pro',               (select count(*) from b where statut_compte = 'valide' and abonnement_jusqu_au >= current_date and pro),
    'expirees',          (select count(*) from b where statut_compte = 'valide' and abonnement_jusqu_au < current_date),
    'refusees',          (select count(*) from b where statut_compte = 'refuse'),
    'actives',           (select count(*) from b where statut_compte = 'valide' and abonnement_jusqu_au >= current_date and actif),
    'inactives',         (select count(*) from b where statut_compte = 'valide' and abonnement_jusqu_au >= current_date and not actif),
    'ventes_total',      (select count(*) from public.sales),
    'montant_total',     (select coalesce(sum(total_amount), 0) from public.sales),
    'ventes_7j',         (select count(*) from public.sales where created_at >= now() - interval '7 days'),
    'montant_7j',        (select coalesce(sum(total_amount), 0) from public.sales where created_at >= now() - interval '7 days'),
    'lebalma_total',     (select coalesce(sum(remaining_amount), 0) from public.sales where remaining_amount > 0),
    'produits',          (select count(*) from public.products where not archived),
    'clients',           (select count(*) from public.customers where not archived),
    'mois_vendus',       (select coalesce(sum(mois), 0) from public.abonnement_historique),
    'demandes_ouvertes', (select count(*) from public.demandes_aide where statut = 'ouverte')
  ) into v;
  return v;
end;
$$;

------------------------------------------------------------------
-- Droits
------------------------------------------------------------------
revoke all on function public.envoyer_demande_aide(text) from public, anon;
revoke all on function public.admin_demandes() from public, anon;
revoke all on function public.admin_traiter_demande(uuid, boolean) from public, anon;
revoke all on function public.admin_comptes_sans_boutique() from public, anon;
revoke all on function public.admin_boutiques() from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.envoyer_demande_aide(text) to authenticated;
grant execute on function public.admin_demandes() to authenticated;
grant execute on function public.admin_traiter_demande(uuid, boolean) to authenticated;
grant execute on function public.admin_comptes_sans_boutique() to authenticated;
grant execute on function public.admin_boutiques() to authenticated;
grant execute on function public.admin_stats() to authenticated;

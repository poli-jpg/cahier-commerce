-- 0005 — Lebalma : versements et corrections
-- * Un « versement » = l'argent donné en une fois par un client.
--   Il peut couvrir plusieurs achats : il règle d'abord les plus anciens.
--   Chaque part est une ligne de payments, reliée par versement_id.
-- * Un paiement n'est jamais supprimé : en cas d'erreur, il est ANNULÉ
--   (date + motif) et la dette se recalcule. La trace reste visible.
-- * Invariant : sales.paid_amount = somme des paiements NON annulés.

alter table public.payments
  add column versement_id  uuid not null default gen_random_uuid(),
  add column cancelled_at  timestamptz,
  add column cancel_reason text check (char_length(cancel_reason) <= 200),
  add check ((cancelled_at is null) = (cancel_reason is null));

create index payments_versement on public.payments (versement_id);
create index payments_client on public.payments (customer_id, created_at desc) where customer_id is not null;

------------------------------------------------------------------
-- Enregistrer un versement d'un client sur ses dettes
--   p_versement : identifiant créé par l'application (anti double envoi)
--   Renvoie ce que le client doit encore après le versement.
------------------------------------------------------------------
create or replace function public.enregistrer_paiement(
  p_versement uuid,
  p_client    uuid,
  p_montant   bigint,
  p_moyen     text,
  p_note      text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boutique uuid := public.ma_boutique_id();
  v_dette    bigint;
  v_reste    bigint := p_montant;
  v_vente    record;
  v_part     bigint;
  v_note     text := nullif(btrim(p_note), '');
begin
  if v_boutique is null then
    raise exception 'AUCUNE_BOUTIQUE' using errcode = '42501';
  end if;

  -- Déjà enregistré (double appui) : on ne recommence pas.
  if exists (select 1 from public.payments where versement_id = p_versement and business_id = v_boutique) then
    return (select coalesce(sum(remaining_amount), 0) from public.sales
             where business_id = v_boutique and customer_id = p_client);
  end if;

  if p_montant is null or p_montant <= 0 then
    raise exception 'MONTANT_INVALIDE' using errcode = 'P0001';
  end if;
  if p_moyen is null or p_moyen not in ('especes', 'wave', 'orange_money', 'autre') then
    raise exception 'MOYEN_INVALIDE' using errcode = 'P0001';
  end if;
  if char_length(v_note) > 200 then
    raise exception 'NOTE_TROP_LONGUE' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers where id = p_client and business_id = v_boutique) then
    raise exception 'CLIENT_INTROUVABLE' using errcode = 'P0001';
  end if;

  -- Verrouille les ventes non soldées du client (deux paiements simultanés
  -- ne peuvent pas dépasser la dette).
  perform 1 from public.sales
   where business_id = v_boutique and customer_id = p_client and paid_amount < total_amount
     for update;

  select coalesce(sum(remaining_amount), 0) into v_dette
    from public.sales
   where business_id = v_boutique and customer_id = p_client and paid_amount < total_amount;

  if v_dette = 0 then
    raise exception 'AUCUNE_DETTE' using errcode = 'P0001';
  end if;
  if p_montant > v_dette then
    raise exception 'TROP_PAYE' using errcode = 'P0001', detail = v_dette::text;
  end if;

  -- Les achats les plus anciens d'abord.
  for v_vente in
    select id, remaining_amount from public.sales
     where business_id = v_boutique and customer_id = p_client and paid_amount < total_amount
     order by created_at, id
  loop
    v_part := least(v_reste, v_vente.remaining_amount);
    insert into public.payments (business_id, sale_id, customer_id, amount, payment_method, note, versement_id)
    values (v_boutique, v_vente.id, p_client, v_part, p_moyen, v_note, p_versement);
    v_reste := v_reste - v_part;
    exit when v_reste = 0;
  end loop;

  return v_dette - p_montant;
end;
$$;

------------------------------------------------------------------
-- Annuler un versement saisi par erreur (trace conservée)
------------------------------------------------------------------
create or replace function public.annuler_versement(
  p_versement uuid,
  p_motif     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_boutique uuid := public.ma_boutique_id();
  v_motif    text := nullif(btrim(p_motif), '');
  v_paiement record;
  v_nombre   integer := 0;
begin
  if v_boutique is null then
    raise exception 'AUCUNE_BOUTIQUE' using errcode = '42501';
  end if;
  if v_motif is null or char_length(v_motif) > 200 then
    raise exception 'MOTIF_REQUIS' using errcode = 'P0001';
  end if;

  for v_paiement in
    select id, sale_id, amount from public.payments
     where versement_id = p_versement and business_id = v_boutique and cancelled_at is null
       for update
  loop
    update public.payments
       set cancelled_at = now(), cancel_reason = v_motif
     where id = v_paiement.id;
    update public.sales
       set paid_amount = paid_amount - v_paiement.amount
     where id = v_paiement.sale_id and business_id = v_boutique;
    v_nombre := v_nombre + 1;
  end loop;

  if v_nombre = 0 then
    raise exception 'VERSEMENT_INTROUVABLE' using errcode = 'P0001';
  end if;
  -- Une vente payée sans client qui redevient impayée est refusée
  -- à la fin de la transaction (CLIENT_REQUIS) : rien n'est annulé.
end;
$$;

revoke all on function public.enregistrer_paiement(uuid, uuid, bigint, text, text) from public, anon;
revoke all on function public.annuler_versement(uuid, text) from public, anon;
grant execute on function public.enregistrer_paiement(uuid, uuid, bigint, text, text) to authenticated;
grant execute on function public.annuler_versement(uuid, text) to authenticated;

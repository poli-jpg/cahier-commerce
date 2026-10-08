-- 0012 — Photos des produits
-- * Les photos sont dans le stockage Supabase, bucket « produits ».
-- * Chaque boutique a son dossier : <id_boutique>/<identifiant aléatoire>-<horodatage>.jpg
--   Une boutique ne peut écrire ou supprimer que dans SON dossier.
-- * Le bucket est public en lecture (une photo de crème n'est pas une donnée
--   sensible) : les adresses contiennent des identifiants impossibles à deviner.
-- * L'application compresse la photo avant l'envoi (~800 px, moins de 200 Ko).

------------------------------------------------------------------
-- Produits : chemin de la photo
------------------------------------------------------------------
alter table public.products
  add column image_path text
  check (
    image_path is null
    or (image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}-[0-9]+\.jpg$'
        and split_part(image_path, '/', 1) = business_id::text)
  );

grant update (image_path) on public.products to authenticated;

------------------------------------------------------------------
-- Stockage
------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produits', 'produits', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

create policy "photos_lecture_sa_boutique" on storage.objects
  for select to authenticated
  using (bucket_id = 'produits'
         and (storage.foldername(name))[1] = (select public.ma_boutique_id())::text);

create policy "photos_ajout_sa_boutique" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produits'
              and (storage.foldername(name))[1] = (select public.ma_boutique_id())::text);

create policy "photos_suppression_sa_boutique" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produits'
         and (storage.foldername(name))[1] = (select public.ma_boutique_id())::text);

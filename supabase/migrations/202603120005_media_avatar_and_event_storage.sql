-- Media maturity pass: add community avatars and event cover storage bucket.
-- Keeps storage policy style aligned with existing own-prefix bucket rules.

alter table public.communities
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists storage_media_read_public on storage.objects;
create policy storage_media_read_public
on storage.objects
for select
to public
using (bucket_id in ('avatars', 'listing-images', 'event-images'));

drop policy if exists storage_media_insert_own_prefix on storage.objects;
create policy storage_media_insert_own_prefix
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('avatars', 'listing-images', 'event-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists storage_media_update_own_prefix on storage.objects;
create policy storage_media_update_own_prefix
on storage.objects
for update
to authenticated
using (
  bucket_id in ('avatars', 'listing-images', 'event-images')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('avatars', 'listing-images', 'event-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists storage_media_delete_own_prefix on storage.objects;
create policy storage_media_delete_own_prefix
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('avatars', 'listing-images', 'event-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

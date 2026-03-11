-- NU Atrium MVP Foundation (Phase 1)
-- RLS, policies, and storage bucket/policies.

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.saved_listings enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.saved_events enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy listings_select_active_or_owner
on public.listings
for select
to authenticated
using (status = 'active' or seller_id = auth.uid());

create policy listings_insert_owner
on public.listings
for insert
to authenticated
with check (seller_id = auth.uid());

create policy listings_update_owner
on public.listings
for update
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

create policy listings_delete_owner
on public.listings
for delete
to authenticated
using (seller_id = auth.uid());

create policy listing_images_select_visible_parent
on public.listing_images
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or l.seller_id = auth.uid())
  )
);

create policy listing_images_insert_owner
on public.listing_images
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);

create policy listing_images_update_owner
on public.listing_images
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);

create policy listing_images_delete_owner
on public.listing_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = auth.uid()
  )
);

create policy saved_listings_select_own
on public.saved_listings
for select
to authenticated
using (auth.uid() = user_id);

create policy saved_listings_insert_own
on public.saved_listings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy saved_listings_delete_own
on public.saved_listings
for delete
to authenticated
using (auth.uid() = user_id);

create policy events_select_published_or_admin
on public.events
for select
to authenticated
using (is_published = true or public.is_admin());

create policy events_insert_admin
on public.events
for insert
to authenticated
with check (public.is_admin());

create policy events_update_admin
on public.events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy events_delete_admin
on public.events
for delete
to authenticated
using (public.is_admin());

create policy event_participants_select_own
on public.event_participants
for select
to authenticated
using (auth.uid() = user_id);

create policy event_participants_insert_own
on public.event_participants
for insert
to authenticated
with check (auth.uid() = user_id);

create policy event_participants_update_own
on public.event_participants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy event_participants_delete_own
on public.event_participants
for delete
to authenticated
using (auth.uid() = user_id);

create policy saved_events_select_own
on public.saved_events
for select
to authenticated
using (auth.uid() = user_id);

create policy saved_events_insert_own
on public.saved_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy saved_events_delete_own
on public.saved_events
for delete
to authenticated
using (auth.uid() = user_id);

create policy communities_select_authenticated
on public.communities
for select
to authenticated
using (true);

create policy communities_insert_authenticated
on public.communities
for insert
to authenticated
with check (created_by = auth.uid());

create policy communities_update_creator
on public.communities
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy communities_delete_creator
on public.communities
for delete
to authenticated
using (created_by = auth.uid());

create policy community_members_select_self_or_community_owner
on public.community_members
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
);

create policy community_members_insert_self
on public.community_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role = 'member'
  and (
    status = 'pending'
    or (
      status = 'joined'
      and exists (
        select 1
        from public.communities c
        where c.id = community_id
          and c.join_type = 'open'
      )
    )
  )
);

create policy community_members_update_owner_moderation
on public.community_members
for update
to authenticated
using (
  exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
);

create policy community_members_update_self_leave
on public.community_members
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and role = 'member'
  and status = 'left'
);

create policy notifications_select_own
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

create policy notifications_update_own
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy storage_media_read_public
on storage.objects
for select
to public
using (bucket_id in ('avatars', 'listing-images'));

create policy storage_media_insert_own_prefix
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('avatars', 'listing-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy storage_media_update_own_prefix
on storage.objects
for update
to authenticated
using (
  bucket_id in ('avatars', 'listing-images')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('avatars', 'listing-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy storage_media_delete_own_prefix
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('avatars', 'listing-images')
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Moderation-lite MVP:
-- - minimal user reports
-- - hide/unhide controls for existing content domains
-- - internal admin review visibility

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.content_reports
  add column if not exists note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_reports_target_type_check'
      and conrelid = 'public.content_reports'::regclass
  ) then
    alter table public.content_reports
      add constraint content_reports_target_type_check
      check (target_type in ('listing', 'event', 'community', 'community_post'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_reports_reason_check'
      and conrelid = 'public.content_reports'::regclass
  ) then
    alter table public.content_reports
      add constraint content_reports_reason_check
      check (reason in ('spam', 'scam', 'harassment', 'inappropriate', 'misleading', 'other'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_reports_note_length_check'
      and conrelid = 'public.content_reports'::regclass
  ) then
    alter table public.content_reports
      add constraint content_reports_note_length_check
      check (char_length(coalesce(note, '')) <= 240);
  end if;
end;
$$;

create unique index if not exists content_reports_reporter_target_unique_idx
  on public.content_reports (reporter_id, target_type, target_id);

create index if not exists content_reports_created_at_idx
  on public.content_reports (created_at desc);

create index if not exists content_reports_target_lookup_idx
  on public.content_reports (target_type, target_id);

alter table public.listings
  add column if not exists is_hidden boolean not null default false;

alter table public.events
  add column if not exists is_hidden boolean not null default false;

alter table public.communities
  add column if not exists is_hidden boolean not null default false;

alter table public.community_posts
  add column if not exists is_hidden boolean not null default false;

alter table public.content_reports enable row level security;

drop policy if exists listings_select_active_or_owner on public.listings;
drop policy if exists listings_select_active_visible_or_owner_admin on public.listings;
create policy listings_select_active_or_owner
on public.listings
for select
to authenticated
using (
  (
    status = 'active'
    and is_hidden = false
  )
  or seller_id = auth.uid()
  or public.is_admin()
);

drop policy if exists listing_images_select_visible_parent on public.listing_images;
drop policy if exists listing_images_select_visible_parent_or_owner_admin on public.listing_images;
create policy listing_images_select_visible_parent
on public.listing_images
for select
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and (
        (
          l.status = 'active'
          and l.is_hidden = false
        )
        or l.seller_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists listings_update_admin_moderation on public.listings;
create policy listings_update_admin_moderation
on public.listings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists events_select_published_or_admin on public.events;
drop policy if exists events_select_published_owner_or_admin on public.events;
drop policy if exists events_select_published_visible_owner_or_admin on public.events;
create policy events_select_published_owner_or_admin
on public.events
for select
to authenticated
using (
  (
    is_published = true
    and is_hidden = false
  )
  or created_by = auth.uid()
  or public.is_admin()
);

drop policy if exists communities_select_authenticated on public.communities;
drop policy if exists communities_select_visible_or_owner_admin on public.communities;
create policy communities_select_visible_or_owner_admin
on public.communities
for select
to authenticated
using (
  is_hidden = false
  or created_by = auth.uid()
  or public.is_admin()
);

drop policy if exists communities_update_admin_moderation on public.communities;
create policy communities_update_admin_moderation
on public.communities
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists community_posts_select_visible_community on public.community_posts;
drop policy if exists community_posts_select_visible_or_owner_admin on public.community_posts;
create policy community_posts_select_visible_or_owner_admin
on public.community_posts
for select
to authenticated
using (
  (
    is_hidden = false
    and exists (
      select 1
      from public.communities c
      where c.id = community_id
        and (
          c.is_hidden = false
          or c.created_by = auth.uid()
          or public.is_admin()
        )
    )
  )
  or author_id = auth.uid()
  or exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists community_posts_update_admin_moderation on public.community_posts;
create policy community_posts_update_admin_moderation
on public.community_posts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists content_reports_select_admin on public.content_reports;
drop policy if exists content_reports_insert_self on public.content_reports;
drop policy if exists content_reports_delete_admin on public.content_reports;

create policy content_reports_select_admin
on public.content_reports
for select
to authenticated
using (public.is_admin());

create policy content_reports_insert_self
on public.content_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and (
    (
      target_type = 'listing'
      and exists (
        select 1
        from public.listings l
        where l.id = target_id
          and l.seller_id <> auth.uid()
      )
    )
    or (
      target_type = 'event'
      and exists (
        select 1
        from public.events e
        where e.id = target_id
          and coalesce(e.created_by::text, '') <> auth.uid()::text
      )
    )
    or (
      target_type = 'community'
      and exists (
        select 1
        from public.communities c
        where c.id = target_id
          and c.created_by <> auth.uid()
      )
    )
    or (
      target_type = 'community_post'
      and exists (
        select 1
        from public.community_posts cp
        where cp.id = target_id
          and cp.author_id <> auth.uid()
      )
    )
  )
);

create policy content_reports_delete_admin
on public.content_reports
for delete
to authenticated
using (public.is_admin());

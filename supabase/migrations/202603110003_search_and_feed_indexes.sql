-- Performance indexes for search and high-frequency feed queries.
-- Safe for MVP datasets; revisit and prune as data volume grows.

create extension if not exists pg_trgm;

-- Global search acceleration (ILIKE on active listings and published events).
create index if not exists listings_active_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops)
  where status = 'active';

create index if not exists listings_active_description_trgm_idx
  on public.listings using gin (description gin_trgm_ops)
  where status = 'active';

create index if not exists events_published_title_trgm_idx
  on public.events using gin (title gin_trgm_ops)
  where is_published = true;

create index if not exists events_published_description_trgm_idx
  on public.events using gin (description gin_trgm_ops)
  where is_published = true;

create index if not exists events_published_location_trgm_idx
  on public.events using gin (location gin_trgm_ops)
  where is_published = true;

-- Common list views ordered by recency for a single user/status scope.
create index if not exists profiles_onboarding_completed_created_at_idx
  on public.profiles (onboarding_completed, created_at desc);

create index if not exists saved_listings_user_created_at_idx
  on public.saved_listings (user_id, created_at desc);

create index if not exists saved_events_user_created_at_idx
  on public.saved_events (user_id, created_at desc);

create index if not exists event_participants_user_status_created_at_idx
  on public.event_participants (user_id, status, created_at desc);

create index if not exists community_members_user_status_created_at_idx
  on public.community_members (user_id, status, created_at desc);

create index if not exists community_members_community_status_created_at_idx
  on public.community_members (community_id, status, created_at desc);

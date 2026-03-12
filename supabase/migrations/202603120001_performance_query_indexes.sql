-- Incremental performance indexes for common list/search query paths.
-- Safe, additive changes intended for MVP-scale production workloads.

create extension if not exists pg_trgm;

-- Connect owner views and moderation screens.
create index if not exists communities_created_by_created_at_idx
  on public.communities (created_by, created_at desc);

-- Notifications feed for a single user ordered by recency.
create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

-- "My listings" views filtered by seller and status with recency sorting.
create index if not exists listings_seller_status_created_at_idx
  on public.listings (seller_id, status, created_at desc);

-- Complete trigram coverage for listing search fields used with ILIKE.
create index if not exists listings_active_category_trgm_idx
  on public.listings using gin (category gin_trgm_ops)
  where status = 'active';

create index if not exists listings_active_pickup_location_trgm_idx
  on public.listings using gin (pickup_location gin_trgm_ops)
  where status = 'active';

-- Complete trigram coverage for event search fields used with ILIKE.
create index if not exists events_published_category_trgm_idx
  on public.events using gin (category gin_trgm_ops)
  where is_published = true;

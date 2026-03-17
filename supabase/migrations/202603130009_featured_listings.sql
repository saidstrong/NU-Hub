alter table public.listings
  add column if not exists is_featured boolean not null default false;

create index if not exists listings_featured_active_created_at_idx
  on public.listings (created_at desc)
  where status = 'active' and is_hidden = false and is_featured = true;

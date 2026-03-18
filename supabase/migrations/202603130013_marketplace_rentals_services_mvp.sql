alter table public.listings
  add column if not exists listing_type text not null default 'sale',
  add column if not exists pricing_model text not null default 'fixed';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_listing_type_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_listing_type_check
      check (listing_type in ('sale', 'rental', 'service'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_pricing_model_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_pricing_model_check
      check (pricing_model in ('fixed', 'per_day', 'per_week', 'per_month', 'per_hour', 'starting_from'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_listing_type_pricing_model_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_listing_type_pricing_model_check
      check (
        (listing_type = 'sale' and pricing_model = 'fixed')
        or (listing_type = 'rental' and pricing_model in ('per_day', 'per_week', 'per_month'))
        or (listing_type = 'service' and pricing_model in ('fixed', 'per_hour', 'starting_from'))
      );
  end if;
end;
$$;

create index if not exists listings_active_visible_type_created_at_idx
  on public.listings (listing_type, created_at desc)
  where status = 'active' and is_hidden = false;

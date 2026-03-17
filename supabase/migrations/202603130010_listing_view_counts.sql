alter table public.listings
  add column if not exists view_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_view_count_nonnegative_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_view_count_nonnegative_check
      check (view_count >= 0);
  end if;
end;
$$;

create or replace function public.increment_listing_view_count(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  if auth.uid() is null then
    return null;
  end if;

  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and status = 'active'
    and is_hidden = false
    and seller_id <> auth.uid()
  returning view_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_listing_view_count(uuid) from public;
grant execute on function public.increment_listing_view_count(uuid) to authenticated;

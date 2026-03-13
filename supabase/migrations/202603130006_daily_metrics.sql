create table if not exists public.daily_metrics (
  day date primary key,
  active_users integer not null default 0,
  new_users integer not null default 0,
  friend_messages integer not null default 0,
  marketplace_messages integer not null default 0,
  listings_created integer not null default 0,
  community_posts integer not null default 0,
  event_rsvps integer not null default 0,
  notifications_created integer not null default 0,
  moderation_reports integer not null default 0,
  rate_limit_hits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_metrics enable row level security;

drop trigger if exists set_daily_metrics_updated_at on public.daily_metrics;
create trigger set_daily_metrics_updated_at
before update on public.daily_metrics
for each row execute function public.set_updated_at();

drop policy if exists daily_metrics_select_admin on public.daily_metrics;
drop policy if exists daily_metrics_insert_admin on public.daily_metrics;
drop policy if exists daily_metrics_update_admin on public.daily_metrics;
drop policy if exists daily_metrics_delete_admin on public.daily_metrics;

create policy daily_metrics_select_admin
on public.daily_metrics
for select
to authenticated
using (public.is_admin());

create policy daily_metrics_insert_admin
on public.daily_metrics
for insert
to authenticated
with check (public.is_admin());

create policy daily_metrics_update_admin
on public.daily_metrics
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy daily_metrics_delete_admin
on public.daily_metrics
for delete
to authenticated
using (public.is_admin());

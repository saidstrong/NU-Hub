create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  target_id text,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_created_at_idx
  on public.rate_limit_events (created_at desc);

alter table public.rate_limit_events enable row level security;

drop policy if exists rate_limit_events_select_admin on public.rate_limit_events;
create policy rate_limit_events_select_admin
on public.rate_limit_events
for select
to authenticated
using (public.is_admin());

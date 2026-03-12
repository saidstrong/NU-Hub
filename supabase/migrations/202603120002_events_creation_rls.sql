-- Event creation MVP: allow authenticated users to create events and view their own drafts.

drop policy if exists events_select_published_or_admin on public.events;
drop policy if exists events_insert_admin on public.events;
drop policy if exists events_select_published_owner_or_admin on public.events;
drop policy if exists events_insert_authenticated_creator on public.events;

create policy events_select_published_owner_or_admin
on public.events
for select
to authenticated
using (
  is_published = true
  or created_by = auth.uid()
  or public.is_admin()
);

create policy events_insert_authenticated_creator
on public.events
for insert
to authenticated
with check (created_by = auth.uid());

create index if not exists events_created_by_created_at_idx
  on public.events (created_by, created_at desc);

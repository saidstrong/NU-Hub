-- Event lifecycle MVP: allow event owners (and admins) to update/delete their events.

drop policy if exists events_update_admin on public.events;
drop policy if exists events_delete_admin on public.events;
drop policy if exists events_update_owner_or_admin on public.events;
drop policy if exists events_delete_owner_or_admin on public.events;

create policy events_update_owner_or_admin
on public.events
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_admin()
)
with check (
  created_by = auth.uid()
  or public.is_admin()
);

create policy events_delete_owner_or_admin
on public.events
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_admin()
);

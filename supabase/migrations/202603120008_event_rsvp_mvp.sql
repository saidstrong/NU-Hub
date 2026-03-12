-- Event RSVP MVP:
-- - reuse event_participants as RSVP storage
-- - move status semantics from joined -> going
-- - align select policy with event visibility model for counts

update public.event_participants
set status = 'going'
where status = 'joined';

alter table public.event_participants
drop constraint if exists event_participants_status_check;

alter table public.event_participants
add constraint event_participants_status_check
check (status in ('interested', 'going'));

create index if not exists event_participants_event_status_created_at_idx
  on public.event_participants (event_id, status, created_at desc);

drop policy if exists event_participants_select_own on public.event_participants;
drop policy if exists event_participants_select_visible_event on public.event_participants;

create policy event_participants_select_visible_event
on public.event_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and (
        e.is_published = true
        or e.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

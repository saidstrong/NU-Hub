-- RLS privacy tightening:
-- - prevent hidden community membership leakage
-- - prevent hidden event RSVP leakage

drop policy if exists community_members_select_joined_authenticated
on public.community_members;

create policy community_members_select_joined_authenticated
on public.community_members
for select
to authenticated
using (
  status = 'joined'
  and exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and (
        c.is_hidden = false
        or c.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists event_participants_select_visible_event
on public.event_participants;

create policy event_participants_select_visible_event
on public.event_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_participants.event_id
      and (
        (
          e.is_published = true
          and e.is_hidden = false
        )
        or e.created_by = auth.uid()
        or public.is_admin()
      )
  )
);

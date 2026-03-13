-- Notifications maturity pass:
-- - allow community post -> community owner notifications
-- - allow first RSVP create -> event owner notifications
-- Keeps existing notification schema and read/update policies unchanged.

drop policy if exists notifications_insert_community_post_owner on public.notifications;
create policy notifications_insert_community_post_owner
on public.notifications
for insert
to authenticated
with check (
  type = 'community'
  and payload ->> 'kind' = 'community_post_created'
  and exists (
    select 1
    from public.community_posts cp
    join public.communities c on c.id = cp.community_id
    where cp.id::text = payload ->> 'post_id'
      and cp.community_id::text = payload ->> 'community_id'
      and cp.author_id = auth.uid()
      and c.created_by = user_id
      and c.created_by <> auth.uid()
  )
);

drop policy if exists notifications_insert_event_rsvp_owner on public.notifications;
create policy notifications_insert_event_rsvp_owner
on public.notifications
for insert
to authenticated
with check (
  type = 'events'
  and payload ->> 'kind' = 'event_rsvp_created'
  and (payload ->> 'rsvp_status') in ('going', 'interested')
  and exists (
    select 1
    from public.events e
    join public.event_participants ep on ep.event_id = e.id
    where e.id::text = payload ->> 'event_id'
      and e.is_published = true
      and e.created_by = user_id
      and e.created_by <> auth.uid()
      and ep.event_id = e.id
      and ep.user_id = auth.uid()
      and ep.status = payload ->> 'rsvp_status'
  )
);

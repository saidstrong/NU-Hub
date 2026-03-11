-- Enable in-app notification inserts for own notifications and scoped community flows.

drop policy if exists notifications_insert_self on public.notifications;
drop policy if exists notifications_insert_community_related on public.notifications;

create policy notifications_insert_self
on public.notifications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy notifications_insert_community_related
on public.notifications
for insert
to authenticated
with check (
  type = 'community'
  and (
    (
      exists (
        select 1
        from public.communities c
        where c.id::text = payload ->> 'community_id'
          and c.created_by = user_id
          and exists (
            select 1
            from public.community_members cm
            where cm.community_id = c.id
              and cm.user_id = auth.uid()
              and cm.status = 'pending'
          )
      )
    )
    or (
      exists (
        select 1
        from public.communities c
        where c.id::text = payload ->> 'community_id'
          and c.created_by = auth.uid()
          and exists (
            select 1
            from public.community_members cm
            where cm.community_id = c.id
              and cm.user_id = user_id
              and cm.status in ('joined', 'rejected')
          )
      )
    )
  )
);

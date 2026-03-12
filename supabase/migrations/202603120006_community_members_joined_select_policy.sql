-- Community member read policy split:
-- - joined memberships are visible to authenticated users for community identity navigation
-- - pending/rejected/left rows remain visible only to self or community owner

drop policy if exists community_members_select_self_or_community_owner on public.community_members;
drop policy if exists community_members_select_joined_authenticated on public.community_members;
drop policy if exists community_members_select_self_or_owner on public.community_members;

create policy community_members_select_joined_authenticated
on public.community_members
for select
to authenticated
using (status = 'joined');

create policy community_members_select_self_or_owner
on public.community_members
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
);

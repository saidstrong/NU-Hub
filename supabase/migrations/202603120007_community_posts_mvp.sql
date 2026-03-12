-- Community posts MVP (text-only, detail-page feed).

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_content_length_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_content_length_check
      check (char_length(btrim(content)) between 1 and 1200);
  end if;
end;
$$;

create index if not exists community_posts_community_id_created_at_id_idx
  on public.community_posts (community_id, created_at desc, id desc);

drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;

drop policy if exists community_posts_select_visible_community on public.community_posts;
drop policy if exists community_posts_insert_joined_author on public.community_posts;
drop policy if exists community_posts_delete_author_or_owner on public.community_posts;

create policy community_posts_select_visible_community
on public.community_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.communities c
    where c.id = community_id
  )
);

create policy community_posts_insert_joined_author
on public.community_posts
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.community_members cm
    where cm.community_id = community_id
      and cm.user_id = auth.uid()
      and cm.status = 'joined'
  )
);

create policy community_posts_delete_author_or_owner
on public.community_posts
for delete
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1
    from public.communities c
    where c.id = community_id
      and c.created_by = auth.uid()
  )
);

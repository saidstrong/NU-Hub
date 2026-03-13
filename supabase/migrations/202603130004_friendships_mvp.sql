-- Friends MVP: lightweight friend relationships with request/accept/reject lifecycle.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  addressee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'friendships_requester_addressee_diff_check'
      and conrelid = 'public.friendships'::regclass
  ) then
    alter table public.friendships
      add constraint friendships_requester_addressee_diff_check
      check (requester_id <> addressee_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'friendships_status_check'
      and conrelid = 'public.friendships'::regclass
  ) then
    alter table public.friendships
      add constraint friendships_status_check
      check (status in ('pending', 'accepted', 'rejected'));
  end if;
end;
$$;

create unique index if not exists friendships_pair_unique_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_requester_id_idx
  on public.friendships (requester_id);

create index if not exists friendships_addressee_id_idx
  on public.friendships (addressee_id);

create index if not exists friendships_status_idx
  on public.friendships (status);

drop trigger if exists set_friendships_updated_at on public.friendships;
create trigger set_friendships_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

alter table public.friendships enable row level security;

drop policy if exists friendships_select_participants on public.friendships;
drop policy if exists friendships_insert_requester on public.friendships;
drop policy if exists friendships_update_participants on public.friendships;
drop policy if exists friendships_delete_requester on public.friendships;

create policy friendships_select_participants
on public.friendships
for select
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friendships_insert_requester
on public.friendships
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and requester_id <> addressee_id
  and status = 'pending'
);

create policy friendships_update_participants
on public.friendships
for update
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
)
with check (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
);

create policy friendships_delete_requester
on public.friendships
for delete
to authenticated
using (requester_id = auth.uid());

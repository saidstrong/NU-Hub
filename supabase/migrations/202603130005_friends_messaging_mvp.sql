-- Friends messaging MVP (separate from marketplace messaging).

create table if not exists public.friend_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(user_id) on delete cascade,
  user_b_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.friend_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'friend_conversations_user_pair_diff_check'
      and conrelid = 'public.friend_conversations'::regclass
  ) then
    alter table public.friend_conversations
      add constraint friend_conversations_user_pair_diff_check
      check (user_a_id <> user_b_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'friend_messages_content_length_check'
      and conrelid = 'public.friend_messages'::regclass
  ) then
    alter table public.friend_messages
      add constraint friend_messages_content_length_check
      check (char_length(btrim(content)) between 1 and 1200);
  end if;
end;
$$;

create unique index if not exists friend_conversations_pair_unique_idx
  on public.friend_conversations (least(user_a_id, user_b_id), greatest(user_a_id, user_b_id));

create index if not exists friend_conversations_user_a_updated_at_id_idx
  on public.friend_conversations (user_a_id, updated_at desc, id desc);

create index if not exists friend_conversations_user_b_updated_at_id_idx
  on public.friend_conversations (user_b_id, updated_at desc, id desc);

create index if not exists friend_messages_conversation_created_at_id_idx
  on public.friend_messages (conversation_id, created_at desc, id desc);

drop trigger if exists set_friend_conversations_updated_at on public.friend_conversations;
create trigger set_friend_conversations_updated_at
before update on public.friend_conversations
for each row execute function public.set_updated_at();

create or replace function public.bump_friend_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friend_conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists bump_friend_conversation_updated_at_on_message_insert on public.friend_messages;
create trigger bump_friend_conversation_updated_at_on_message_insert
after insert on public.friend_messages
for each row execute function public.bump_friend_conversation_updated_at();

alter table public.friend_conversations enable row level security;
alter table public.friend_messages enable row level security;

drop policy if exists friend_conversations_select_participants on public.friend_conversations;
drop policy if exists friend_conversations_insert_participants_with_accepted_friendship on public.friend_conversations;
drop policy if exists friend_messages_select_participants on public.friend_messages;
drop policy if exists friend_messages_insert_participant_sender on public.friend_messages;

create policy friend_conversations_select_participants
on public.friend_conversations
for select
to authenticated
using (
  auth.uid() = user_a_id
  or auth.uid() = user_b_id
);

create policy friend_conversations_insert_participants_with_accepted_friendship
on public.friend_conversations
for insert
to authenticated
with check (
  (auth.uid() = user_a_id or auth.uid() = user_b_id)
  and user_a_id <> user_b_id
  and exists (
    select 1
    from public.friendships f
    where (
      (f.requester_id = user_a_id and f.addressee_id = user_b_id)
      or (f.requester_id = user_b_id and f.addressee_id = user_a_id)
    )
      and f.status = 'accepted'
  )
);

create policy friend_messages_select_participants
on public.friend_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.friend_conversations c
    where c.id = conversation_id
      and (
        c.user_a_id = auth.uid()
        or c.user_b_id = auth.uid()
      )
  )
);

create policy friend_messages_insert_participant_sender
on public.friend_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.friend_conversations c
    where c.id = conversation_id
      and (
        c.user_a_id = auth.uid()
        or c.user_b_id = auth.uid()
      )
      and exists (
        select 1
        from public.friendships f
        where (
          (f.requester_id = c.user_a_id and f.addressee_id = c.user_b_id)
          or (f.requester_id = c.user_b_id and f.addressee_id = c.user_a_id)
        )
          and f.status = 'accepted'
      )
  )
);

-- Friendship acceptance hardening: requester cannot force accepted status.
drop policy if exists friendships_update_participants on public.friendships;
create policy friendships_update_participants
on public.friendships
for update
to authenticated
using (
  requester_id = auth.uid()
  or addressee_id = auth.uid()
)
with check (
  (requester_id = auth.uid() or addressee_id = auth.uid())
  and (status <> 'accepted' or addressee_id = auth.uid())
);

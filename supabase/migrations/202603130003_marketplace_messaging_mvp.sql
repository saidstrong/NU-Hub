-- Marketplace messaging MVP (listing-scoped, text-only).

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(user_id) on delete cascade,
  seller_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_buyer_seller_diff_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_buyer_seller_diff_check
      check (buyer_id <> seller_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_content_length_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_content_length_check
      check (char_length(btrim(content)) between 1 and 1200);
  end if;
end;
$$;

create unique index if not exists conversations_listing_buyer_unique_idx
  on public.conversations (listing_id, buyer_id);

create index if not exists conversations_buyer_updated_at_id_idx
  on public.conversations (buyer_id, updated_at desc, id desc);

create index if not exists conversations_seller_updated_at_id_idx
  on public.conversations (seller_id, updated_at desc, id desc);

create index if not exists messages_conversation_created_at_id_idx
  on public.messages (conversation_id, created_at desc, id desc);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists bump_conversation_updated_at_on_message_insert on public.messages;
create trigger bump_conversation_updated_at_on_message_insert
after insert on public.messages
for each row execute function public.bump_conversation_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_select_participants on public.conversations;
drop policy if exists conversations_insert_buyer_only on public.conversations;
drop policy if exists messages_select_participants on public.messages;
drop policy if exists messages_insert_participant_sender on public.messages;

create policy conversations_select_participants
on public.conversations
for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
);

create policy conversations_insert_buyer_only
on public.conversations
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and buyer_id <> seller_id
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.seller_id = seller_id
      and l.seller_id <> auth.uid()
  )
);

create policy messages_select_participants
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.buyer_id = auth.uid()
        or c.seller_id = auth.uid()
      )
  )
);

create policy messages_insert_participant_sender
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        c.buyer_id = auth.uid()
        or c.seller_id = auth.uid()
      )
  )
);

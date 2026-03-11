-- NU Hub MVP Foundation (Phase 1)
-- Extensions, helper functions, core tables, constraints, indexes, and triggers.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nu_email text not null unique,
  full_name text not null default '',
  school text,
  major text,
  year_label text,
  bio text,
  interests text[] not null default '{}'::text[],
  goals text[] not null default '{}'::text[],
  looking_for text[] not null default '{}'::text[],
  skills text[] not null default '{}'::text[],
  projects jsonb not null default '[]'::jsonb,
  resume_url text,
  links jsonb not null default '{}'::jsonb,
  avatar_path text,
  onboarding_step text not null default 'profile',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nu_email_lowercase_check
    check (nu_email = lower(nu_email)),
  constraint profiles_nu_email_domain_check
    check (nu_email ~ '^[a-z0-9._%+\-]+@nu\.edu\.kz$'),
  constraint profiles_onboarding_step_check
    check (onboarding_step in ('profile', 'interests', 'looking_for', 'professional', 'completed'))
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  description text,
  price_kzt integer not null check (price_kzt >= 0),
  category text not null,
  condition text not null,
  pickup_location text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_status_check
    check (status in ('draft', 'active', 'reserved', 'sold', 'archived'))
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint listing_images_sort_order_nonnegative_check
    check (sort_order >= 0),
  constraint listing_images_listing_sort_order_unique
    unique (listing_id, sort_order)
);

create table public.saved_listings (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(user_id),
  title text not null,
  description text,
  category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null,
  cover_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_at_check
    check (ends_at is null or ends_at >= starts_at)
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id),
  constraint event_participants_status_check
    check (status in ('interested', 'joined'))
);

create table public.saved_events (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  description text not null,
  tags text[] not null default '{}'::text[],
  category text,
  join_type text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_join_type_check
    check (join_type in ('open', 'request'))
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'member',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (community_id, user_id),
  constraint community_members_role_check
    check (role in ('owner', 'member')),
  constraint community_members_status_check
    check (status in ('pending', 'joined', 'rejected', 'left'))
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check
    check (type in ('market', 'events', 'community', 'system'))
);

create index listings_status_created_at_idx
  on public.listings (status, created_at desc);

create index listings_seller_id_status_idx
  on public.listings (seller_id, status);

create index listings_category_idx
  on public.listings (category);

create index listing_images_listing_id_idx
  on public.listing_images (listing_id);

create index events_starts_at_idx
  on public.events (starts_at);

create index events_category_starts_at_idx
  on public.events (category, starts_at);

create index events_is_published_starts_at_idx
  on public.events (is_published, starts_at);

create index event_participants_user_id_status_idx
  on public.event_participants (user_id, status);

create index communities_created_at_idx
  on public.communities (created_at desc);

create index communities_join_type_idx
  on public.communities (join_type);

create index communities_tags_gin_idx
  on public.communities using gin (tags);

create index community_members_user_id_status_idx
  on public.community_members (user_id, status);

create index community_members_community_id_status_idx
  on public.community_members (community_id, status);

create index notifications_user_id_is_read_created_at_idx
  on public.notifications (user_id, is_read, created_at desc);

create index saved_listings_listing_id_idx
  on public.saved_listings (listing_id);

create index saved_events_event_id_idx
  on public.saved_events (event_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_event_participants_updated_at on public.event_participants;
create trigger set_event_participants_updated_at
before update on public.event_participants
for each row execute function public.set_updated_at();

drop trigger if exists set_communities_updated_at on public.communities;
create trigger set_communities_updated_at
before update on public.communities
for each row execute function public.set_updated_at();

drop trigger if exists set_community_members_updated_at on public.community_members;
create trigger set_community_members_updated_at
before update on public.community_members
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    raise exception 'auth.users.email is required to create a profile';
  end if;

  insert into public.profiles (user_id, nu_email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

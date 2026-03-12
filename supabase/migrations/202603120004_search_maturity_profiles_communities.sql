-- Search maturity: move profiles/communities matching into DB-side filters.
-- Uses mutable plain text columns + trigger sync to avoid generated-column immutability issues.

create extension if not exists pg_trgm;

-- If a generated column exists from partial/manual attempts, replace it with a plain text column.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'search_text'
      and is_generated <> 'NEVER'
  ) then
    execute 'alter table public.profiles drop column search_text';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'communities'
      and column_name = 'search_text'
      and is_generated <> 'NEVER'
  ) then
    execute 'alter table public.communities drop column search_text';
  end if;
end
$$;

alter table public.profiles
  add column if not exists search_text text;

alter table public.communities
  add column if not exists search_text text;

create or replace function public.sync_search_text()
returns trigger
language plpgsql
as $$
begin
  if tg_table_schema = 'public' and tg_table_name = 'profiles' then
    new.search_text := lower(
      concat_ws(
        ' ',
        coalesce(new.full_name, ''),
        coalesce(new.school, ''),
        coalesce(new.major, ''),
        coalesce(new.bio, ''),
        array_to_string(coalesce(new.interests, '{}'::text[]), ' '),
        array_to_string(coalesce(new.goals, '{}'::text[]), ' '),
        array_to_string(coalesce(new.looking_for, '{}'::text[]), ' '),
        array_to_string(coalesce(new.skills, '{}'::text[]), ' ')
      )
    );
  elsif tg_table_schema = 'public' and tg_table_name = 'communities' then
    new.search_text := lower(
      concat_ws(
        ' ',
        coalesce(new.name, ''),
        coalesce(new.description, ''),
        coalesce(new.category, ''),
        array_to_string(coalesce(new.tags, '{}'::text[]), ' ')
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_search_text_profiles on public.profiles;
create trigger sync_search_text_profiles
before insert or update of full_name, school, major, bio, interests, goals, looking_for, skills
on public.profiles
for each row execute function public.sync_search_text();

drop trigger if exists sync_search_text_communities on public.communities;
create trigger sync_search_text_communities
before insert or update of name, description, category, tags
on public.communities
for each row execute function public.sync_search_text();

-- Backfill existing rows.
update public.profiles
set search_text = lower(
  concat_ws(
    ' ',
    coalesce(full_name, ''),
    coalesce(school, ''),
    coalesce(major, ''),
    coalesce(bio, ''),
    array_to_string(coalesce(interests, '{}'::text[]), ' '),
    array_to_string(coalesce(goals, '{}'::text[]), ' '),
    array_to_string(coalesce(looking_for, '{}'::text[]), ' '),
    array_to_string(coalesce(skills, '{}'::text[]), ' ')
  )
)
where search_text is distinct from lower(
  concat_ws(
    ' ',
    coalesce(full_name, ''),
    coalesce(school, ''),
    coalesce(major, ''),
    coalesce(bio, ''),
    array_to_string(coalesce(interests, '{}'::text[]), ' '),
    array_to_string(coalesce(goals, '{}'::text[]), ' '),
    array_to_string(coalesce(looking_for, '{}'::text[]), ' '),
    array_to_string(coalesce(skills, '{}'::text[]), ' ')
  )
);

update public.communities
set search_text = lower(
  concat_ws(
    ' ',
    coalesce(name, ''),
    coalesce(description, ''),
    coalesce(category, ''),
    array_to_string(coalesce(tags, '{}'::text[]), ' ')
  )
)
where search_text is distinct from lower(
  concat_ws(
    ' ',
    coalesce(name, ''),
    coalesce(description, ''),
    coalesce(category, ''),
    array_to_string(coalesce(tags, '{}'::text[]), ' ')
  )
);

create index if not exists profiles_search_text_trgm_idx
  on public.profiles using gin (search_text gin_trgm_ops)
  where onboarding_completed = true;

create index if not exists communities_search_text_trgm_idx
  on public.communities using gin (search_text gin_trgm_ops);

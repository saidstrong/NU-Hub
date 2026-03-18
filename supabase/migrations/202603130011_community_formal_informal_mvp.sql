-- Formal vs informal communities MVP
-- - add community_type and formal_kind metadata
-- - keep existing communities as informal by default
-- - enforce admin-only formal metadata changes

alter table public.communities
  add column if not exists community_type text not null default 'informal',
  add column if not exists formal_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'communities_community_type_check'
      and conrelid = 'public.communities'::regclass
  ) then
    alter table public.communities
      add constraint communities_community_type_check
      check (community_type in ('informal', 'formal'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'communities_formal_kind_check'
      and conrelid = 'public.communities'::regclass
  ) then
    alter table public.communities
      add constraint communities_formal_kind_check
      check (formal_kind is null or formal_kind in ('club', 'organization', 'official'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'communities_formal_kind_consistency_check'
      and conrelid = 'public.communities'::regclass
  ) then
    alter table public.communities
      add constraint communities_formal_kind_consistency_check
      check (
        (community_type = 'informal' and formal_kind is null)
        or (community_type = 'formal' and formal_kind is not null)
      );
  end if;
end;
$$;

create or replace function public.enforce_community_formal_fields_admin_only()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.community_type <> 'informal' or new.formal_kind is not null then
        raise exception 'Only admins can set formal community status.'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.community_type is distinct from old.community_type
         or new.formal_kind is distinct from old.formal_kind then
        raise exception 'Only admins can change formal community status.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_community_formal_fields_admin_only on public.communities;
create trigger enforce_community_formal_fields_admin_only
before insert or update on public.communities
for each row execute function public.enforce_community_formal_fields_admin_only();

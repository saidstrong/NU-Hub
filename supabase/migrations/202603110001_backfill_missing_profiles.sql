-- Backfill profiles for existing auth users created before profile trigger was in place.
insert into public.profiles (user_id, nu_email, full_name)
select
  au.id,
  lower(au.email) as nu_email,
  coalesce(nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''), '') as full_name
from auth.users as au
where au.email is not null
  and lower(au.email) ~ '^[a-z0-9._%+\-]+@nu\.edu\.kz$'
  and not exists (
    select 1
    from public.profiles p
    where p.user_id = au.id
  )
  and not exists (
    select 1
    from public.profiles p
    where p.nu_email = lower(au.email)
  )
on conflict (user_id) do nothing;

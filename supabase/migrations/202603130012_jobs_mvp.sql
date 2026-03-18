create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  organization_name text not null,
  job_type text not null,
  location_mode text not null,
  location_text text,
  description text not null,
  requirements text,
  compensation_text text,
  apply_method text not null,
  apply_url text,
  apply_email text,
  apply_telegram text,
  status text not null default 'pending_review',
  is_hidden boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_job_type_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_job_type_check
      check (job_type in ('internship', 'part_time', 'volunteer', 'research'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_location_mode_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_location_mode_check
      check (location_mode in ('on_campus', 'remote', 'hybrid', 'off_campus'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_apply_method_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_apply_method_check
      check (apply_method in ('link', 'email', 'telegram'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_status_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_status_check
      check (status in ('pending_review', 'published', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_apply_method_target_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_apply_method_target_check
      check (
        (
          apply_method = 'link'
          and apply_url is not null
          and btrim(apply_url) <> ''
          and apply_email is null
          and apply_telegram is null
        )
        or (
          apply_method = 'email'
          and apply_email is not null
          and btrim(apply_email) <> ''
          and apply_url is null
          and apply_telegram is null
        )
        or (
          apply_method = 'telegram'
          and apply_telegram is not null
          and btrim(apply_telegram) <> ''
          and apply_url is null
          and apply_email is null
        )
      );
  end if;
end;
$$;

create index if not exists jobs_published_visible_created_at_idx
  on public.jobs (created_at desc)
  where status = 'published' and is_hidden = false;

create index if not exists jobs_published_visible_expires_at_idx
  on public.jobs (expires_at asc)
  where status = 'published' and is_hidden = false;

create index if not exists jobs_status_created_at_idx
  on public.jobs (status, created_at desc);

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

drop policy if exists jobs_select_published_visible_authenticated on public.jobs;
drop policy if exists jobs_select_admin_all on public.jobs;
drop policy if exists jobs_insert_admin on public.jobs;
drop policy if exists jobs_update_admin on public.jobs;
drop policy if exists jobs_delete_admin on public.jobs;

create policy jobs_select_published_visible_authenticated
on public.jobs
for select
to authenticated
using (
  status = 'published'
  and is_hidden = false
  and expires_at > now()
);

create policy jobs_select_admin_all
on public.jobs
for select
to authenticated
using (public.is_admin());

create policy jobs_insert_admin
on public.jobs
for insert
to authenticated
with check (public.is_admin());

create policy jobs_update_admin
on public.jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy jobs_delete_admin
on public.jobs
for delete
to authenticated
using (public.is_admin());

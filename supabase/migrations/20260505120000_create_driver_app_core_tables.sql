create extension if not exists pgcrypto with schema extensions;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration text not null unique,
  created_at timestamp with time zone default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id),
  vehicle_id uuid references public.vehicles(id),
  driver text,
  vehicle text,
  date date not null,
  status text default 'not_started',
  stops jsonb default '[]'::jsonb,
  notes text,
  start_time timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint jobs_status_check check (status in ('not_started', 'in_progress', 'completed'))
);

alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.jobs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.drivers to anon, authenticated;
grant select on public.vehicles to anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant update on public.jobs to anon, authenticated;

drop policy if exists "Development read drivers" on public.drivers;
create policy "Development read drivers"
  on public.drivers
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Development read vehicles" on public.vehicles;
create policy "Development read vehicles"
  on public.vehicles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Development read jobs" on public.jobs;
create policy "Development read jobs"
  on public.jobs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Development update jobs" on public.jobs;
create policy "Development update jobs"
  on public.jobs
  for update
  to anon, authenticated
  using (true)
  with check (true);

insert into public.drivers (name)
select 'Mitch'
where not exists (
  select 1 from public.drivers where lower(name) = lower('Mitch')
);

insert into public.vehicles (registration)
select 'AB12CDE'
where not exists (
  select 1 from public.vehicles where upper(registration) = upper('AB12CDE')
);

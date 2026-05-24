
-- Roles enum
create type public.app_role as enum ('admin', 'staff');

-- Profiles (linked to auth.users). owner_id = workspace owner (an admin's user id)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- user_roles (separate table to avoid privilege escalation)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role (security definer to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- get current user's workspace owner_id
create or replace function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.profiles where id = auth.uid()
$$;

-- Categories per workspace
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

-- Patients (items inside category)
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  owner_id uuid not null,
  name text not null,
  pathology text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.patients enable row level security;

-- Sessions (entradas)
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  owner_id uuid not null,
  session_date date not null default current_date,
  session_time time,
  value numeric(10,2) not null default 0,
  status text not null default 'pending', -- presence | absent | pending
  notes text,
  created_by uuid not null,
  created_by_name text,
  created_at timestamptz not null default now()
);
alter table public.sessions enable row level security;

-- ============ RLS POLICIES ============

-- profiles
create policy "view profiles in workspace"
on public.profiles for select to authenticated
using (owner_id = public.current_owner_id());

create policy "user can insert own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "admins update profiles in workspace"
on public.profiles for update to authenticated
using (owner_id = public.current_owner_id() and public.has_role(auth.uid(), 'admin'));

-- user_roles (read own + admins read workspace)
create policy "view own roles"
on public.user_roles for select to authenticated
using (user_id = auth.uid());

create policy "admins manage roles in workspace"
on public.user_roles for all to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and exists (select 1 from public.profiles p where p.id = user_roles.user_id and p.owner_id = public.current_owner_id())
)
with check (
  public.has_role(auth.uid(), 'admin')
);

-- categories: workspace can read; only admin write
create policy "workspace read categories" on public.categories
for select to authenticated using (owner_id = public.current_owner_id());
create policy "admin insert categories" on public.categories
for insert to authenticated with check (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));
create policy "admin update categories" on public.categories
for update to authenticated using (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));
create policy "admin delete categories" on public.categories
for delete to authenticated using (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));

-- patients: workspace read; only admin write
create policy "workspace read patients" on public.patients
for select to authenticated using (owner_id = public.current_owner_id());
create policy "admin insert patients" on public.patients
for insert to authenticated with check (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));
create policy "admin update patients" on public.patients
for update to authenticated using (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));
create policy "admin delete patients" on public.patients
for delete to authenticated using (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));

-- sessions: workspace read; admin & staff create/update; only admin delete
create policy "workspace read sessions" on public.sessions
for select to authenticated using (owner_id = public.current_owner_id());
create policy "workspace insert sessions" on public.sessions
for insert to authenticated with check (owner_id = public.current_owner_id() and created_by = auth.uid());
create policy "workspace update sessions" on public.sessions
for update to authenticated using (owner_id = public.current_owner_id());
create policy "admin delete sessions" on public.sessions
for delete to authenticated using (owner_id = public.current_owner_id() and public.has_role(auth.uid(),'admin'));

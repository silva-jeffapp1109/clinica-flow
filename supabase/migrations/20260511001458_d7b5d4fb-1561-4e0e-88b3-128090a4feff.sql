create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.profiles where id = auth.uid()
$$;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

grant execute on function private.current_owner_id() to authenticated;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

revoke execute on function public.current_owner_id() from authenticated;
revoke execute on function public.current_owner_id() from public;
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public;

drop policy if exists "admin delete categories" on public.categories;
drop policy if exists "workspace insert categories" on public.categories;
drop policy if exists "workspace read categories" on public.categories;
drop policy if exists "workspace update categories" on public.categories;
create policy "admin delete categories" on public.categories for delete to authenticated using ((owner_id = private.current_owner_id()) and private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "workspace insert categories" on public.categories for insert to authenticated with check ((owner_id = private.current_owner_id()) and (created_by = auth.uid()));
create policy "workspace read categories" on public.categories for select to authenticated using (owner_id = private.current_owner_id());
create policy "workspace update categories" on public.categories for update to authenticated using (owner_id = private.current_owner_id());

drop policy if exists "admin delete patients" on public.patients;
drop policy if exists "workspace insert patients" on public.patients;
drop policy if exists "workspace read patients" on public.patients;
drop policy if exists "workspace update patients" on public.patients;
create policy "admin delete patients" on public.patients for delete to authenticated using ((owner_id = private.current_owner_id()) and private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "workspace insert patients" on public.patients for insert to authenticated with check ((owner_id = private.current_owner_id()) and (created_by = auth.uid()));
create policy "workspace read patients" on public.patients for select to authenticated using (owner_id = private.current_owner_id());
create policy "workspace update patients" on public.patients for update to authenticated using (owner_id = private.current_owner_id());

drop policy if exists "admin delete schedules" on public.patient_schedules;
drop policy if exists "workspace insert schedules" on public.patient_schedules;
drop policy if exists "workspace read schedules" on public.patient_schedules;
drop policy if exists "workspace update schedules" on public.patient_schedules;
create policy "admin delete schedules" on public.patient_schedules for delete to authenticated using ((owner_id = private.current_owner_id()) and private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "workspace insert schedules" on public.patient_schedules for insert to authenticated with check ((owner_id = private.current_owner_id()) and (created_by = auth.uid()));
create policy "workspace read schedules" on public.patient_schedules for select to authenticated using (owner_id = private.current_owner_id());
create policy "workspace update schedules" on public.patient_schedules for update to authenticated using (owner_id = private.current_owner_id());

drop policy if exists "admin delete sessions" on public.sessions;
drop policy if exists "workspace insert sessions" on public.sessions;
drop policy if exists "workspace read sessions" on public.sessions;
drop policy if exists "workspace update sessions" on public.sessions;
create policy "admin delete sessions" on public.sessions for delete to authenticated using ((owner_id = private.current_owner_id()) and private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "workspace insert sessions" on public.sessions for insert to authenticated with check ((owner_id = private.current_owner_id()) and (created_by = auth.uid()));
create policy "workspace read sessions" on public.sessions for select to authenticated using (owner_id = private.current_owner_id());
create policy "workspace update sessions" on public.sessions for update to authenticated using (owner_id = private.current_owner_id());

drop policy if exists "admins update profiles in workspace" on public.profiles;
drop policy if exists "view profiles in workspace" on public.profiles;
create policy "admins update profiles in workspace" on public.profiles for update to authenticated using ((owner_id = private.current_owner_id()) and private.has_role(auth.uid(), 'admin'::public.app_role));
create policy "view profiles in workspace" on public.profiles for select to authenticated using (owner_id = private.current_owner_id());

drop policy if exists "admins manage roles in workspace" on public.user_roles;
create policy "admins manage roles in workspace" on public.user_roles for all to authenticated using (private.has_role(auth.uid(), 'admin'::public.app_role) and exists (select 1 from public.profiles p where p.id = user_roles.user_id and p.owner_id = private.current_owner_id())) with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create table public.patient_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  weekday smallint,
  schedule_date date,
  schedule_time time not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index idx_patient_schedules_patient on public.patient_schedules(patient_id);

alter table public.patient_schedules enable row level security;

create policy "workspace read schedules" on public.patient_schedules
  for select to authenticated
  using (owner_id = current_owner_id());

create policy "admin insert schedules" on public.patient_schedules
  for insert to authenticated
  with check (owner_id = current_owner_id() and has_role(auth.uid(), 'admin'));

create policy "admin update schedules" on public.patient_schedules
  for update to authenticated
  using (owner_id = current_owner_id() and has_role(auth.uid(), 'admin'));

create policy "admin delete schedules" on public.patient_schedules
  for delete to authenticated
  using (owner_id = current_owner_id() and has_role(auth.uid(), 'admin'));
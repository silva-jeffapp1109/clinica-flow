grant usage on schema public to authenticated;
grant execute on function public.current_owner_id() to authenticated;
grant execute on function public.has_role(uuid, app_role) to authenticated;

alter table public.patients
  add column if not exists session_time time without time zone,
  add column if not exists session_label text,
  add column if not exists cpf text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists responsible text,
  add column if not exists health_plan text,
  add column if not exists registration text;

create index if not exists idx_patients_owner_cpf on public.patients (owner_id, cpf) where cpf is not null;
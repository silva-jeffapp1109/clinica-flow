
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_owner uuid;
  v_full_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'admin');
  v_owner := coalesce(nullif(new.raw_user_meta_data->>'owner_id','')::uuid, new.id);
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);

  insert into public.profiles (id, email, full_name, owner_id)
  values (new.id, new.email, v_full_name, v_owner);

  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

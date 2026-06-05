
-- Seed test users via direct insert (uses pgcrypto for password hashing)
do $$
declare
  admin_id uuid;
  staff_id uuid;
begin
  select id into admin_id from auth.users where email = 'admin@gmail.com';
  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@gmail.com', crypt('admin', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role','admin','full_name','jeff silva'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@gmail.com'),
      'email', admin_id::text, now(), now(), now());
  end if;

  select id into staff_id from auth.users where email = 'staff@gmail.com';
  if staff_id is null then
    staff_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', staff_id, 'authenticated', 'authenticated',
      'staff@gmail.com', crypt('staff', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('role','staff','full_name','Staff Demo','owner_id', admin_id::text),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), staff_id,
      jsonb_build_object('sub', staff_id::text, 'email', 'staff@gmail.com'),
      'email', staff_id::text, now(), now(), now());
  end if;
end $$;

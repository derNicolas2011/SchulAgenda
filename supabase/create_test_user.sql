insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-a111-111111111111', 'authenticated', 'authenticated', 'test@agenda.ch',
  crypt('agenda-test', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Testbenutzer"}'::jsonb,
  '', '', '', '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-4111-a111-111111111111', '11111111-1111-4111-a111-111111111111',
  '{"sub":"11111111-1111-4111-a111-111111111111","email":"test@agenda.ch","email_verified":true}'::jsonb,
  'email', now(), now(), now()
);

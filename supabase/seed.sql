-- Wird von `npx supabase db reset` automatisch eingespielt.
-- Die feste UUID steht ausgeschrieben: Seeds laufen ohne psql-Variablen.
-- Legt ausschliesslich den Entwickler-Account an, damit die automatische
-- Anmeldung funktioniert. Bewusst OHNE Beispieldaten: nach einem Reset
-- soll die App im Zustand eines neuen Nutzers stehen.
--
-- Beispieldaten bei Bedarf mit `npm run db:demo` einspielen.
--
-- Dieser Account existiert ausschliesslich in der lokalen Datenbank.
-- In die Cloud kommt er nie: `db push` überträgt nur Migrationen, keine Seeds.

-- Die Token-Spalten müssen leere Zeichenketten sein, nicht NULL: der
-- Auth-Dienst liest sie in nicht-nullbare Felder und scheitert sonst mit
-- "Database error querying schema".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change_token, email_change_token_current, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'dev@agenda.test',
  crypt('agenda-dev', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Entwicklung"}'::jsonb,
  '', '', '', '', '', '', ''
);

-- GoTrue erwartet zu jedem Passwort-Login eine Identity.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001',
  '{"sub":"00000000-0000-4000-a000-000000000001","email":"dev@agenda.test","email_verified":true}'::jsonb,
  'email', now(), now(), now()
);

-- Das Profil legt der Trigger handle_new_user an.

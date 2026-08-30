-- SchulAgenda – Initiales Schema
-- Mehrbenutzerfähig ab Tag 1: jede Zeile gehört genau einem Nutzer,
-- durchgesetzt durch Row Level Security, nicht durch Client-Code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  timezone          text        not null default 'Europe/Zurich',
  theme             text        not null default 'system'
                                check (theme in ('system', 'light', 'dark')),
  default_reminders jsonb       not null default
                                '{"test":1440,"assignment":1440,"homework":null,"other":null}'::jsonb,
  -- null = Kalender-Abo deaktiviert. Wer die URL hat, sieht den Feed –
  -- deshalb widerrufbar und standardmässig aus.
  ics_token         uuid        unique,
  ics_enabled_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------- subjects
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  short_name  text not null check (char_length(short_name) between 1 and 4),
  color_key   text not null check (color_key in (
                'red','orange','amber','green','teal',
                'blue','indigo','purple','pink','slate')),
  sort_order  integer     not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create unique index subjects_unique_name
  on public.subjects (user_id, lower(name))
  where deleted_at is null;

create index subjects_by_user on public.subjects (user_id) where deleted_at is null;

-- ---------------------------------------------------------------- entries
-- Bewusst EINE Tabelle für Tests, Hausaufgaben, Abgaben und Sonstiges:
-- identische Felder, identische Ansichten. `kind` steuert nur Verhalten.
create table public.entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  subject_id       uuid references public.subjects (id) on delete set null,
  kind             text not null check (kind in ('test','homework','assignment','other')),
  title            text not null check (char_length(title) between 1 and 120),
  notes            text check (char_length(notes) <= 2000),
  -- date, NICHT timestamptz: ein Fälligkeitstag hat keine Zeitzone.
  due_date         date not null,
  due_time         time,                       -- null = ganztägig (Normalfall)
  reminder_minutes integer check (reminder_minutes >= 0 and reminder_minutes <= 43200),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz                 -- Soft Delete trägt den Undo-Flow
);

create index entries_by_due   on public.entries (user_id, due_date) where deleted_at is null;
create index entries_by_open  on public.entries (user_id, completed_at) where deleted_at is null;
create index entries_by_sync  on public.entries (user_id, updated_at);

-- ---------------------------------------------------------------- triggers
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger entries_updated_at before update on public.entries
  for each row execute function public.set_updated_at();

-- Profil bei Registrierung automatisch anlegen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.entries  enable row level security;

create policy profiles_select on public.profiles for select using (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);

create policy subjects_all on public.subjects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy entries_all on public.entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nachschlagefunktion für den ICS-Feed. Läuft als security definer und
-- umgeht damit RLS kontrolliert: Eintritt ist ausschliesslich ein gültiges,
-- vom Nutzer jederzeit widerrufbares Token.
create or replace function public.ics_feed(feed_token uuid)
returns table (
  entry_id         uuid,
  kind             text,
  title            text,
  notes            text,
  due_date         date,
  due_time         time,
  reminder_minutes integer,
  updated_at       timestamptz,
  subject_name     text
)
language sql
security definer
set search_path = public
as $$
  select e.id, e.kind, e.title, e.notes, e.due_date, e.due_time,
         e.reminder_minutes, e.updated_at, s.name
  from public.profiles p
  join public.entries e on e.user_id = p.id
  left join public.subjects s on s.id = e.subject_id and s.deleted_at is null
  where p.ics_token = feed_token
    and p.ics_token is not null
    and e.deleted_at is null
    and e.due_date between current_date - interval '30 days'
                       and current_date + interval '365 days'
    -- Erledigte Aufgaben würden den Kalender zumüllen; Tests bleiben,
    -- weil sie Ereignisse sind.
    and (e.completed_at is null or e.kind = 'test')
  order by e.due_date, e.due_time nulls last;
$$;

revoke all on function public.ics_feed(uuid) from public, anon, authenticated;

-- Token erzeugen / widerrufen – der Nutzer kann nur sein eigenes Profil treffen.
create or replace function public.rotate_ics_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid := gen_random_uuid();
begin
  update public.profiles
     set ics_token = new_token, ics_enabled_at = now()
   where id = auth.uid();
  return new_token;
end;
$$;

create or replace function public.revoke_ics_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set ics_token = null, ics_enabled_at = null
   where id = auth.uid();
end;
$$;

grant execute on function public.rotate_ics_token() to authenticated;
grant execute on function public.revoke_ics_token() to authenticated;

-- Beispieldaten für das lokale Entwickler-Konto.
-- Einspielen mit `npm run db:demo`, entfernen mit `npm run db:clear`.
--
-- Bewusst nicht Teil von seed.sql: nach `db reset` soll die App im Zustand
-- eines neuen Nutzers stehen, nicht in einem vorgefüllten.

insert into public.subjects (user_id, name, short_name, color_key, sort_order) values
  ('00000000-0000-4000-a000-000000000001', 'Mathematik',  'Mat', 'blue',   0),
  ('00000000-0000-4000-a000-000000000001', 'Deutsch',     'Deu', 'red',    1),
  ('00000000-0000-4000-a000-000000000001', 'Englisch',    'Eng', 'green',  2),
  ('00000000-0000-4000-a000-000000000001', 'Französisch', 'Fra', 'purple', 3),
  ('00000000-0000-4000-a000-000000000001', 'Informatik',  'Inf', 'orange', 4);

-- Bewusst gemischt: überfällig, heute offen, heute erledigt, kommende Tage,
-- mit und ohne Uhrzeit. So sieht man nach dem Reset jeden Zustand sofort.
insert into public.entries (user_id, subject_id, kind, title, due_date, due_time, reminder_minutes, completed_at, notes)
select '00000000-0000-4000-a000-000000000001', s.id, v.kind, v.title, current_date + v.offs, v.tm, v.rem, v.done, v.notes
from (values
  ('Mathematik',  'homework',   'Aufgaben 4–8',              -1, null::time, null::int, null::timestamptz, null::text),
  ('Deutsch',     'homework',   'Lektüre S. 40–62 lesen',     0, null,       null,      null,              null),
  ('Informatik',  'homework',   'Übungsblatt fertigstellen',  0, null,       null,      null,              null),
  ('Französisch', 'assignment', 'Vokabeltest vorbereiten',    0, '14:00',    840,       null,              null),
  ('Englisch',    'homework',   'Reading Log',                0, null,       null,      now(),             null),
  ('Mathematik',  'test',       'Kapitel 1–4',                2, '08:00',    1440,      null,              'Taschenrechner mitnehmen'),
  ('Deutsch',     'assignment', 'Aufsatz abgeben',            2, null,       1440,      null,              null),
  ('Informatik',  'homework',   'Projekt: Datenbank-Schema',  3, null,       null,      null,              null),
  ('Englisch',    'test',       'Unit 3 Vocabulary',          5, '10:15',    2880,      null,              null),
  ('Französisch', 'homework',   'Grammatik S. 88',            6, null,       null,      null,              null),
  ('Mathematik',  'homework',   'Geometrie-Übungen',          9, null,       null,      null,              null)
) as v(fach, kind, title, offs, tm, rem, done, notes)
join public.subjects s on s.user_id = '00000000-0000-4000-a000-000000000001' and s.name = v.fach;

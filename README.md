# Agenda – Schulplaner

Responsive Web-App für Tests, Hausaufgaben und Abgaben. Optimiert auf eine
Frage: **Was muss ich bis wann tun?**

Ein Eintrag entsteht in vier Taps: `+` → Typ → Fach → Titel tippen → Datum → speichern.

## Stack

| | |
|---|---|
| Frontend | Vite · React 19 · TypeScript (strict) · Tailwind v4 · React Router |
| Daten | Supabase (Postgres + RLS) · TanStack Query mit optimistischen Updates |
| Auth | Magic Link (kein Passwort) |
| Erinnerungen | ICS-Kalender-Abo → native iOS-Alarme (Supabase Edge Function) |
| Tests | Vitest (Domain-Logik) · Playwright (3 Flows, WebKit + Chromium) |

## Lokale Entwicklung

Voraussetzung: Node 20+, Docker (für den lokalen Supabase-Stack).

```bash
npm install
npx supabase start          # startet Postgres, Auth, Studio, Mailpit
npx supabase db reset       # Schema + Entwickler-Konto + Testdaten
cp .env.example .env.local  # URL + Anon-Key aus `npx supabase status`
npm run dev
```

### Anmeldung überspringen

Lokal meldet sich die App automatisch als `dev@agenda.test` an – kein
Magic Link, kein Postfach. Das Konto entsteht beim `db reset` aus
`supabase/seed.sql` und ist bewusst **leer**: die App steht damit im
Zustand eines neuen Nutzers.

Beispieldaten sind optional und liegen getrennt in `supabase/demo.sql`
(überfällig, heute offen, heute erledigt, kommende Tage – jeder Zustand
einmal):

```bash
npm run db:demo    # Beispieldaten einspielen
npm run db:clear   # alle Fächer und Einträge löschen, Konto bleibt
```

Das Anmelden ist damit **nicht entfernt**, nur übersprungen: die gesamte
Datentrennung hängt an `auth.uid()`, ohne Session greift keine RLS-Policy.
Drei Sperren verhindern, dass die Abkürzung je in Produktion aktiv wird –
sie hängt an `import.meta.env.DEV`, die Supabase-URL muss auf localhost
zeigen, und der Import steht innerhalb der Bedingung, damit das Modul beim
Bauen komplett herausfällt. Nachprüfbar:

```bash
npm run build && grep -rc "dev@agenda.test" dist/   # muss 0 ergeben
```

Um den echten Magic-Link-Weg zu testen, in `.env.local` setzen:

```
VITE_DEV_AUTOLOGIN=false
```

Der Anmeldelink landet dann in Mailpit, nicht im echten Postfach.

Der lokale Stack läuft auf **Port 55321–55324** statt der Standardports,
damit er parallel zu anderen Supabase-Projekten betrieben werden kann
(siehe `supabase/config.toml`).

| Dienst | Adresse |
|---|---|
| API | http://127.0.0.1:55321 |
| Studio | http://127.0.0.1:55323 |
| Mailpit (Magic Links) | http://127.0.0.1:55324 |

Entwickler-Konto: `dev@agenda.test` / `agenda-dev` (nur lokal – Seeds werden
von `db push` nie in die Cloud übertragen).

Der Anmeldelink wird lokal nicht versendet, sondern landet in Mailpit.

### Befehle

```bash
npm run dev         # Dev-Server
npm run build       # Produktionsbundle inkl. Service Worker
npm run test        # Vitest (Domain- und ICS-Logik)
npm run e2e         # Playwright, iPhone-Safari + Desktop-Chrome
                    # startet einen eigenen Server auf 5174 ohne Auto-Login
npm run typecheck   # tsc --strict
npm run db:types    # TS-Typen aus dem laufenden Schema generieren
npm run db:reset    # Datenbank zurücksetzen (Schema + leeres Entwickler-Konto)
npm run db:demo     # Beispieldaten einspielen
npm run db:clear    # Fächer und Einträge löschen, Konto behalten
```

Der ICS-Feed braucht die Edge Function:

```bash
npx supabase functions serve
```

## Aufbau

```
src/
  domain/     Reine Logik: Datum, Zustände, Sortierung, Gruppierung   ← hier liegen die Tests
  data/       Supabase-Zugriff, TanStack-Query-Hooks, Mapper
  app/        Shell, Routing, Auth, Theme, globale Sheets
  ui/         Primitives: Button, Chip, Sheet, Checkbox, Toast
  features/   today · calendar · subjects · settings · entries · auth
supabase/
  migrations/ Schema und RLS
  functions/  ics/ – Kalender-Feed (Deno), _shared/ics.ts – getesteter Generator
```

### Regeln, die im Code verankert sind

- **Ein `entries`-Table** für Tests, Hausaufgaben, Abgaben und Sonstiges.
  `kind` steuert Verhalten, nicht Struktur.
- **Farbe bedeutet Fach, nie Dringlichkeit.** Dringlichkeit steht als Wort
  in der Zeile („Überfällig", „Heute", „Morgen").
- **Ein Test ist ein Ereignis, keine Aufgabe.** Er wird nicht abgehakt und
  nie überfällig – er ist nach seinem Tag vorbei.
- **`due_date` ist ein `date`, kein Timestamp.** Ein Fälligkeitstag hat
  keine Zeitzone. Die Zeitzone taucht nur in `todayIso()` und im ICS-Export auf.
- **Fachfarben werden als Token-Name gespeichert**, nicht als Hex – damit
  Hell und Dunkel unterschiedliche Werte haben können.
- **Löschen ohne Dialog, dafür mit Undo** (Soft Delete über `deleted_at`).
- Abgeleitete Zustände (`isOverdue`, `isDone`, Sortierung) existieren
  ausschliesslich in `src/domain/entry.ts`.

## Produktion einrichten

```bash
npx supabase login                          # einmalig, öffnet den Browser
npx supabase link --project-ref <ref>
npx supabase db push                        # nur Migrationen, keine Seeds
npx supabase functions deploy ics --no-verify-jwt
```

Danach in den Supabase-Auth-Einstellungen Site-URL und Redirect-URLs auf
die Produktionsdomain setzen, und beim Hoster `VITE_SUPABASE_URL` sowie
`VITE_SUPABASE_ANON_KEY` hinterlegen.

`vercel.json` bringt bereits mit, was ein clientseitiger Router braucht:
die Umschreibungsregel auf `index.html` (ohne sie liefert ein Neuladen von
`/today` einen 404), langlebiges Caching für `assets/`, ein
`must-revalidate` für `sw.js` sowie Sicherheits-Kopfzeilen inklusive CSP.

Die CSP lässt sich vor dem Deploy gegen den echten Build prüfen – sie
zerlegt eine App sonst erst in Produktion, und zwar lautlos:

```bash
npm run preview:prod    # dist/ mit den Kopfzeilen aus vercel.json
```

Der Anon-Key ist öffentlich und unkritisch – die Autorität liegt
ausschliesslich bei den RLS-Policies.

### Was nicht vergessen werden darf

- **Eigener Mailversand.** Der eingebaute Supabase-Mailer ist auf wenige
  Nachrichten pro Stunde begrenzt und landet oft im Spam. Ohne eigenen
  SMTP-Zugang (z. B. Resend) kommt man nach ein paar Anmeldungen nicht
  mehr in die eigene App.
- **Seeds gehen nie in die Cloud.** `db push` überträgt ausschliesslich
  Migrationen; das Entwickler-Konto bleibt lokal.
- Projekte im kostenlosen Tarif pausieren nach sieben Tagen ohne Zugriff.

## Bekannte Grenzen

- **Schreiben braucht Verbindung.** Gelesen wird offline aus dem
  persistierten Cache; ein Eintrag, der ohne Netz gespeichert wird, geht
  verloren. Eine Outbox-Queue ist für v1.1 vorgesehen.
- **Das Kalender-Abo aktualisiert sich verzögert** (iOS pollt typisch
  15–60 Minuten). Für „Test in drei Tagen" zuverlässig, für „in 10 Minuten"
  nicht. „Heute" in der App bleibt die verbindliche Quelle.
- **Die Feed-URL ist ein Geheimnis in einer URL.** Wer sie hat, sieht die
  Einträge. Sie lässt sich in den Einstellungen jederzeit ersetzen.

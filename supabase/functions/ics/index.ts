import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildCalendar, type IcsEntry } from '../_shared/ics.ts'

/* Öffentlicher Kalender-Feed. Der Zugang ist ausschliesslich das Token in
 * der URL – so funktionieren Kalender-Abos, denn iOS kann sich nicht
 * authentifizieren. Deshalb: hohe Entropie, jederzeit widerrufbar, und
 * nur lesend. */

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

interface FeedRow {
  entry_id: string
  kind: IcsEntry['kind']
  title: string
  notes: string | null
  due_date: string
  due_time: string | null
  reminder_minutes: number | null
  updated_at: string
  subject_name: string | null
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const token = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? ''
  if (!TOKEN_RE.test(token)) {
    return new Response('Not Found', { status: 404 })
  }

  const { data, error } = await admin.rpc('ics_feed', { feed_token: token })
  if (error) {
    console.error('ics_feed fehlgeschlagen', error)
    return new Response('Internal Server Error', { status: 500 })
  }

  /* Ein widerrufenes Token liefert keine Zeilen – genau wie ein gültiges
   * Token ohne Einträge. Beides ergibt einen leeren Kalender; die Daten
   * sind damit weg, was der Zweck des Widerrufs ist. Ein 404 wäre für den
   * Nutzer freundlicher (das Abo zeigt sichtbar einen Fehler), bräuchte
   * aber eine zweite Abfrage zur Token-Prüfung. Bewusst später. */
  const rows = (data ?? []) as FeedRow[]

  const entries: IcsEntry[] = rows.map((row) => ({
    id: row.entry_id,
    kind: row.kind,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    dueTime: row.due_time ? row.due_time.slice(0, 5) : null,
    reminderMinutes: row.reminder_minutes,
    updatedAt: row.updated_at,
    subjectName: row.subject_name,
  }))

  const body = buildCalendar(entries, { timeZone: 'Europe/Zurich', name: 'Agenda' })

  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="agenda.ics"',
      // Kalender-Clients pollen; 15 Minuten Cache halten die Last klein,
      // ohne dass neue Einträge lange ausbleiben.
      'Cache-Control': 'public, max-age=900',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})

/* Reiner ICS-Generator (RFC 5545) – keine Laufzeit-Abhängigkeiten, damit
 * dieselbe Datei in Deno läuft und in Vitest getestet werden kann. */

export interface IcsEntry {
  id: string
  kind: 'test' | 'homework' | 'assignment' | 'other'
  title: string
  notes: string | null
  dueDate: string // YYYY-MM-DD
  dueTime: string | null // HH:MM, null = ganztägig
  reminderMinutes: number | null
  updatedAt: string
  subjectName: string | null
}

const KIND_LABEL: Record<IcsEntry['kind'], string> = {
  test: 'Test',
  homework: 'Hausaufgabe',
  assignment: 'Abgabe',
  other: 'Notiz',
}

/** Ganztägige Einträge haben keine Uhrzeit. Für Erinnerungen wird der
 *  Schulbeginn als Bezugspunkt angenommen – damit landet "1 Tag vorher"
 *  am Vortag um 08:00 und nicht um Mitternacht. */
const ALL_DAY_ANCHOR_MINUTES = 8 * 60

/** RFC 5545 §3.3.11: Backslash, Semikolon, Komma und Zeilenumbrüche. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n')
}

/** RFC 5545 §3.1: Zeilen werden nach 75 Oktetten umgebrochen, die
 *  Folgezeile beginnt mit einem Leerzeichen. Gezählt werden Bytes, nicht
 *  Zeichen – sonst zerbrechen Umlaute den Feed. */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line

  const chunks: string[] = []
  const decoder = new TextDecoder()
  let start = 0
  let limit = 75
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    // Nicht mitten in eine UTF-8-Sequenz schneiden.
    while (end > start && end < bytes.length && (bytes[end]! & 0b1100_0000) === 0b1000_0000) end -= 1
    chunks.push(decoder.decode(bytes.subarray(start, end)))
    start = end
    limit = 74 // Folgezeilen tragen ein führendes Leerzeichen.
  }
  return chunks.join('\r\n ')
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** Offset der Zeitzone zum gegebenen UTC-Zeitpunkt, in Millisekunden. */
function zoneOffset(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return asUtc - instant.getTime()
}

/** Lokale Wanduhrzeit → UTC-Zeitpunkt. Zwei Runden, damit die Umstellung
 *  von Sommer- auf Winterzeit korrekt getroffen wird. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
  let instant = guess - zoneOffset(new Date(guess), timeZone)
  instant = guess - zoneOffset(new Date(instant), timeZone)
  return new Date(instant)
}

function formatUtc(instant: Date): string {
  return (
    `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1)}${pad(instant.getUTCDate())}` +
    `T${pad(instant.getUTCHours())}${pad(instant.getUTCMinutes())}${pad(instant.getUTCSeconds())}Z`
  )
}

function formatDate(date: string): string {
  return date.replace(/-/g, '')
}

function addDay(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days))
  return next.toISOString().slice(0, 10)
}

/** Auslöser relativ zum Ereignisbeginn, in Minuten vor DTSTART. */
export function alarmOffsetMinutes(entry: IcsEntry): number | null {
  if (entry.reminderMinutes === null) return null
  if (entry.dueTime) return entry.reminderMinutes
  // Ganztägig: DTSTART ist 00:00, gemeint ist aber der Schulbeginn.
  return Math.max(0, entry.reminderMinutes - ALL_DAY_ANCHOR_MINUTES)
}

export function buildEvent(entry: IcsEntry, timeZone: string, now: Date): string[] {
  const summaryParts = [entry.subjectName, `${KIND_LABEL[entry.kind]}: ${entry.title}`].filter(Boolean)
  const lines = [
    'BEGIN:VEVENT',
    // Stabile UID: ein geänderter Eintrag ersetzt den alten, statt ihn zu verdoppeln.
    `UID:${entry.id}@schulagenda`,
    `DTSTAMP:${formatUtc(now)}`,
    `LAST-MODIFIED:${formatUtc(new Date(entry.updatedAt))}`,
    `SUMMARY:${escapeText(summaryParts.join(' – '))}`,
  ]

  if (entry.dueTime) {
    const start = zonedToUtc(entry.dueDate, entry.dueTime, timeZone)
    lines.push(`DTSTART:${formatUtc(start)}`)
    lines.push(`DTEND:${formatUtc(new Date(start.getTime() + 45 * 60_000))}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(entry.dueDate)}`)
    // DTEND ist bei ganztägigen Ereignissen exklusiv.
    lines.push(`DTEND;VALUE=DATE:${formatDate(addDay(entry.dueDate, 1))}`)
  }

  if (entry.notes) lines.push(`DESCRIPTION:${escapeText(entry.notes)}`)
  lines.push('TRANSP:TRANSPARENT')

  const offset = alarmOffsetMinutes(entry)
  if (offset !== null) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${offset}M`,
      `DESCRIPTION:${escapeText(summaryParts.join(' – '))}`,
      'END:VALARM',
    )
  }

  lines.push('END:VEVENT')
  return lines
}

export function buildCalendar(
  entries: IcsEntry[],
  options: { timeZone: string; name?: string; now?: Date },
): string {
  const now = options.now ?? new Date()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchulAgenda//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.name ?? 'Agenda')}`,
    `X-WR-TIMEZONE:${options.timeZone}`,
    // Hinweis an den Client, wie oft neu geladen werden soll.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const entry of entries) lines.push(...buildEvent(entry, options.timeZone, now))
  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

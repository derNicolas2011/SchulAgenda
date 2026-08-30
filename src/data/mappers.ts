import type { Database } from '@/lib/database.types'
import {
  DEFAULT_REMINDERS,
  KIND_ORDER,
  SUBJECT_COLORS,
  type Entry,
  type EntryKind,
  type Profile,
  type Subject,
  type SubjectColorKey,
  type ThemePreference,
} from '@/domain/types'

type SubjectRow = Database['public']['Tables']['subjects']['Row']
type EntryRow = Database['public']['Tables']['entries']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

/* Die Datenbank sichert diese Werte über CHECK-Constraints ab; hier wird
 * das dem Typsystem beigebracht. Ein unbekannter Wert bedeutet, dass die
 * DB neuer ist als der Client – dann ist ein neutraler Fallback richtiger
 * als ein Absturz. */
function asColorKey(value: string): SubjectColorKey {
  return (SUBJECT_COLORS as readonly string[]).includes(value) ? (value as SubjectColorKey) : 'slate'
}

function asKind(value: string): EntryKind {
  return (KIND_ORDER as readonly string[]).includes(value) ? (value as EntryKind) : 'other'
}

function asTheme(value: string): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function asReminders(value: unknown): Partial<Record<EntryKind, number | null>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_REMINDERS
  const source = value as Record<string, unknown>
  const result: Partial<Record<EntryKind, number | null>> = {}
  for (const kind of KIND_ORDER) {
    const entry = source[kind]
    result[kind] = typeof entry === 'number' ? entry : null
  }
  return result
}

export function toSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    shortName: row.short_name,
    colorKey: asColorKey(row.color_key),
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  }
}

export function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    kind: asKind(row.kind),
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    // Postgres liefert `time` als "HH:MM:SS" – die UI arbeitet mit "HH:MM".
    dueTime: row.due_time ? row.due_time.slice(0, 5) : null,
    reminderMinutes: row.reminder_minutes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    timezone: row.timezone,
    theme: asTheme(row.theme),
    defaultReminders: asReminders(row.default_reminders),
    icsToken: row.ics_token,
  }
}

/** Kürzel aus dem Fachnamen ableiten, damit niemand ein zweites Feld
 *  ausfüllen muss. "Bildnerisches Gestalten" → "BG", "Mathematik" → "Mat" */
export function deriveShortName(name: string): string {
  const words = name.trim().split(/[\s-]+/).filter(Boolean)
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
  }
  return (words[0] ?? '').slice(0, 3)
}

/** Datum im Format `YYYY-MM-DD`. Bewusst ein String: ein Fälligkeitsdatum
 *  hat keine Zeitzone, und `Date` würde genau daraus einen Off-by-one-Fehler
 *  machen. Zeitzonen betreffen nur die Frage "welcher Tag ist heute" (date.ts)
 *  und den ICS-Export. */
export type IsoDate = string

/** Uhrzeit im Format `HH:MM`. */
export type IsoTime = string

export type EntryKind = 'test' | 'homework' | 'assignment' | 'other'

export type SubjectColorKey =
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'slate'

export const SUBJECT_COLORS: readonly SubjectColorKey[] = [
  'blue',
  'red',
  'green',
  'orange',
  'purple',
  'teal',
  'pink',
  'indigo',
  'amber',
  'slate',
]

export interface KindMeta {
  /** Volle Bezeichnung, z. B. im Auswahl-Segment. */
  label: string
  /** Kurzform für enge Listenzeilen. */
  short: string
  /** Ein Test ist ein Ereignis, keine Aufgabe: er wird nicht abgehakt und
   *  nie überfällig, sondern ist nach seinem Tag schlicht vorbei. */
  completable: boolean
  /** Reihenfolge innerhalb eines Tages bei ganztägigen Einträgen. */
  rank: number
}

export const KIND_META: Record<EntryKind, KindMeta> = {
  test: { label: 'Test', short: 'Test', completable: false, rank: 0 },
  assignment: { label: 'Abgabe', short: 'Abgabe', completable: true, rank: 1 },
  homework: { label: 'Hausaufgabe', short: 'HA', completable: true, rank: 2 },
  other: { label: 'Sonstiges', short: 'Sonst.', completable: true, rank: 3 },
}

export const KIND_ORDER: readonly EntryKind[] = ['test', 'homework', 'assignment', 'other']

export interface Subject {
  id: string
  userId: string
  name: string
  shortName: string
  colorKey: SubjectColorKey
  sortOrder: number
  archivedAt: string | null
}

export interface Entry {
  id: string
  userId: string
  subjectId: string | null
  kind: EntryKind
  title: string
  notes: string | null
  dueDate: IsoDate
  /** `null` bedeutet ganztägig – das ist der Normalfall. */
  dueTime: IsoTime | null
  /** Minuten vor Fälligkeit. `null` = keine Erinnerung. */
  reminderMinutes: number | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Eintrag samt aufgelöstem Fach – die Form, in der die UI arbeitet. */
export interface EntryWithSubject extends Entry {
  subject: Subject | null
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Profile {
  id: string
  displayName: string | null
  timezone: string
  theme: ThemePreference
  defaultReminders: Partial<Record<EntryKind, number | null>>
  icsToken: string | null
}

export const REMINDER_NONE = null

/** Erinnerungsoptionen je Typ. "1 Woche vorher" bei einer Hausaufgabe für
 *  morgen ist sinnlos – deshalb kontextabhängige Auswahl statt einer
 *  globalen Liste. Werte in Minuten vor dem Fälligkeitstag. */
const EXTENDED_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: 'Keine', minutes: null },
  { label: '1 Stunde vorher', minutes: 60 },
  { label: '2 Stunden vorher', minutes: 120 },
  { label: 'Am Vorabend', minutes: 840 },
  { label: '1 Tag vorher', minutes: 1440 },
  { label: '2 Tage vorher', minutes: 2880 },
  { label: '3 Tage vorher', minutes: 4320 },
  { label: '1 Woche vorher', minutes: 10080 },
  { label: '2 Wochen vorher', minutes: 20160 },
]

export const REMINDER_OPTIONS: Record<EntryKind, { label: string; minutes: number | null }[]> = {
  test: EXTENDED_OPTIONS,
  assignment: EXTENDED_OPTIONS,
  homework: EXTENDED_OPTIONS,
  other: EXTENDED_OPTIONS,
}

export const DEFAULT_REMINDERS: Record<EntryKind, number | null> = {
  test: 1440,
  assignment: 1440,
  homework: null,
  other: null,
}

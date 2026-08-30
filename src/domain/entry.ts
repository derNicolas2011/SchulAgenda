import { addDays, compareIso, diffDays } from './date'
import { KIND_META, type Entry, type EntryWithSubject, type IsoDate } from './types'

/* Abgeleitete Zustände werden ausschliesslich hier berechnet und nie in der
 * Datenbank gespeichert. Wenn eine Regel woanders auftaucht, ist das ein Bug. */

export function isDone(entry: Entry): boolean {
  return entry.completedAt !== null
}

export function isCompletable(entry: Entry): boolean {
  return KIND_META[entry.kind].completable
}

/** Überfällig ist nur, was man überhaupt erledigen kann. Ein Test findet
 *  statt oder nicht – er wird nicht überfällig. */
export function isOverdue(entry: Entry, today: IsoDate): boolean {
  return isCompletable(entry) && !isDone(entry) && compareIso(entry.dueDate, today) < 0
}

export function isToday(entry: Entry, today: IsoDate): boolean {
  return entry.dueDate === today
}

export function isPast(entry: Entry, today: IsoDate): boolean {
  return compareIso(entry.dueDate, today) < 0
}

/** Sichtbar im aktiven Bestand: alles ausser vergangenen Tests und
 *  erledigten Einträgen vergangener Tage. */
export function isArchived(entry: Entry, today: IsoDate): boolean {
  if (!isPast(entry, today)) return false
  return !isCompletable(entry) || isDone(entry)
}

/**
 * Sortierung innerhalb eines Tages:
 *   1. Einträge mit Uhrzeit, chronologisch
 *   2. ganztägige, nach Typ (Test → Abgabe → Hausaufgabe → Sonstiges)
 *   3. bei Gleichstand nach Fachname, dann Titel – damit die Reihenfolge
 *      über Renders hinweg stabil bleibt.
 * Erledigte wandern immer ans Ende.
 */
export function compareEntries(a: EntryWithSubject, b: EntryWithSubject): number {
  const doneDelta = Number(isDone(a)) - Number(isDone(b))
  if (doneDelta !== 0) return doneDelta

  const dateDelta = compareIso(a.dueDate, b.dueDate)
  if (dateDelta !== 0) return dateDelta

  if (a.dueTime && b.dueTime) {
    if (a.dueTime !== b.dueTime) return a.dueTime < b.dueTime ? -1 : 1
  } else if (a.dueTime !== b.dueTime) {
    return a.dueTime ? -1 : 1
  }

  const kindDelta = KIND_META[a.kind].rank - KIND_META[b.kind].rank
  if (kindDelta !== 0) return kindDelta

  const subjectDelta = (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '', 'de')
  if (subjectDelta !== 0) return subjectDelta

  return a.title.localeCompare(b.title, 'de')
}

export function sortEntries(entries: EntryWithSubject[]): EntryWithSubject[] {
  return [...entries].sort(compareEntries)
}

export interface DayGroup {
  date: IsoDate
  entries: EntryWithSubject[]
}

export interface TodayView {
  /** Nicht erledigt und in der Vergangenheit. Ganz oben, weil sonst
   *  lautlos verloren. */
  overdue: EntryWithSubject[]
  /** Heute fällig, noch offen. */
  today: EntryWithSubject[]
  /** Die nächsten Tage, nach Tag gruppiert. Leere Tage entfallen. */
  upNext: DayGroup[]
  /** Heute erledigt – bleibt sichtbar, aber ganz unten. */
  done: EntryWithSubject[]
  counts: { tests: number; homework: number; assignments: number; other: number }
}

export interface TodayOptions {
  /** Wie weit "Als Nächstes" reicht. 7 Tage ist vorhersagbarer als
   *  "die nächsten n Einträge". */
  horizonDays?: number
}

export function buildTodayView(
  entries: EntryWithSubject[],
  today: IsoDate,
  options: TodayOptions = {},
): TodayView {
  const horizon = addDays(today, options.horizonDays ?? 7)

  const overdue: EntryWithSubject[] = []
  const todayOpen: EntryWithSubject[] = []
  const doneToday: EntryWithSubject[] = []
  const upcoming: EntryWithSubject[] = []

  for (const entry of entries) {
    if (isOverdue(entry, today)) {
      overdue.push(entry)
      continue
    }
    if (isPast(entry, today)) continue

    if (entry.dueDate === today) {
      if (isDone(entry)) doneToday.push(entry)
      else todayOpen.push(entry)
      continue
    }
    if (compareIso(entry.dueDate, horizon) <= 0 && !isDone(entry)) {
      upcoming.push(entry)
    }
  }

  const byDay = new Map<IsoDate, EntryWithSubject[]>()
  for (const entry of sortEntries(upcoming)) {
    const bucket = byDay.get(entry.dueDate)
    if (bucket) bucket.push(entry)
    else byDay.set(entry.dueDate, [entry])
  }

  const upNext: DayGroup[] = [...byDay.entries()]
    .sort(([a], [b]) => compareIso(a, b))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }))

  // Die Übersicht zählt, was jetzt ansteht: überfällig + heute.
  const relevant = [...overdue, ...todayOpen]
  const counts = { tests: 0, homework: 0, assignments: 0, other: 0 }
  for (const entry of relevant) {
    if (entry.kind === 'test') counts.tests += 1
    else if (entry.kind === 'homework') counts.homework += 1
    else if (entry.kind === 'assignment') counts.assignments += 1
    else counts.other += 1
  }

  return {
    overdue: sortEntries(overdue),
    today: sortEntries(todayOpen),
    upNext,
    done: sortEntries(doneToday),
    counts,
  }
}

/** Anzahl offener Punkte für Tab-Badge und Dokumenttitel. */
export function openCount(entries: EntryWithSubject[], today: IsoDate): number {
  return entries.filter((e) => isOverdue(e, today) || (e.dueDate === today && !isDone(e))).length
}

/** Einträge nach Datum indizieren – Basis für Wochen- und Monatsansicht. */
export function indexByDate(entries: EntryWithSubject[]): Map<IsoDate, EntryWithSubject[]> {
  const map = new Map<IsoDate, EntryWithSubject[]>()
  for (const entry of sortEntries(entries)) {
    const bucket = map.get(entry.dueDate)
    if (bucket) bucket.push(entry)
    else map.set(entry.dueDate, [entry])
  }
  return map
}

/** Textlabel für die Dringlichkeit. Farbe bleibt dem Fach vorbehalten –
 *  deshalb wird Dringlichkeit als Wort ausgedrückt, nicht als Farbe. */
export function urgencyLabel(entry: Entry, today: IsoDate): string | null {
  if (isDone(entry)) return null
  const delta = diffDays(today, entry.dueDate)
  if (delta < 0) return isCompletable(entry) ? 'Überfällig' : null
  if (delta === 0) return 'Heute'
  if (delta === 1) return 'Morgen'
  return null
}

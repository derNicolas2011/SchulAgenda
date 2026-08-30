import type { IsoDate } from './types'

/* Alle Rechnungen laufen über UTC-Mitternacht. Damit sind Sommer-/Winterzeit
 * und Zeitzonen strukturell ausgeschlossen: ein Fälligkeitsdatum ist ein
 * Kalendertag, kein Zeitpunkt. */

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export const WEEKDAYS_LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const
export const MONTHS_LONG = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: string): value is IsoDate {
  return ISO_RE.test(value) && !Number.isNaN(toUtc(value).getTime())
}

/** `YYYY-MM-DD` → Date auf UTC-Mitternacht. Nur intern verwenden. */
export function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1))
}

/** Date (als UTC gelesen) → `YYYY-MM-DD`. */
export function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10)
}

/** Der heutige Kalendertag in der Zeitzone des Nutzers. Die einzige Stelle,
 *  an der die Zeitzone eine Rolle spielt. */
export function todayIso(timeZone = 'Europe/Zurich', now = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = toUtc(date)
  const targetDay = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  // Auf den letzten gültigen Tag klemmen: 31. Jan + 1 Monat = 28./29. Feb.
  const lastDay = daysInMonth(d.getUTCFullYear(), d.getUTCMonth())
  d.setUTCDate(Math.min(targetDay, lastDay))
  return fromUtc(d)
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/** Differenz in ganzen Tagen: `b - a`. */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000)
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** 0 = Montag … 6 = Sonntag. Der Wochenstart ist fix Montag. */
export function weekdayIndex(date: IsoDate): number {
  return (toUtc(date).getUTCDay() + 6) % 7
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date))
}

export function endOfWeek(date: IsoDate): IsoDate {
  return addDays(startOfWeek(date), 6)
}

/** Mo–So. Bewusst sieben statt fünf Tage: eine Abgabe am Sonntag darf
 *  nicht unsichtbar werden. */
export function weekDays(date: IsoDate): IsoDate[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`
}

export function endOfMonth(date: IsoDate): IsoDate {
  const d = toUtc(date)
  return fromUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

export function isWeekend(date: IsoDate): boolean {
  return weekdayIndex(date) >= 5
}

/** 6×7-Raster für die Monatsansicht, immer 42 Tage inklusive Rand-Tagen
 *  aus Vor- und Folgemonat. Die feste Höhe verhindert Layout-Sprünge
 *  beim Monatswechsel. */
export function monthMatrix(date: IsoDate): IsoDate[][] {
  const start = startOfWeek(startOfMonth(date))
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  )
}

/* --- Formatierung ------------------------------------------------------- */

export function dayNumber(date: IsoDate): number {
  return toUtc(date).getUTCDate()
}

export function weekdayShort(date: IsoDate): string {
  return WEEKDAYS_SHORT[weekdayIndex(date)] ?? ''
}

export function weekdayLong(date: IsoDate): string {
  return WEEKDAYS_LONG[weekdayIndex(date)] ?? ''
}

export function monthLong(date: IsoDate): string {
  return MONTHS_LONG[toUtc(date).getUTCMonth()] ?? ''
}

/** "Montag, 31. August" */
export function formatDayLong(date: IsoDate): string {
  return `${weekdayLong(date)}, ${dayNumber(date)}. ${monthLong(date)}`
}

/** "Mo, 31. Aug." */
export function formatDayShort(date: IsoDate): string {
  return `${weekdayShort(date)}, ${dayNumber(date)}. ${monthLong(date).slice(0, 3)}.`
}

/** "August 2026" */
export function formatMonthYear(date: IsoDate): string {
  return `${monthLong(date)} ${date.slice(0, 4)}`
}

/** Titel der Wochenansicht: "25.–31. August" bzw. "29. Sep. – 5. Okt. 2026" */
export function formatWeekRange(date: IsoDate): string {
  const start = startOfWeek(date)
  const end = endOfWeek(date)
  if (isSameMonth(start, end)) {
    return `${dayNumber(start)}.–${dayNumber(end)}. ${monthLong(start)}`
  }
  return `${dayNumber(start)}. ${monthLong(start).slice(0, 3)}. – ${dayNumber(end)}. ${monthLong(end).slice(0, 3)}.`
}

/** Relative Bezeichnung für Listen: "Heute", "Morgen", "Gestern",
 *  innerhalb einer Woche der Wochentag, sonst das Datum. */
export function formatRelativeDay(date: IsoDate, today: IsoDate): string {
  const delta = diffDays(today, date)
  if (delta === 0) return 'Heute'
  if (delta === 1) return 'Morgen'
  if (delta === -1) return 'Gestern'
  if (delta > 1 && delta < 7) return weekdayLong(date)
  if (delta < -1 && delta > -7) return `${weekdayLong(date)} (vergangen)`
  return formatDayShort(date)
}

/** "vor 3 Tagen" – nur für überfällige Einträge. */
export function formatOverdueLabel(date: IsoDate, today: IsoDate): string {
  const days = diffDays(date, today)
  if (days <= 0) return ''
  if (days === 1) return 'seit gestern'
  if (days < 7) return `seit ${days} Tagen`
  if (days < 14) return 'seit über einer Woche'
  return `seit ${Math.floor(days / 7)} Wochen`
}

export function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : ''
}

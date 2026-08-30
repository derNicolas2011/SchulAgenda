import { addDays, dayNumber, monthLong, weekdayIndex, weekdayLong, weekdayShort } from '@/domain/date'
import type { IsoDate } from '@/domain/types'

export interface DateChip {
  value: IsoDate
  label: string
}

/** Vier Chips decken den Alltag ab: heute, morgen, die beiden nächsten
 *  Schultage, nächster Montag. Alles andere über den nativen Picker –
 *  aber eben nur dann. */
export function buildDateChips(today: IsoDate): DateChip[] {
  const chips: DateChip[] = [
    { value: today, label: 'Heute' },
    { value: addDays(today, 1), label: 'Morgen' },
  ]

  // Die nächsten zwei Werktage, die noch nicht abgedeckt sind.
  for (let offset = 2; offset <= 8 && chips.length < 4; offset += 1) {
    const date = addDays(today, offset)
    if (weekdayIndex(date) >= 5) continue
    chips.push({ value: date, label: weekdayShort(date) })
  }

  const nextMonday = addDays(today, ((8 - weekdayIndex(today)) % 7) || 7)
  if (!chips.some((chip) => chip.value === nextMonday)) {
    chips.push({ value: nextMonday, label: 'Nächste Woche' })
  }

  return chips
}

/** Beschriftung des gewählten Datums, wenn es keinem Chip entspricht. */
export function describeDate(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Heute'
  if (date === addDays(today, 1)) return 'Morgen'
  return `${weekdayLong(date).slice(0, 2)}, ${dayNumber(date)}. ${monthLong(date)}`
}

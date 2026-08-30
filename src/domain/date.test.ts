import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  formatRelativeDay,
  formatWeekRange,
  isWeekend,
  monthMatrix,
  startOfWeek,
  todayIso,
  weekDays,
  weekdayIndex,
} from './date'

describe('addDays', () => {
  it('überschreitet Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('rechnet über den Sommerzeit-Wechsel korrekt', () => {
    // Schweiz: Umstellung am 29.03.2026 und 25.10.2026
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('behandelt Schaltjahre', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('addMonths', () => {
  it('klemmt auf den letzten gültigen Tag', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('wechselt das Jahr', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
  })
})

describe('Woche', () => {
  it('startet am Montag', () => {
    expect(weekdayIndex('2026-08-31')).toBe(0) // Montag
    expect(weekdayIndex('2026-08-30')).toBe(6) // Sonntag
    expect(startOfWeek('2026-08-30')).toBe('2026-08-24')
    expect(startOfWeek('2026-08-31')).toBe('2026-08-31')
  })

  it('liefert sieben Tage Mo–So', () => {
    const days = weekDays('2026-09-02')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-08-31')
    expect(days[6]).toBe('2026-09-06')
    expect(isWeekend(days[5]!)).toBe(true)
    expect(isWeekend(days[0]!)).toBe(false)
  })
})

describe('monthMatrix', () => {
  it('ist immer 6×7 und beginnt an einem Montag', () => {
    for (const date of ['2026-02-01', '2026-08-15', '2027-01-31']) {
      const matrix = monthMatrix(date)
      expect(matrix).toHaveLength(6)
      expect(matrix.every((week) => week.length === 7)).toBe(true)
      expect(weekdayIndex(matrix[0]![0]!)).toBe(0)
    }
  })

  it('enthält alle Tage des Monats', () => {
    const flat = monthMatrix('2026-08-01').flat()
    expect(flat).toContain('2026-08-01')
    expect(flat).toContain('2026-08-31')
    expect(endOfMonth('2026-02-01')).toBe('2026-02-28')
  })
})

describe('formatRelativeDay', () => {
  const today = '2026-08-29'
  it('benennt nahe Tage relativ', () => {
    expect(formatRelativeDay('2026-08-29', today)).toBe('Heute')
    expect(formatRelativeDay('2026-08-30', today)).toBe('Morgen')
    expect(formatRelativeDay('2026-08-28', today)).toBe('Gestern')
    expect(formatRelativeDay('2026-09-01', today)).toBe('Dienstag')
    expect(formatRelativeDay('2026-10-20', today)).toBe('Di, 20. Okt.')
  })
})

describe('formatWeekRange', () => {
  it('fasst Wochen innerhalb eines Monats zusammen', () => {
    expect(formatWeekRange('2026-08-26')).toBe('24.–30. August')
  })
  it('nennt beide Monate bei Monatswechsel', () => {
    expect(formatWeekRange('2026-09-02')).toBe('31. Aug. – 6. Sep.')
  })
})

describe('todayIso', () => {
  it('nutzt die Zeitzone des Nutzers', () => {
    // 31.08. 23:30 in Zürich = 21:30 UTC
    const now = new Date('2026-08-31T21:30:00Z')
    expect(todayIso('Europe/Zurich', now)).toBe('2026-08-31')
    expect(todayIso('UTC', now)).toBe('2026-08-31')
    // 01.09. 00:30 in Zürich = 31.08. 22:30 UTC – hier trennt sich die Spreu
    const later = new Date('2026-08-31T22:30:00Z')
    expect(todayIso('Europe/Zurich', later)).toBe('2026-09-01')
    expect(todayIso('UTC', later)).toBe('2026-08-31')
  })
})

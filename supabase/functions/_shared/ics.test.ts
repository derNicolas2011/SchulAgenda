import { describe, expect, it } from 'vitest'
import {
  alarmOffsetMinutes,
  buildCalendar,
  escapeText,
  foldLine,
  zonedToUtc,
  type IcsEntry,
} from './ics'

function entry(patch: Partial<IcsEntry> = {}): IcsEntry {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    kind: 'test',
    title: 'Kapitel 1–4',
    notes: null,
    dueDate: '2026-08-31',
    dueTime: null,
    reminderMinutes: null,
    updatedAt: '2026-08-29T10:00:00.000Z',
    subjectName: 'Mathematik',
    ...patch,
  }
}

const NOW = new Date('2026-08-29T12:00:00.000Z')

describe('escapeText', () => {
  it('maskiert die Sonderzeichen aus RFC 5545', () => {
    // Erwartung bewusst als Zeichenliste, damit sich hier nicht derselbe
    // Escaping-Fehler einschleicht wie in der Implementierung.
    expect(escapeText('a,b;c\\d').split('')).toEqual([
      'a', '\\', ',', 'b', '\\', ';', 'c', '\\', '\\', 'd',
    ])
    expect(escapeText('Zeile1\nZeile2')).toBe('Zeile1\\nZeile2')
    expect(escapeText('Zeile1\r\nZeile2')).toBe('Zeile1\\nZeile2')
  })
})

describe('foldLine', () => {
  it('lässt kurze Zeilen unangetastet', () => {
    expect(foldLine('SUMMARY:kurz')).toBe('SUMMARY:kurz')
  })

  it('bricht nach 75 Oktetten und rückt Folgezeilen ein', () => {
    const line = `SUMMARY:${'x'.repeat(200)}`
    const folded = foldLine(line)
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    expect(parts[0]!.length).toBe(75)
    expect(parts.slice(1).every((part) => part.startsWith(' '))).toBe(true)
    // Entfalten muss die Ausgangszeile exakt zurückgeben.
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })

  it('zerschneidet keine Umlaute', () => {
    const line = `SUMMARY:${'ä'.repeat(60)}`
    const folded = foldLine(line)
    // Ein zerbrochenes UTF-8-Zeichen würde als Ersatzzeichen auftauchen.
    expect(folded).not.toContain('�')
    expect(folded.replace(/\r\n /g, '')).toBe(line)
  })
})

describe('zonedToUtc', () => {
  it('rechnet Sommerzeit korrekt', () => {
    // 31.08.2026 08:00 Zürich (MESZ, UTC+2) = 06:00 UTC
    expect(zonedToUtc('2026-08-31', '08:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-08-31T06:00:00.000Z',
    )
  })

  it('rechnet Winterzeit korrekt', () => {
    // 15.12.2026 08:00 Zürich (MEZ, UTC+1) = 07:00 UTC
    expect(zonedToUtc('2026-12-15', '08:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-12-15T07:00:00.000Z',
    )
  })

  it('trifft den Tag der Zeitumstellung', () => {
    // Umstellung 25.10.2026: 03:00 MESZ → 02:00 MEZ
    expect(zonedToUtc('2026-10-25', '08:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-10-25T07:00:00.000Z',
    )
    expect(zonedToUtc('2026-10-24', '08:00', 'Europe/Zurich').toISOString()).toBe(
      '2026-10-24T06:00:00.000Z',
    )
  })
})

describe('alarmOffsetMinutes', () => {
  it('nimmt bei Uhrzeit den Wert direkt', () => {
    expect(alarmOffsetMinutes(entry({ dueTime: '08:00', reminderMinutes: 1440 }))).toBe(1440)
  })

  it('verankert ganztägige Einträge am Schulbeginn', () => {
    // 1 Tag vorher, gemessen ab 08:00 ⇒ 16 h vor Mitternacht des Fälligkeitstags
    expect(alarmOffsetMinutes(entry({ reminderMinutes: 1440 }))).toBe(960)
    // "Am Vorabend" (14 h vor 08:00) ⇒ 18:00 am Vortag
    expect(alarmOffsetMinutes(entry({ reminderMinutes: 840 }))).toBe(360)
  })

  it('liefert null ohne Erinnerung', () => {
    expect(alarmOffsetMinutes(entry())).toBeNull()
  })
})

describe('buildCalendar', () => {
  it('schreibt ganztägige Einträge mit exklusivem DTEND', () => {
    const ics = buildCalendar([entry()], { timeZone: 'Europe/Zurich', now: NOW })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260831')
    expect(ics).toContain('DTEND;VALUE=DATE:20260901')
    expect(ics).toContain('SUMMARY:Mathematik – Test: Kapitel 1–4')
  })

  it('schreibt Einträge mit Uhrzeit in UTC', () => {
    const ics = buildCalendar([entry({ dueTime: '08:00' })], { timeZone: 'Europe/Zurich', now: NOW })
    expect(ics).toContain('DTSTART:20260831T060000Z')
    expect(ics).toContain('DTEND:20260831T064500Z')
  })

  it('erzeugt einen VALARM nur bei gesetzter Erinnerung', () => {
    const ohne = buildCalendar([entry()], { timeZone: 'Europe/Zurich', now: NOW })
    expect(ohne).not.toContain('BEGIN:VALARM')

    const mit = buildCalendar([entry({ reminderMinutes: 1440 })], {
      timeZone: 'Europe/Zurich',
      now: NOW,
    })
    expect(mit).toContain('BEGIN:VALARM')
    expect(mit).toContain('TRIGGER:-PT960M')
  })

  it('nutzt stabile UIDs, damit Änderungen ersetzen statt verdoppeln', () => {
    const ics = buildCalendar([entry()], { timeZone: 'Europe/Zurich', now: NOW })
    expect(ics).toContain('UID:11111111-1111-1111-1111-111111111111@schulagenda')
  })

  it('endet mit CRLF und schliesst alle Komponenten', () => {
    const ics = buildCalendar([entry(), entry({ id: 'zweite', dueTime: '10:15' })], {
      timeZone: 'Europe/Zurich',
      now: NOW,
    })
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(2)
    expect(ics.split('END:VEVENT').length - 1).toBe(2)
    expect(ics.includes('\n') && !ics.includes('\n\n')).toBe(true)
  })
})

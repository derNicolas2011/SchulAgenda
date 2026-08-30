import { describe, expect, it } from 'vitest'
import { buildTodayView, isOverdue, openCount, sortEntries, urgencyLabel } from './entry'
import type { EntryKind, EntryWithSubject, Subject } from './types'

const TODAY = '2026-08-29'

function subject(name: string, id = name.toLowerCase()): Subject {
  return {
    id,
    userId: 'u1',
    name,
    shortName: name.slice(0, 2),
    colorKey: 'blue',
    sortOrder: 0,
    archivedAt: null,
  }
}

let seq = 0
function entry(patch: Partial<EntryWithSubject> & { kind?: EntryKind }): EntryWithSubject {
  seq += 1
  return {
    id: `e${seq}`,
    userId: 'u1',
    subjectId: null,
    kind: 'homework',
    title: `Aufgabe ${seq}`,
    notes: null,
    dueDate: TODAY,
    dueTime: null,
    reminderMinutes: null,
    completedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    subject: null,
    ...patch,
  }
}

describe('isOverdue', () => {
  it('gilt für offene Aufgaben in der Vergangenheit', () => {
    expect(isOverdue(entry({ dueDate: '2026-08-28' }), TODAY)).toBe(true)
    expect(isOverdue(entry({ dueDate: '2026-08-29' }), TODAY)).toBe(false)
    expect(isOverdue(entry({ dueDate: '2026-08-30' }), TODAY)).toBe(false)
  })

  it('gilt nie für Tests – ein Test ist ein Ereignis, keine Aufgabe', () => {
    expect(isOverdue(entry({ kind: 'test', dueDate: '2026-08-01' }), TODAY)).toBe(false)
  })

  it('gilt nicht für Erledigtes', () => {
    const done = entry({ dueDate: '2026-08-20', completedAt: '2026-08-20T18:00:00Z' })
    expect(isOverdue(done, TODAY)).toBe(false)
  })

  it('funktioniert über Jahresgrenzen', () => {
    expect(isOverdue(entry({ dueDate: '2025-12-31' }), '2026-01-01')).toBe(true)
    expect(isOverdue(entry({ dueDate: '2026-01-01' }), '2025-12-31')).toBe(false)
  })
})

describe('sortEntries', () => {
  it('setzt Einträge mit Uhrzeit vor ganztägige', () => {
    const sorted = sortEntries([
      entry({ title: 'ganztägig' }),
      entry({ title: 'um 14:00', dueTime: '14:00' }),
      entry({ title: 'um 08:00', dueTime: '08:00' }),
    ])
    expect(sorted.map((e) => e.title)).toEqual(['um 08:00', 'um 14:00', 'ganztägig'])
  })

  it('ordnet ganztägige nach Typ: Test, Abgabe, HA, Sonstiges', () => {
    const sorted = sortEntries([
      entry({ kind: 'other', title: 'o' }),
      entry({ kind: 'homework', title: 'h' }),
      entry({ kind: 'test', title: 't' }),
      entry({ kind: 'assignment', title: 'a' }),
    ])
    expect(sorted.map((e) => e.title)).toEqual(['t', 'a', 'h', 'o'])
  })

  it('ist bei gleicher Uhrzeit stabil über Fach und Titel', () => {
    const sorted = sortEntries([
      entry({ dueTime: '08:00', title: 'B', subject: subject('Deutsch') }),
      entry({ dueTime: '08:00', title: 'A', subject: subject('Deutsch') }),
      entry({ dueTime: '08:00', title: 'C', subject: subject('Chemie') }),
    ])
    expect(sorted.map((e) => e.title)).toEqual(['C', 'A', 'B'])
  })

  it('schiebt Erledigtes immer ans Ende', () => {
    const sorted = sortEntries([
      entry({ kind: 'test', title: 'erledigt', completedAt: '2026-08-29T09:00:00Z' }),
      entry({ title: 'offen' }),
    ])
    expect(sorted.map((e) => e.title)).toEqual(['offen', 'erledigt'])
  })
})

describe('buildTodayView', () => {
  it('trennt überfällig, heute, als Nächstes und erledigt', () => {
    const view = buildTodayView(
      [
        entry({ title: 'alt', dueDate: '2026-08-25' }),
        entry({ title: 'heute offen' }),
        entry({ title: 'heute erledigt', completedAt: '2026-08-29T09:00:00Z' }),
        entry({ title: 'morgen', dueDate: '2026-08-30' }),
        entry({ title: 'in 3 Tagen', dueDate: '2026-09-01' }),
        entry({ title: 'weit weg', dueDate: '2026-11-01' }),
      ],
      TODAY,
    )
    expect(view.overdue.map((e) => e.title)).toEqual(['alt'])
    expect(view.today.map((e) => e.title)).toEqual(['heute offen'])
    expect(view.done.map((e) => e.title)).toEqual(['heute erledigt'])
    expect(view.upNext.map((g) => g.date)).toEqual(['2026-08-30', '2026-09-01'])
  })

  it('blendet Weitentferntes aus – der Horizont ist 7 Tage', () => {
    const view = buildTodayView([entry({ dueDate: '2026-09-05' }), entry({ dueDate: '2026-09-06' })], TODAY)
    expect(view.upNext.map((g) => g.date)).toEqual(['2026-09-05'])
  })

  it('zeigt vergangene Tests nicht mehr an', () => {
    const view = buildTodayView([entry({ kind: 'test', dueDate: '2026-08-01' })], TODAY)
    expect(view.overdue).toHaveLength(0)
    expect(view.today).toHaveLength(0)
    expect(view.upNext).toHaveLength(0)
  })

  it('gruppiert kommende Tage und lässt leere Tage weg', () => {
    const view = buildTodayView(
      [
        entry({ dueDate: '2026-09-02', title: 'a' }),
        entry({ dueDate: '2026-09-02', title: 'b' }),
        entry({ dueDate: '2026-09-04', title: 'c' }),
      ],
      TODAY,
    )
    expect(view.upNext).toHaveLength(2)
    expect(view.upNext[0]!.entries).toHaveLength(2)
  })

  it('zählt überfällige und heutige Punkte zusammen', () => {
    const view = buildTodayView(
      [
        entry({ kind: 'test' }),
        entry({ kind: 'homework' }),
        entry({ kind: 'homework', dueDate: '2026-08-27' }),
        entry({ kind: 'assignment' }),
        entry({ kind: 'homework', dueDate: '2026-09-05' }),
      ],
      TODAY,
    )
    expect(view.counts).toEqual({ tests: 1, homework: 2, assignments: 1, other: 0 })
    expect(openCount([entry({ kind: 'homework' })], TODAY)).toBe(1)
  })
})

describe('urgencyLabel', () => {
  it('beschreibt Dringlichkeit als Wort, nicht als Farbe', () => {
    expect(urgencyLabel(entry({}), TODAY)).toBe('Heute')
    expect(urgencyLabel(entry({ dueDate: '2026-08-30' }), TODAY)).toBe('Morgen')
    expect(urgencyLabel(entry({ dueDate: '2026-08-20' }), TODAY)).toBe('Überfällig')
    expect(urgencyLabel(entry({ dueDate: '2026-09-10' }), TODAY)).toBeNull()
    expect(urgencyLabel(entry({ completedAt: '2026-08-29T09:00:00Z' }), TODAY)).toBeNull()
  })
})

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAgenda } from '@/app/useAgenda'
import { useSheetParams } from '@/app/useSheetParams'
import { formatDayLong, formatRelativeDay } from '@/domain/date'
import { buildTodayView } from '@/domain/entry'
import type { TodayView } from '@/domain/entry'
import { EntryRow } from '@/features/entries/EntryRow'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Section } from '@/ui/Section'

export function TodayPage() {
  const { entries, today, subjects, isLoading } = useAgenda()
  const sheets = useSheetParams()
  const [showDone, setShowDone] = useState(false)

  const view = buildTodayView(entries, today)

  if (isLoading && entries.length === 0) {
    return <PageHeader today={today} />
  }

  if (subjects.length === 0) {
    return (
      <>
        <PageHeader today={today} />
        <EmptyState
          title="Leg zuerst deine Fächer an"
          hint="Danach dauert ein Eintrag nur noch ein paar Sekunden."
          action={
            <Link to="/subjects">
              <Button variant="primary">Fächer einrichten</Button>
            </Link>
          }
        />
      </>
    )
  }

  const nothingOpen = view.overdue.length === 0 && view.today.length === 0

  return (
    <>
      <PageHeader today={today} />
      <Summary view={view} />

      {/* Überfälliges steht ganz oben. Eine nicht abgehakte Aufgabe von
          gestern darf nicht lautlos in der Vergangenheit verschwinden. */}
      {view.overdue.length > 0 && (
        <Section title="Überfällig" tone="danger">
          {view.overdue.map((entry) => (
            <EntryRow key={entry.id} entry={entry} today={today} onOpen={sheets.openDetail} />
          ))}
        </Section>
      )}

      {view.today.length > 0 && (
        <Section title="Heute">
          {view.today.map((entry) => (
            <EntryRow key={entry.id} entry={entry} today={today} onOpen={sheets.openDetail} hideUrgency />
          ))}
        </Section>
      )}

      {nothingOpen && (
        <EmptyState
          title={view.done.length > 0 ? 'Alles erledigt.' : 'Heute nichts zu tun.'}
          hint={
            view.upNext.length > 0
              ? 'Weiter unten siehst du, was in den nächsten Tagen ansteht.'
              : 'Mit + trägst du etwas Neues ein.'
          }
        />
      )}

      {view.upNext.length > 0 && (
        <Section title="Als Nächstes">
          <div className="flex flex-col gap-4">
            {view.upNext.map((group) => (
              <div key={group.date}>
                <p className="mb-0.5 text-meta font-medium text-muted">
                  {formatRelativeDay(group.date, today)}
                </p>
                {group.entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    today={today}
                    onOpen={sheets.openDetail}
                    hideUrgency
                    compact
                  />
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Erledigtes verschwindet aus dem Blickfeld, bleibt aber
          nachvollziehbar – eingeklappt hinter einer Zeile. */}
      {view.done.length > 0 && (
        <div className="mt-8 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="text-meta font-medium text-muted hover:text-text"
          >
            {view.done.length} heute erledigt {showDone ? '▴' : '▾'}
          </button>
          {showDone && (
            <div className="mt-1">
              {view.done.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  today={today}
                  onOpen={sheets.openDetail}
                  hideUrgency
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function PageHeader({ today }: { today: string }) {
  return (
    <header className="pt-6 pb-1 md:pt-10">
      <h1 className="text-display font-semibold tracking-tight">Heute</h1>
      <p className="mt-0.5 text-body text-muted">{formatDayLong(today)}</p>
    </header>
  )
}

/** Kompakte Übersicht: zählt nur, was jetzt ansteht (überfällig + heute). */
function Summary({ view }: { view: TodayView }) {
  const parts = [
    view.counts.tests > 0 && `${view.counts.tests} ${view.counts.tests === 1 ? 'Test' : 'Tests'}`,
    view.counts.homework > 0 &&
      `${view.counts.homework} ${view.counts.homework === 1 ? 'Hausaufgabe' : 'Hausaufgaben'}`,
    view.counts.assignments > 0 &&
      `${view.counts.assignments} ${view.counts.assignments === 1 ? 'Abgabe' : 'Abgaben'}`,
    view.counts.other > 0 && `${view.counts.other} Sonstiges`,
  ].filter(Boolean) as string[]

  if (parts.length === 0) return null

  return <p className="mt-3 mb-1 text-body text-muted">{parts.join(' · ')}</p>
}

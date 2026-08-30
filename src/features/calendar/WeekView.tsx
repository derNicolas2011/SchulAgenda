import { Plus } from 'lucide-react'
import { dayNumber, isWeekend, weekDays, weekdayShort } from '@/domain/date'
import type { EntryWithSubject, IsoDate } from '@/domain/types'
import { EntryRow } from '@/features/entries/EntryRow'
import { cn } from '@/ui/cn'
import { subjectColor } from '@/ui/subjectColor'
import { isDone } from '@/domain/entry'

interface Props {
  anchor: IsoDate
  today: IsoDate
  byDate: Map<IsoDate, EntryWithSubject[]>
  onOpenEntry: (id: string) => void
  onAddOnDay: (date: IsoDate) => void
}

/** Mo–So, nicht Mo–Fr: eine Abgabe am Sonntag darf nicht unsichtbar werden.
 *  Das Wochenende ist nur visuell zurückgenommen. */
export function WeekView({ anchor, today, byDate, onOpenEntry, onAddOnDay }: Props) {
  const days = weekDays(anchor)

  return (
    <>
      {/* Mobil: Tagesliste. Ein 7-Spalten-Raster ist auf 390 px unlesbar. */}
      <div className="flex flex-col md:hidden">
        {days.map((date) => {
          const entries = byDate.get(date) ?? []
          const isToday = date === today
          return (
            <div key={date} className={cn('border-b border-border py-2', isWeekend(date) && 'bg-sunken/40')}>
              <button
                type="button"
                onClick={() => onAddOnDay(date)}
                className="flex w-full items-center gap-2 px-1 py-1 text-left"
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-full text-meta font-semibold tabular',
                    isToday ? 'bg-accent text-accent-contrast' : 'text-muted',
                  )}
                >
                  {dayNumber(date)}
                </span>
                <span className={cn('text-meta font-medium', isToday ? 'text-accent' : 'text-muted')}>
                  {weekdayShort(date)}
                </span>
                {entries.length === 0 && (
                  <Plus size={15} strokeWidth={1.75} className="ml-auto text-faint" />
                )}
              </button>
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} today={today} onOpen={onOpenEntry} hideUrgency compact />
              ))}
            </div>
          )
        })}
      </div>

      {/* Desktop: sieben Spalten */}
      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid">
        {days.map((date) => {
          const entries = byDate.get(date) ?? []
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn('min-h-[320px] bg-bg p-2', isWeekend(date) && 'bg-sunken')}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span className={cn('text-meta font-medium', isToday ? 'text-accent' : 'text-muted')}>
                  {weekdayShort(date)}
                </span>
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-full text-meta font-semibold tabular',
                    isToday ? 'bg-accent text-accent-contrast' : 'text-text',
                  )}
                >
                  {dayNumber(date)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onOpenEntry(entry.id)}
                    className={cn(
                      'w-full rounded-[8px] border-l-[3px] bg-surface px-2 py-1.5 text-left transition-colors hover:bg-elevated',
                      isDone(entry) && 'opacity-45',
                    )}
                    style={{ borderLeftColor: subjectColor(entry.subject) }}
                  >
                    <span
                      className="block truncate text-[11px] font-medium"
                      style={{ color: subjectColor(entry.subject) }}
                    >
                      {entry.subject?.shortName ?? '—'}
                      {entry.dueTime && <span className="ml-1 text-faint tabular">{entry.dueTime}</span>}
                    </span>
                    <span className={cn('block truncate text-meta', isDone(entry) && 'line-through')}>
                      {entry.title}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onAddOnDay(date)}
                aria-label={`Eintrag am ${date} hinzufügen`}
                className="mt-1 grid h-7 w-full place-items-center rounded-[8px] text-faint opacity-0
                           transition-opacity hover:bg-elevated focus-visible:opacity-100 hover:opacity-100"
              >
                <Plus size={15} strokeWidth={1.75} />
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

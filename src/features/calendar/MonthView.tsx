import { Plus } from 'lucide-react'
import { dayNumber, formatDayLong, isSameMonth, isWeekend, monthMatrix, WEEKDAYS_SHORT } from '@/domain/date'
import { isDone } from '@/domain/entry'
import type { EntryWithSubject, IsoDate } from '@/domain/types'
import { EntryRow } from '@/features/entries/EntryRow'
import { cn } from '@/ui/cn'
import { subjectColor } from '@/ui/subjectColor'

interface Props {
  anchor: IsoDate
  today: IsoDate
  selected: IsoDate
  byDate: Map<IsoDate, EntryWithSubject[]>
  onSelect: (date: IsoDate) => void
  onOpenEntry: (id: string) => void
  onAddOnDay: (date: IsoDate) => void
}

const MAX_DOTS = 3

/** Punkt-Raster statt Event-Blöcke: ein echtes Monats-Grid mit Titeln ist
 *  auf dem iPhone unlesbar und kostet ein Vielfaches an Code. Der
 *  ausgewählte Tag wird als Liste unter dem Raster ausgeklappt. */
export function MonthView({ anchor, today, selected, byDate, onSelect, onOpenEntry, onAddOnDay }: Props) {
  const weeks = monthMatrix(anchor)
  const selectedEntries = byDate.get(selected) ?? []

  return (
    <>
      <div className="grid grid-cols-7 gap-px pb-1">
        {WEEKDAYS_SHORT.map((label) => (
          <div key={label} className="pb-1 text-center text-meta font-medium text-muted">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border">
        {weeks.flat().map((date) => {
          const entries = byDate.get(date) ?? []
          const inMonth = isSameMonth(date, anchor)
          const isToday = date === today
          const isSelected = date === selected
          
          const testEntry = entries.find(e => e.kind === 'test')
          const hasTest = !!testEntry

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={`${formatDayLong(date)}, ${entries.length} Einträge`}
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-[58px] flex-col items-center gap-1 bg-bg px-1 pt-1.5 pb-1 transition-colors md:min-h-[76px]',
                isWeekend(date) && 'bg-sunken',
                !inMonth && 'opacity-35',
                isSelected && 'bg-elevated',
                hasTest && !isSelected && 'bg-[var(--surface)]'
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-meta tabular',
                  isToday ? 'bg-accent font-bold text-accent-contrast' : 
                  hasTest ? 'font-bold text-white shadow-sm' : 'font-medium',
                )}
                style={!isToday && hasTest ? { backgroundColor: subjectColor(testEntry.subject) } : undefined}
              >
                {dayNumber(date)}
              </span>

              <span className="flex h-2 items-center gap-[3px]">
                {entries.slice(0, MAX_DOTS).map((entry) => {
                  const isTest = entry.kind === 'test'
                  return (
                    <span
                      key={entry.id}
                      className={cn(
                        isTest ? 'h-[7px] w-[7px] rounded-[2px]' : 'h-[5px] w-[5px] rounded-full',
                        isDone(entry) && 'opacity-40'
                      )}
                      style={{ background: subjectColor(entry.subject) }}
                    />
                  )
                })}
                {entries.length > MAX_DOTS && (
                  <span className="text-[9px] leading-none font-semibold text-muted">
                    +{entries.length - MAX_DOTS}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-body font-semibold text-muted">{formatDayLong(selected)}</h2>
          <button
            type="button"
            onClick={() => onAddOnDay(selected)}
            aria-label="Eintrag an diesem Tag hinzufügen"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-elevated hover:text-text"
          >
            <Plus size={18} strokeWidth={1.75} />
          </button>
        </div>

        {selectedEntries.length === 0 ? (
          <p className="py-3 text-body text-faint">Nichts eingetragen.</p>
        ) : (
          selectedEntries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} today={today} onOpen={onOpenEntry} hideUrgency />
          ))
        )}
      </div>
    </>
  )
}

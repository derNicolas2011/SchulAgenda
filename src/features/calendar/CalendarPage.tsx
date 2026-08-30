import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAgenda } from '@/app/useAgenda'
import { useSheetParams } from '@/app/useSheetParams'
import {
  addDays,
  addMonths,
  formatMonthYear,
  formatWeekRange,
  isIsoDate,
  startOfMonth,
  startOfWeek,
} from '@/domain/date'
import { indexByDate } from '@/domain/entry'
import type { IsoDate } from '@/domain/types'
import { Segmented } from '@/ui/Segmented'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'

type View = 'week' | 'month'

export function CalendarPage() {
  const { entries, today } = useAgenda()
  const sheets = useSheetParams()
  const [params, setParams] = useSearchParams()

  const view: View = params.get('view') === 'month' ? 'month' : 'week'
  const rawDate = params.get('date')
  const anchor: IsoDate = rawDate && isIsoDate(rawDate) ? rawDate : today

  const byDate = useMemo(() => indexByDate(entries), [entries])

  function update(next: { view?: View; date?: IsoDate }) {
    const search = new URLSearchParams(params)
    if (next.view) search.set('view', next.view)
    if (next.date) search.set('date', next.date)
    setParams(search, { replace: true })
  }

  const step = (direction: number) =>
    update({ date: view === 'week' ? addDays(anchor, direction * 7) : addMonths(anchor, direction) })

  // "Heute" erscheint nur, wenn man nicht ohnehin dort ist – das spart
  // dauerhaft einen Button.
  const isCurrentPeriod =
    view === 'week' ? startOfWeek(anchor) === startOfWeek(today) : startOfMonth(anchor) === startOfMonth(today)

  // Handler in einer Ref: der Listener wird einmal registriert, greift
  // aber immer auf den aktuellen Anker und die aktuelle Ansicht zu.
  const handleKey = useRef<(event: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    handleKey.current = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (event.key === 'ArrowLeft') step(-1)
      else if (event.key === 'ArrowRight') step(1)
      else if (event.key === 't') update({ date: today })
      else if (event.key === 'w') update({ view: 'week' })
      else if (event.key === 'm') update({ view: 'month' })
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <>
      <header className="pt-6 pb-3 md:pt-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-title font-semibold tracking-tight">
            {view === 'week' ? formatWeekRange(anchor) : formatMonthYear(anchor)}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={() => update({ date: today })}
                className="mr-1 h-9 rounded-[var(--radius-chip)] border border-border px-3 text-body font-medium hover:bg-elevated"
              >
                Heute
              </button>
            )}
            <button
              type="button"
              aria-label={view === 'week' ? 'Vorherige Woche' : 'Vorheriger Monat'}
              onClick={() => step(-1)}
              className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-elevated hover:text-text"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={view === 'week' ? 'Nächste Woche' : 'Nächster Monat'}
              onClick={() => step(1)}
              className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-elevated hover:text-text"
            >
              <ChevronRight size={22} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <Segmented
          ariaLabel="Kalenderansicht"
          className="mt-3 max-w-[220px]"
          value={view}
          onChange={(next) => update({ view: next })}
          options={[
            { value: 'week', label: 'Woche' },
            { value: 'month', label: 'Monat' },
          ]}
        />
      </header>

      {view === 'week' ? (
        <WeekView
          anchor={anchor}
          today={today}
          byDate={byDate}
          onOpenEntry={sheets.openDetail}
          onAddOnDay={(date) => sheets.openCreate({ date })}
        />
      ) : (
        <MonthView
          anchor={anchor}
          today={today}
          byDate={byDate}
          selected={rawDate && isIsoDate(rawDate) ? rawDate : today}
          onSelect={(date) => update({ date })}
          onOpenEntry={sheets.openDetail}
          onAddOnDay={(date) => sheets.openCreate({ date })}
        />
      )}
    </>
  )
}

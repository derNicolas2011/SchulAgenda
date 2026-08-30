import { useToggleEntry } from '@/data/queries'
import { formatTime } from '@/domain/date'
import { isCompletable, isDone, urgencyLabel } from '@/domain/entry'
import { KIND_META, type EntryWithSubject, type IsoDate } from '@/domain/types'
import { cn } from '@/ui/cn'
import { Checkbox } from '@/ui/Checkbox'
import { subjectColor } from '@/ui/subjectColor'

interface Props {
  entry: EntryWithSubject
  today: IsoDate
  onOpen: (id: string) => void
  /** Im Kalender ist das Datum ohnehin durch die Position klar. */
  hideUrgency?: boolean
  compact?: boolean
}

export function EntryRow({ entry, today, onOpen, hideUrgency, compact }: Props) {
  const toggle = useToggleEntry()
  const done = isDone(entry)
  const color = subjectColor(entry.subject)
  const urgency = hideUrgency ? null : urgencyLabel(entry, today)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(entry.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(entry.id)
        }
      }}
      className={cn(
        'group flex w-full items-center gap-1 rounded-[var(--radius-card)] text-left transition-colors',
        'hover:bg-elevated',
        compact ? 'min-h-11 py-1' : 'min-h-[60px] py-1.5 md:min-h-[52px]',
        done && 'opacity-45',
      )}
    >
      {isCompletable(entry) ? (
        <Checkbox
          checked={done}
          color={color}
          label={`${entry.title} als erledigt markieren`}
          onChange={(next) => toggle.mutate({ id: entry.id, done: next })}
        />
      ) : (
        // Ein Test wird nicht abgehakt – er findet statt. Der Platz bleibt
        // leer, aber reserviert, damit die Liste nicht ausfranst. Die
        // Fachfarbe trägt ohnehin schon der Balken rechts davon.
        <span aria-hidden className="h-11 w-11 shrink-0" />
      )}

      <span className="mr-2 h-8 w-[3px] shrink-0 rounded-full" style={{ background: color }} />

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-meta font-medium" style={{ color }}>
            {entry.subject?.name ?? 'Ohne Fach'}
          </span>
          <span className="shrink-0 text-meta text-faint">{KIND_META[entry.kind].short}</span>
        </div>
        <p className={cn('truncate text-row', done && 'line-through')}>{entry.title}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pr-2 text-meta">
        {entry.dueTime && <span className="tabular text-muted">{formatTime(entry.dueTime)}</span>}
        {urgency && (
          <span className={cn(urgency === 'Überfällig' ? 'font-semibold text-danger' : 'text-muted')}>
            {urgency}
          </span>
        )}
      </div>
    </div>
  )
}

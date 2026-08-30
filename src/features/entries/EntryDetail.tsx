import { Bell, CalendarDays, Clock, FileText, Pencil } from 'lucide-react'
import { formatDayLong, formatTime } from '@/domain/date'
import { isCompletable, isDone } from '@/domain/entry'
import { KIND_META, REMINDER_OPTIONS, type EntryWithSubject } from '@/domain/types'
import { useToggleEntry } from '@/data/queries'
import { Button } from '@/ui/Button'
import { ColorDot } from '@/ui/Chip'
import { Sheet } from '@/ui/Sheet'
import { subjectColor } from '@/ui/subjectColor'

interface Props {
  entry: EntryWithSubject | null
  onClose: () => void
  onEdit: (id: string) => void
}

export function EntryDetail({ entry, onClose, onEdit }: Props) {
  const toggle = useToggleEntry()
  if (!entry) return null

  const color = subjectColor(entry.subject)
  const done = isDone(entry)
  const reminder = REMINDER_OPTIONS[entry.kind].find((o) => o.minutes === entry.reminderMinutes)

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onClose()}
      title={entry.title}
      hideTitle
      footer={
        <div className="flex gap-2">
          {isCompletable(entry) && (
            <Button
              variant={done ? 'secondary' : 'primary'}
              block
              onClick={() => {
                toggle.mutate({ id: entry.id, done: !done })
                onClose()
              }}
            >
              {done ? 'Wieder öffnen' : 'Erledigt'}
            </Button>
          )}
          <Button variant={isCompletable(entry) ? 'secondary' : 'primary'} block onClick={() => onEdit(entry.id)}>
            <Pencil size={16} strokeWidth={1.75} />
            Bearbeiten
          </Button>
        </div>
      }
    >
      <div className="pb-2">
        <div className="flex items-center gap-2 text-meta font-medium" style={{ color }}>
          <ColorDot color={color} />
          {entry.subject?.name ?? 'Ohne Fach'}
          <span className="text-faint">·</span>
          <span className="text-faint">{KIND_META[entry.kind].label}</span>
        </div>

        <h2 className="mt-1 text-title font-semibold tracking-tight">{entry.title}</h2>

        <dl className="mt-5 flex flex-col gap-3 text-body">
          <Line icon={<CalendarDays size={17} strokeWidth={1.75} />}>{formatDayLong(entry.dueDate)}</Line>
          {entry.dueTime && (
            <Line icon={<Clock size={17} strokeWidth={1.75} />}>{formatTime(entry.dueTime)} Uhr</Line>
          )}
          {entry.notes && (
            <Line icon={<FileText size={17} strokeWidth={1.75} />}>
              <span className="whitespace-pre-wrap">{entry.notes}</span>
            </Line>
          )}
          {entry.reminderMinutes !== null && (
            <Line icon={<Bell size={17} strokeWidth={1.75} />}>{reminder?.label ?? 'Erinnerung gesetzt'}</Line>
          )}
        </dl>
      </div>
    </Sheet>
  )
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-faint">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

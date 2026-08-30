import { Bell, CalendarPlus, Clock, FileText } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAgenda } from '@/app/useAgenda'
import { useCreateEntry, useDeleteEntry, useUpdateEntry, type EntryDraft } from '@/data/queries'
import {
  DEFAULT_REMINDERS,
  KIND_META,
  KIND_ORDER,
  REMINDER_OPTIONS,
  type EntryKind,
  type EntryWithSubject,
  type IsoDate,
} from '@/domain/types'
import { Button } from '@/ui/Button'
import { Chip, ColorDot } from '@/ui/Chip'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { useToast } from '@/ui/Toast'
import { subjectColor } from '@/ui/subjectColor'
import { buildDateChips, describeDate } from './dateChips'

interface Props {
  open: boolean
  onClose: () => void
  /** Vorhandener Eintrag = Bearbeiten. Ohne = Neu. */
  entry?: EntryWithSubject | null
  presetKind?: EntryKind
  presetDate?: IsoDate
}

const LAST_USED_KEY = 'agenda.lastUsed'

interface LastUsed {
  kind?: EntryKind
  subjectId?: string | null
}

function readLastUsed(): LastUsed {
  try {
    return JSON.parse(localStorage.getItem(LAST_USED_KEY) ?? '{}') as LastUsed
  } catch {
    return {}
  }
}

function writeLastUsed(value: LastUsed) {
  try {
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(value))
  } catch {
    /* nicht kritisch */
  }
}

/**
 * Ein Sheet, alles sichtbar – bewusst kein Wizard. Ein Wizard kostet
 * Screenwechsel beim Erstellen und ist beim Bearbeiten unbrauchbar.
 * Zielbudget: 4 Taps plus Titel tippen.
 */
export function EntrySheet({ open, onClose, entry, presetKind, presetDate }: Props) {
  const { today, activeSubjects, profile } = useAgenda()
  const toast = useToast()
  const createEntry = useCreateEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()
  const titleRef = useRef<HTMLInputElement>(null)

  const isEditing = Boolean(entry)

  /* Der Anfangszustand wird beim Montieren einmal gelesen – nicht in einem
   * Effekt nachgezogen. Das Sheet bekommt vom AppFrame pro Öffnung einen
   * neuen `key`, deshalb ist "frisch montiert" gleichbedeutend mit
   * "frisch initialisiert". Ein Hintergrund-Refetch kann das Formular so
   * gar nicht mehr leeren. */
  const initial = useMemo(() => {
    if (entry) {
      return {
        kind: entry.kind,
        subjectId: entry.subjectId,
        title: entry.title,
        dueDate: entry.dueDate,
        dueTime: entry.dueTime,
        reminderMinutes: entry.reminderMinutes,
        notes: entry.notes ?? '',
      }
    }
    const lastUsed = readLastUsed()
    const kind = presetKind ?? lastUsed.kind ?? 'homework'
    return {
      kind,
      subjectId: lastUsed.subjectId ?? null,
      title: '',
      dueDate: presetDate ?? today,
      dueTime: null,
      reminderMinutes: profile?.defaultReminders?.[kind] ?? DEFAULT_REMINDERS[kind],
      notes: '',
    }
    // Bewusst nur beim Montieren – siehe Kommentar oben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [kind, setKind] = useState<EntryKind>(initial.kind)
  const [subjectId, setSubjectId] = useState<string | null>(initial.subjectId)
  const [title, setTitle] = useState(initial.title)
  const [dueDate, setDueDate] = useState<IsoDate>(initial.dueDate)
  const [dueTime, setDueTime] = useState<string | null>(initial.dueTime)
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(initial.reminderMinutes)
  const [notes, setNotes] = useState(initial.notes)
  const [showTime, setShowTime] = useState(initial.dueTime !== null)
  const [showReminder, setShowReminder] = useState(Boolean(entry) && initial.reminderMinutes !== null)
  const [showNotes, setShowNotes] = useState(initial.notes.length > 0)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Der Fokus gehört ins Titelfeld: Typ und Fach sind ein Tap, der Titel
  // ist das Einzige, was getippt werden muss.
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => titleRef.current?.focus(), 120)
    return () => clearTimeout(id)
  }, [open])

  const dateChips = useMemo(() => buildDateChips(today), [today])
  const reminderOptions = REMINDER_OPTIONS[kind]
  const canSave = title.trim().length > 0

  function changeKind(next: EntryKind) {
    setKind(next)
    // Die Standarderinnerung folgt dem Typ, solange sie nicht angefasst wurde.
    if (!showReminder && !isEditing) {
      setReminderMinutes(profile?.defaultReminders?.[next] ?? DEFAULT_REMINDERS[next])
    }
  }

  function save() {
    if (!canSave) return
    const draft: EntryDraft = {
      kind,
      subjectId,
      title,
      dueDate,
      dueTime: showTime ? dueTime : null,
      reminderMinutes,
      notes: showNotes ? notes : null,
    }

    if (entry) {
      updateEntry.mutate({ id: entry.id, ...draft })
      toast.show('Gespeichert')
    } else {
      createEntry.mutate(draft)
      writeLastUsed({ kind, subjectId })
      toast.show(`${KIND_META[kind].label} eingetragen`)
    }
    onClose()
  }

  function remove() {
    if (!entry) return
    const removed = entry
    deleteEntry.mutate(removed.id)
    onClose()
    toast.show('Gelöscht', {
      label: 'Rückgängig',
      onAction: () => {
        createEntry.mutate({
          kind: removed.kind,
          subjectId: removed.subjectId,
          title: removed.title,
          dueDate: removed.dueDate,
          dueTime: removed.dueTime,
          reminderMinutes: removed.reminderMinutes,
          notes: removed.notes,
        })
      },
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={isEditing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
      footer={
        <div className="flex gap-2">
          {isEditing && (
            <Button variant="danger" onClick={remove}>
              Löschen
            </Button>
          )}
          <Button variant="primary" block onClick={save} disabled={!canSave}>
            {isEditing ? 'Speichern' : 'Eintragen'}
          </Button>
        </div>
      }
    >
      <div
        className="flex flex-col gap-4 pt-1"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            save()
          }
        }}
      >
        <Segmented
          ariaLabel="Art des Eintrags"
          value={kind}
          onChange={changeKind}
          options={KIND_ORDER.map((value) => ({ value, label: KIND_META[value].short }))}
        />

        <input
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={kind === 'test' ? 'z. B. Kapitel 1–4' : 'z. B. Aufgaben 4–8'}
          maxLength={120}
          className="h-12 w-full rounded-[var(--radius-chip)] border border-border bg-surface px-3
                     text-row outline-none placeholder:text-faint focus:border-accent"
        />

        <Field label="Fach">
          <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {activeSubjects.map((subject) => (
              <Chip
                key={subject.id}
                selected={subjectId === subject.id}
                color={subjectColor(subject)}
                onClick={() => setSubjectId(subjectId === subject.id ? null : subject.id)}
              >
                <ColorDot color={subjectColor(subject)} />
                {subject.name}
              </Chip>
            ))}
            {activeSubjects.length === 0 && (
              <p className="text-body text-muted">Noch keine Fächer angelegt.</p>
            )}
          </div>
        </Field>

        <Field label="Datum">
          <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {dateChips.map((chip) => (
              <Chip
                key={chip.value}
                selected={dueDate === chip.value && !showDatePicker}
                onClick={() => {
                  setDueDate(chip.value)
                  setShowDatePicker(false)
                }}
              >
                {chip.label}
              </Chip>
            ))}
            <Chip
              selected={showDatePicker || !dateChips.some((chip) => chip.value === dueDate)}
              onClick={() => setShowDatePicker(true)}
            >
              <CalendarPlus size={15} strokeWidth={1.75} />
              {dateChips.some((chip) => chip.value === dueDate)
                ? 'Datum…'
                : describeDate(dueDate, today)}
            </Chip>
          </div>
          {(showDatePicker || !dateChips.some((chip) => chip.value === dueDate)) && (
            <input
              type="date"
              value={dueDate}
              onChange={(event) => event.target.value && setDueDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-[var(--radius-chip)] border border-border bg-surface px-3 outline-none focus:border-accent"
            />
          )}
        </Field>

        {/* Alles Weitere ist eingeklappt: 90 % der Einträge brauchen es nicht. */}
        <div className="flex flex-wrap gap-2">
          {!showTime && (
            <Chip onClick={() => { setShowTime(true); setDueTime('08:00') }}>
              <Clock size={15} strokeWidth={1.75} /> Zeit
            </Chip>
          )}
          {!showReminder && (
            <Chip onClick={() => setShowReminder(true)}>
              <Bell size={15} strokeWidth={1.75} /> Erinnerung
            </Chip>
          )}
          {!showNotes && (
            <Chip onClick={() => setShowNotes(true)}>
              <FileText size={15} strokeWidth={1.75} /> Notiz
            </Chip>
          )}
        </div>

        {showTime && (
          <Field label="Uhrzeit" onRemove={() => { setShowTime(false); setDueTime(null) }}>
            <input
              type="time"
              value={dueTime ?? '08:00'}
              onChange={(event) => setDueTime(event.target.value)}
              className="h-11 w-full rounded-[var(--radius-chip)] border border-border bg-surface px-3 outline-none focus:border-accent"
            />
          </Field>
        )}

        {showReminder && (
          <Field label="Erinnerung" onRemove={() => { setShowReminder(false); setReminderMinutes(null) }}>
            <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {reminderOptions.map((option) => (
                <Chip
                  key={option.label}
                  selected={reminderMinutes === option.minutes}
                  onClick={() => setReminderMinutes(option.minutes)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        {showNotes && (
          <Field label="Notiz" onRemove={() => { setShowNotes(false); setNotes('') }}>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional"
              className="w-full resize-none rounded-[var(--radius-chip)] border border-border bg-surface p-3
                         outline-none placeholder:text-faint focus:border-accent"
            />
          </Field>
        )}
      </div>
    </Sheet>
  )
}

function Field({
  label,
  children,
  onRemove,
}: {
  label: string
  children: React.ReactNode
  onRemove?: () => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-meta font-semibold text-muted">{label}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-meta text-muted hover:text-text">
            Entfernen
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

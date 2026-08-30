import { useState } from 'react'
import { useAgenda } from '@/app/useAgenda'
import {
  useArchiveSubject,
  useCreateSubject,
  useDeleteSubject,
  useUpdateSubject,
} from '@/data/queries'
import { SUBJECT_COLORS, type Subject, type SubjectColorKey } from '@/domain/types'
import { Button } from '@/ui/Button'
import { Sheet } from '@/ui/Sheet'
import { useToast } from '@/ui/Toast'
import { cn } from '@/ui/cn'
import { colorVar } from '@/ui/subjectColor'

interface Props {
  open: boolean
  subject: Subject | null
  onClose: () => void
}

export function SubjectSheet({ open, subject, onClose }: Props) {
  const { subjects, entries } = useAgenda()
  const toast = useToast()
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()
  const archiveSubject = useArchiveSubject()
  const deleteSubject = useDeleteSubject()

  /* Wie beim Eintrags-Sheet: die Instanz wird pro Öffnung neu montiert
   * (key in SubjectsPage), deshalb genügt eine einmalige Initialisierung. */
  const [name, setName] = useState(subject?.name ?? '')
  const [colorKey, setColorKey] = useState<SubjectColorKey>(() => {
    if (subject) return subject.colorKey
    const used = new Set(subjects.map((s) => s.colorKey))
    return SUBJECT_COLORS.find((key) => !used.has(key)) ?? 'blue'
  })

  const linkedEntries = subject ? entries.filter((e) => e.subjectId === subject.id).length : 0
  const canSave = name.trim().length > 0

  function save() {
    if (!canSave) return
    if (subject) updateSubject.mutate({ id: subject.id, name, colorKey })
    else createSubject.mutate({ name, colorKey })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={subject ? 'Fach bearbeiten' : 'Neues Fach'}
      footer={
        <Button variant="primary" block onClick={save} disabled={!canSave}>
          Speichern
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Mathematik"
          maxLength={40}
          autoFocus
          className="h-12 w-full rounded-[var(--radius-chip)] border border-border bg-surface px-3
                     text-row outline-none placeholder:text-faint focus:border-accent"
        />

        <div>
          <p className="mb-2 text-meta font-semibold text-muted">Farbe</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((key) => (
              <button
                key={key}
                type="button"
                aria-label={`Farbe ${key}`}
                aria-pressed={colorKey === key}
                onClick={() => setColorKey(key)}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-95',
                )}
              >
                <span
                  className={cn(
                    'block h-7 w-7 rounded-full',
                    colorKey === key && 'ring-2 ring-offset-2 ring-offset-[var(--surface)]',
                  )}
                  style={{ background: colorVar(key), ...(colorKey === key ? { boxShadow: `0 0 0 2px ${colorVar(key)}` } : {}) }}
                />
              </button>
            ))}
          </div>
        </div>

        {subject && (
          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
            {/* Archivieren ist der sichere Default: das Fach verschwindet aus
                der Auswahl, alte Einträge behalten Name und Farbe. */}
            <button
              type="button"
              onClick={() => {
                archiveSubject.mutate({ id: subject.id, archived: subject.archivedAt === null })
                onClose()
              }}
              className="h-11 text-left text-body text-muted hover:text-text"
            >
              {subject.archivedAt ? 'Wieder aktivieren' : 'Archivieren'}
            </button>
            <button
              type="button"
              onClick={() => {
                deleteSubject.mutate(subject.id)
                onClose()
                toast.show(
                  linkedEntries > 0
                    ? `${subject.name} gelöscht – ${linkedEntries} Einträge behalten ihr Datum`
                    : `${subject.name} gelöscht`,
                )
              }}
              className="h-11 text-left text-body text-danger"
            >
              Löschen
              {linkedEntries > 0 && (
                <span className="ml-2 text-meta text-muted">
                  {linkedEntries} {linkedEntries === 1 ? 'Eintrag verliert' : 'Einträge verlieren'} das Fach
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

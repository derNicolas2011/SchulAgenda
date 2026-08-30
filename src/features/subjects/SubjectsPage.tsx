import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useAgenda } from '@/app/useAgenda'
import { useCreateSubject } from '@/data/queries'
import { SUBJECT_COLORS, type Subject } from '@/domain/types'
import { Button } from '@/ui/Button'
import { Chip, ColorDot } from '@/ui/Chip'
import { EmptyState } from '@/ui/EmptyState'
import { useToast } from '@/ui/Toast'
import { subjectColor } from '@/ui/subjectColor'
import { SubjectSheet } from './SubjectSheet'

/** Beim Erststart: antippen statt tippen. Wer fünf Fächer über ein
 *  Formular anlegen muss, bricht ab. */
const SUGGESTIONS = [
  'Mathematik',
  'Deutsch',
  'Englisch',
  'Französisch',
  'Informatik',
  'Biologie',
  'Chemie',
  'Physik',
  'Geschichte',
  'Geografie',
  'Sport',
  'Musik',
  'Bildnerisches Gestalten',
  'Wirtschaft und Recht',
]

export function SubjectsPage() {
  const { subjects, entries } = useAgenda()
  const createSubject = useCreateSubject()
  const toast = useToast()
  const [editing, setEditing] = useState<Subject | null>(null)
  const [creating, setCreating] = useState(false)

  const openCountBySubject = new Map<string, number>()
  for (const entry of entries) {
    if (entry.completedAt !== null || !entry.subjectId) continue
    openCountBySubject.set(entry.subjectId, (openCountBySubject.get(entry.subjectId) ?? 0) + 1)
  }

  const taken = new Set(subjects.map((s) => s.name.toLowerCase()))
  const remaining = SUGGESTIONS.filter((name) => !taken.has(name.toLowerCase()))

  function quickAdd(name: string) {
    const used = new Set(subjects.map((s) => s.colorKey))
    const colorKey = SUBJECT_COLORS.find((key) => !used.has(key)) ?? SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]!
    createSubject.mutate({ name, colorKey })
  }

  return (
    <>
      <header className="flex items-end justify-between pt-6 pb-2 md:pt-10">
        <h1 className="text-display font-semibold tracking-tight">Fächer</h1>
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <Plus size={17} strokeWidth={2} />
          Fach
        </Button>
      </header>

      {subjects.length === 0 ? (
        <EmptyState
          title="Noch keine Fächer"
          hint="Tippe unten auf deine Fächer – die Farben werden automatisch vergeben."
        />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <button
                type="button"
                onClick={() => setEditing(subject)}
                aria-label={`${subject.name} bearbeiten`}
                className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-elevated"
              >
                <ColorDot color={subjectColor(subject)} size={12} />
                <span className="min-w-0 flex-1 truncate text-row">
                  {subject.name}
                  {subject.archivedAt && <span className="ml-2 text-meta text-faint">archiviert</span>}
                </span>
                <span className="shrink-0 tabular text-meta text-muted">
                  {openCountBySubject.get(subject.id) ?? 0} offen
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-meta font-semibold text-muted">
            {subjects.length === 0 ? 'Vorschläge – antippen zum Hinzufügen' : 'Weitere Fächer'}
          </p>
          <div className="flex flex-wrap gap-2">
            {remaining.map((name) => (
              <Chip
                key={name}
                aria-label={`${name} hinzufügen`}
                onClick={() => {
                  quickAdd(name)
                  toast.show(`${name} hinzugefügt`)
                }}
              >
                <Plus size={14} strokeWidth={2} />
                {name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <SubjectSheet
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || editing !== null}
        subject={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </>
  )
}

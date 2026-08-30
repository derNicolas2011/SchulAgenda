import { useEntriesWithSubjects, useProfile } from '@/data/queries'
import type { EntryWithSubject, IsoDate, Profile, Subject } from '@/domain/types'
import { useToday } from './useToday'

export interface Agenda {
  profile: Profile | null
  timezone: string
  today: IsoDate
  entries: EntryWithSubject[]
  subjects: Subject[]
  /** Fächer ohne archivierte – die Auswahl beim Erstellen. */
  activeSubjects: Subject[]
  isLoading: boolean
  error: unknown
}

/** Ein Einstiegspunkt für alle Ansichten. TanStack Query dedupliziert die
 *  darunterliegenden Abfragen, deshalb kostet der Aufruf pro Seite nichts. */
export function useAgenda(): Agenda {
  const profileQuery = useProfile()
  const timezone = profileQuery.data?.timezone ?? 'Europe/Zurich'
  const today = useToday(timezone)
  const { entries, subjects, isLoading, error } = useEntriesWithSubjects(timezone)

  return {
    profile: profileQuery.data ?? null,
    timezone,
    today,
    entries,
    subjects,
    activeSubjects: subjects.filter((subject) => subject.archivedAt === null),
    isLoading: isLoading || profileQuery.isLoading,
    error: error ?? profileQuery.error,
  }
}

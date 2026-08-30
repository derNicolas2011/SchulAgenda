import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '@/app/auth'
import { supabase } from '@/lib/supabase'
import { addDays, todayIso } from '@/domain/date'
import type {
  Entry,
  EntryKind,
  EntryWithSubject,
  IsoDate,
  Profile,
  Subject,
  SubjectColorKey,
  ThemePreference,
} from '@/domain/types'
import { deriveShortName, toEntry, toProfile, toSubject } from './mappers'
import { queryKeys } from './keys'

/* Der Datenbestand eines Schülers ist winzig (Grössenordnung 500 Zeilen pro
 * Jahr). Deshalb wird er einmal vollständig geladen und danach im Speicher
 * gehalten: Wochen- und Monatswechsel, Filter und Sortierung laufen ohne
 * Netzwerk. Genau das lässt die App schnell wirken. */
const WINDOW_PAST_DAYS = 60
const WINDOW_FUTURE_DAYS = 365

/** Innerhalb geschützter Routen liegt immer eine Session vor; der Fallback
 *  hält die Hook-Reihenfolge stabil, während `enabled` das Feuern verhindert. */
function useScopedUser(): { userId: string; ready: boolean } {
  const { userId } = useAuth()
  return { userId: userId ?? 'anonymous', ready: userId !== null }
}

/* ------------------------------------------------------------------ Profil */

export function useProfile() {
  const { userId, ready } = useScopedUser()
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) throw error
      return data ? toProfile(data) : null
    },
    staleTime: 5 * 60_000,
    enabled: ready,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (patch: {
      theme?: ThemePreference
      displayName?: string
      timezone?: string
      defaultReminders?: Partial<Record<EntryKind, number | null>>
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...(patch.theme ? { theme: patch.theme } : {}),
          ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
          ...(patch.timezone ? { timezone: patch.timezone } : {}),
          ...(patch.defaultReminders ? { default_reminders: patch.defaultReminders } : {}),
        })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return toProfile(data)
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: queryKeys.profile(userId) })
      const previous = qc.getQueryData<Profile | null>(queryKeys.profile(userId))
      if (previous) {
        qc.setQueryData<Profile>(queryKeys.profile(userId), {
          ...previous,
          ...(patch.theme ? { theme: patch.theme } : {}),
          ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
          ...(patch.defaultReminders ? { defaultReminders: patch.defaultReminders } : {}),
        })
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.profile(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  })
}

/* ----------------------------------------------------------------- Fächer */

export function useSubjects() {
  const { userId, ready } = useScopedUser()
  return useQuery({
    queryKey: queryKeys.subjects(userId),
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data.map(toSubject)
    },
    staleTime: 5 * 60_000,
    enabled: ready,
  })
}

export interface SubjectDraft {
  name: string
  colorKey: SubjectColorKey
  shortName?: string
}

export function useCreateSubject() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (draft: SubjectDraft): Promise<Subject> => {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: userId,
          name: draft.name.trim(),
          short_name: (draft.shortName || deriveShortName(draft.name)).slice(0, 4),
          color_key: draft.colorKey,
        })
        .select()
        .single()
      if (error) throw error
      return toSubject(data)
    },
    // Optimistisch, damit zwei schnelle Taps in der Vorschlagsliste nicht
    // dieselbe Farbe bekommen: der zweite Klick sieht den ersten bereits.
    onMutate: async (draft) => {
      await qc.cancelQueries({ queryKey: queryKeys.subjects(userId) })
      const previous = qc.getQueryData<Subject[]>(queryKeys.subjects(userId)) ?? []
      const optimistic: Subject = {
        id: `optimistic-${crypto.randomUUID()}`,
        userId,
        name: draft.name.trim(),
        shortName: (draft.shortName || deriveShortName(draft.name)).slice(0, 4),
        colorKey: draft.colorKey,
        sortOrder: previous.length,
        archivedAt: null,
      }
      qc.setQueryData<Subject[]>(queryKeys.subjects(userId), [...previous, optimistic])
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.subjects(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.subjects(userId) }),
  })
}

export function useUpdateSubject() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; colorKey?: SubjectColorKey }) => {
      const { data, error } = await supabase
        .from('subjects')
        .update({
          ...(input.name ? { name: input.name.trim(), short_name: deriveShortName(input.name) } : {}),
          ...(input.colorKey ? { color_key: input.colorKey } : {}),
        })
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw error
      return toSubject(data)
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.subjects(userId) })
      const previous = qc.getQueryData<Subject[]>(queryKeys.subjects(userId)) ?? []
      qc.setQueryData<Subject[]>(
        queryKeys.subjects(userId),
        previous.map((s) =>
          s.id === input.id
            ? { ...s, ...(input.name ? { name: input.name } : {}), ...(input.colorKey ? { colorKey: input.colorKey } : {}) }
            : s,
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.subjects(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.subjects(userId) }),
  })
}

/** Archivieren ist der sichere Default: das Fach verschwindet aus der
 *  Auswahl, bestehende Einträge behalten Name und Farbe. */
export function useArchiveSubject() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('subjects')
        .update({ archived_at: input.archived ? new Date().toISOString() : null })
        .eq('id', input.id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.subjects(userId) }),
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.subjects(userId) })
      void qc.invalidateQueries({ queryKey: queryKeys.entries(userId) })
    },
  })
}

/* --------------------------------------------------------------- Einträge */

export function useEntries(timezone = 'Europe/Zurich') {
  const { userId, ready } = useScopedUser()
  const today = todayIso(timezone)
  return useQuery({
    queryKey: queryKeys.entries(userId),
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .is('deleted_at', null)
        .gte('due_date', addDays(today, -WINDOW_PAST_DAYS))
        .lte('due_date', addDays(today, WINDOW_FUTURE_DAYS))
      if (error) throw error
      return data.map(toEntry)
    },
    staleTime: 60_000,
    enabled: ready,
  })
}

/** Einträge mit aufgelöstem Fach – die Form, in der jede Ansicht arbeitet. */
export function useEntriesWithSubjects(timezone?: string): {
  entries: EntryWithSubject[]
  subjects: Subject[]
  isLoading: boolean
  error: unknown
} {
  const entriesQuery = useEntries(timezone)
  const subjectsQuery = useSubjects()

  const entries = useMemo(() => {
    const byId = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s]))
    return (entriesQuery.data ?? []).map<EntryWithSubject>((entry) => ({
      ...entry,
      subject: entry.subjectId ? (byId.get(entry.subjectId) ?? null) : null,
    }))
  }, [entriesQuery.data, subjectsQuery.data])

  return {
    entries,
    subjects: subjectsQuery.data ?? [],
    isLoading: entriesQuery.isLoading || subjectsQuery.isLoading,
    error: entriesQuery.error ?? subjectsQuery.error,
  }
}

export interface EntryDraft {
  kind: EntryKind
  subjectId: string | null
  title: string
  dueDate: IsoDate
  dueTime: string | null
  reminderMinutes: number | null
  notes: string | null
}

function patchEntries(qc: QueryClient, userId: string, update: (entries: Entry[]) => Entry[]) {
  qc.setQueryData<Entry[]>(queryKeys.entries(userId), (old) => update(old ?? []))
}

export function useCreateEntry() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (draft: EntryDraft): Promise<Entry> => {
      const { data, error } = await supabase
        .from('entries')
        .insert({
          user_id: userId,
          kind: draft.kind,
          subject_id: draft.subjectId,
          title: draft.title.trim(),
          due_date: draft.dueDate,
          due_time: draft.dueTime,
          reminder_minutes: draft.reminderMinutes,
          notes: draft.notes?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      return toEntry(data)
    },
    // Optimistisch: das Sheet schliesst sofort, der Eintrag steht schon da.
    onMutate: async (draft) => {
      await qc.cancelQueries({ queryKey: queryKeys.entries(userId) })
      const previous = qc.getQueryData<Entry[]>(queryKeys.entries(userId)) ?? []
      const now = new Date().toISOString()
      const optimistic: Entry = {
        id: `optimistic-${crypto.randomUUID()}`,
        userId,
        subjectId: draft.subjectId,
        kind: draft.kind,
        title: draft.title.trim(),
        notes: draft.notes,
        dueDate: draft.dueDate,
        dueTime: draft.dueTime,
        reminderMinutes: draft.reminderMinutes,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      patchEntries(qc, userId, (entries) => [...entries, optimistic])
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.entries(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.entries(userId) }),
  })
}

export function useUpdateEntry() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<EntryDraft>) => {
      const { id, ...patch } = input
      const { data, error } = await supabase
        .from('entries')
        .update({
          ...(patch.kind ? { kind: patch.kind } : {}),
          ...(patch.subjectId !== undefined ? { subject_id: patch.subjectId } : {}),
          ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
          ...(patch.dueDate ? { due_date: patch.dueDate } : {}),
          ...(patch.dueTime !== undefined ? { due_time: patch.dueTime } : {}),
          ...(patch.reminderMinutes !== undefined ? { reminder_minutes: patch.reminderMinutes } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return toEntry(data)
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.entries(userId) })
      const previous = qc.getQueryData<Entry[]>(queryKeys.entries(userId)) ?? []
      patchEntries(qc, userId, (entries) =>
        entries.map((e) =>
          e.id === input.id
            ? {
                ...e,
                ...(input.kind ? { kind: input.kind } : {}),
                ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
                ...(input.title !== undefined ? { title: input.title } : {}),
                ...(input.dueDate ? { dueDate: input.dueDate } : {}),
                ...(input.dueTime !== undefined ? { dueTime: input.dueTime } : {}),
                ...(input.reminderMinutes !== undefined ? { reminderMinutes: input.reminderMinutes } : {}),
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
              }
            : e,
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.entries(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.entries(userId) }),
  })
}

/** Abhaken muss sich sofort anfühlen – deshalb rein optimistisch, ohne
 *  Ladezustand und ohne Dialog. */
export function useToggleEntry() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (input: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('entries')
        .update({ completed_at: input.done ? new Date().toISOString() : null })
        .eq('id', input.id)
      if (error) throw error
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.entries(userId) })
      const previous = qc.getQueryData<Entry[]>(queryKeys.entries(userId)) ?? []
      patchEntries(qc, userId, (entries) =>
        entries.map((e) =>
          e.id === input.id ? { ...e, completedAt: input.done ? new Date().toISOString() : null } : e,
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.entries(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.entries(userId) }),
  })
}

/** Soft Delete. Löschen wirkt sofort, ein Toast bietet Undo – das ist
 *  schneller UND sicherer als ein Bestätigungsdialog. */
export function useDeleteEntry() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.entries(userId) })
      const previous = qc.getQueryData<Entry[]>(queryKeys.entries(userId)) ?? []
      patchEntries(qc, userId, (entries) => entries.filter((e) => e.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.entries(userId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.entries(userId) }),
  })
}

export function useRestoreEntry() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entries').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.entries(userId) }),
  })
}

/* ------------------------------------------------------------ Kalender-Abo */

export function useIcsToken() {
  const qc = useQueryClient()
  const { userId } = useScopedUser()
  const rotate = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('rotate_ics_token')
      if (error) throw error
      return data as string
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  })
  const revoke = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('revoke_ics_token')
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  })
  return { rotate, revoke }
}

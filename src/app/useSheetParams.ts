import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

/** Overlays leben im URL-State, damit die Zurück-Taste sie schliesst und
 *  Links teilbar bleiben. */
export function useSheetParams() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const setParam = useCallback(
    (updates: Record<string, string | null>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(location.search)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      navigate({ pathname: location.pathname, search: next.toString() }, { replace: options?.replace })
    },
    [location.pathname, location.search, navigate],
  )

  return {
    isCreating: params.get('new') === '1',
    presetKind: params.get('kind'),
    presetDate: params.get('date'),
    detailId: params.get('entry'),
    editId: params.get('edit'),
    subjectId: params.get('subject'),
    openCreate: (preset?: { kind?: string; date?: string }) =>
      setParam({ new: '1', kind: preset?.kind ?? null, date: preset?.date ?? null }),
    openDetail: (id: string) => setParam({ entry: id }),
    openEdit: (id: string) => setParam({ entry: null, edit: id }),
    openSubject: (id: string) => setParam({ subject: id }),
    closeAll: () => setParam({ new: null, entry: null, edit: null, subject: null, kind: null, date: null }),
    setParam,
  }
}

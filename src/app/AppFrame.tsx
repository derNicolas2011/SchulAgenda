import { useEffect, useRef, type ReactNode } from 'react'
import { openCount as countOpen } from '@/domain/entry'
import type { EntryKind, IsoDate } from '@/domain/types'
import { EntryDetail } from '@/features/entries/EntryDetail'
import { EntrySheet } from '@/features/entries/EntrySheet'
import { Shell } from './Shell'
import { useAgenda } from './useAgenda'
import { useSheetParams } from './useSheetParams'
import { useTheme } from './theme'

/** Trägt Navigation, globale Overlays und Tastenkürzel. Die Sheets liegen
 *  hier statt in den Seiten, damit sie aus jeder Ansicht per URL
 *  erreichbar sind. */
export function AppFrame({ children }: { children: ReactNode }) {
  const { entries, today, profile } = useAgenda()
  const sheets = useSheetParams()

  useTheme(profile?.theme)

  const open = countOpen(entries, today)

  // Offene Punkte im Tab-Titel: das einzige Signal, das ohne
  // Benachrichtigungsberechtigung funktioniert.
  useEffect(() => {
    document.title = open > 0 ? `(${open}) Agenda` : 'Agenda'
  }, [open])

  /* "n" öffnet den neuen Eintrag – aber nie während des Tippens.
   * Der Handler liegt in einer Ref, damit der Listener einmal registriert
   * wird und nicht bei jedem Render (sheets ist jedes Mal neu). */
  const handleKey = useRef<(event: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    handleKey.current = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (event.key === 'n') {
        event.preventDefault()
        sheets.openCreate()
      }
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const detailEntry = sheets.detailId ? (entries.find((e) => e.id === sheets.detailId) ?? null) : null
  const editEntry = sheets.editId ? (entries.find((e) => e.id === sheets.editId) ?? null) : null

  return (
    <>
      <Shell openCount={open}>{children}</Shell>

      {/* Der key erzwingt pro Öffnung eine neue Instanz. Damit initialisiert
          sich das Formular strukturell korrekt, ohne Reset-Effekt. */}
      <EntrySheet
        key={sheets.editId ?? (sheets.isCreating ? `new:${sheets.presetKind ?? ''}:${sheets.presetDate ?? ''}` : 'closed')}
        open={sheets.isCreating || Boolean(editEntry)}
        entry={editEntry}
        presetKind={(sheets.presetKind as EntryKind | null) ?? undefined}
        presetDate={(sheets.presetDate as IsoDate | null) ?? undefined}
        onClose={sheets.closeAll}
      />

      <EntryDetail entry={detailEntry} onClose={sheets.closeAll} onEdit={sheets.openEdit} />
    </>
  )
}

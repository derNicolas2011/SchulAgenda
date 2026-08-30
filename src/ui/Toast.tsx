import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastState {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastApi {
  /** Kurze Rückmeldung, optional mit Rückgängig-Aktion. Ersetzt
   *  Bestätigungsdialoge: schneller und trotzdem sicher. */
  show: (message: string, action?: { label: string; onAction: () => void }) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATION = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counter = useRef(0)

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback<ToastApi['show']>((message, action) => {
    if (timer.current) clearTimeout(timer.current)
    counter.current += 1
    setToast({ id: counter.current, message, actionLabel: action?.label, onAction: action?.onAction })
    timer.current = setTimeout(() => setToast(null), DURATION)
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4
                   pb-[calc(env(safe-area-inset-bottom)+8.5rem)] md:pb-6"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-card)]
                       border border-border bg-surface px-4 py-3 shadow-lg
                       animate-[sheet-up_var(--dur-sheet)_var(--ease-sheet)]"
          >
            <span className="min-w-0 flex-1 truncate text-body">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  dismiss()
                }}
                className="shrink-0 text-body font-semibold text-accent"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast benötigt einen ToastProvider')
  return ctx
}

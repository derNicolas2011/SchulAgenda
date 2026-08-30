import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Sichtbaren Titel unterdrücken, aber für Screenreader behalten. */
  hideTitle?: boolean
  footer?: ReactNode
  children: ReactNode
}

/** Eine Komponente, zwei Layouts: auf dem iPhone ein Bottom-Sheet mit
 *  Griff, auf dem Desktop ein zentrierter Dialog. Radix liefert
 *  Fokus-Trap, Escape und ARIA – genau das, was man selbst falsch baut. */
export function Sheet({ open, onOpenChange, title, hideTitle, footer, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]',
            'data-[state=open]:animate-[fade_120ms_ease-out]',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col bg-surface text-text',
            // Mobile: unten angedockt
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-sheet)]',
            'data-[state=open]:animate-[sheet-up_var(--dur-sheet)_var(--ease-sheet)]',
            // Desktop: zentrierter Dialog
            'md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:w-[480px]',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[var(--radius-sheet)]',
            'md:border md:border-border md:shadow-2xl',
            'md:data-[state=open]:animate-[fade_var(--dur-state)_ease-out]',
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong md:hidden" />

          <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
            {hideTitle ? (
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
            ) : (
              <Dialog.Title className="text-section font-semibold">{title}</Dialog.Title>
            )}
            <Dialog.Close
              aria-label="Schliessen"
              className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-elevated hover:text-text"
            >
              <X size={20} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>

          {footer ? (
            <div className="shrink-0 border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : (
            <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

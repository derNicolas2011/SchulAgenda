import { CalendarDays, Home, Plus, Settings, Tag } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/ui/cn'

const NAV = [
  { to: '/today', label: 'Heute', Icon: Home },
  { to: '/calendar', label: 'Kalender', Icon: CalendarDays },
  { to: '/subjects', label: 'Fächer', Icon: Tag },
  { to: '/settings', label: 'Einstellungen', Icon: Settings },
] as const

interface Props {
  children: ReactNode
  /** Zahl offener Punkte – als Badge auf "Heute". */
  openCount?: number
}

export function Shell({ children, openCount = 0 }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  const openNewEntry = () => {
    const params = new URLSearchParams(location.search)
    params.set('new', '1')
    navigate({ pathname: location.pathname, search: params.toString() })
  }

  return (
    <div className="min-h-dvh bg-bg md:flex">
      {/* Desktop: Seitenleiste */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
        <div className="px-3 pb-5 text-row font-semibold tracking-tight">Agenda</div>

        <button
          type="button"
          onClick={openNewEntry}
          className="mb-4 flex h-10 items-center gap-2 rounded-[var(--radius-chip)] bg-accent px-3
                     text-body font-semibold text-accent-contrast transition-opacity hover:opacity-90"
        >
          <Plus size={18} strokeWidth={2} />
          Neuer Eintrag
          <kbd className="ml-auto rounded bg-black/15 px-1.5 py-0.5 text-[11px] font-medium">N</kbd>
        </button>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-[var(--radius-chip)] px-3 text-body transition-colors',
                  isActive ? 'bg-elevated font-semibold text-text' : 'text-muted hover:bg-elevated hover:text-text',
                )
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              {label}
              {to === '/today' && openCount > 0 && (
                <span className="ml-auto tabular text-meta text-muted">{openCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[880px] px-4 pb-28 md:px-8 md:pb-12">{children}</main>
      </div>

      {/* Mobile: Aktionsbutton über der Tab-Leiste */}
      <button
        type="button"
        onClick={openNewEntry}
        aria-label="Neuer Eintrag"
        className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent
                   text-accent-contrast shadow-lg transition-transform active:scale-95 md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}
      >
        <Plus size={26} strokeWidth={2.25} />
      </button>

      {/* Mobile: Tab-Leiste */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            <span className="relative">
              <Icon size={22} strokeWidth={1.75} />
              {to === '/today' && openCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full
                             bg-accent px-1 text-[10px] font-bold text-accent-contrast"
                >
                  {openCount > 9 ? '9+' : openCount}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

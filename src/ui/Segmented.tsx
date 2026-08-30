import { cn } from './cn'

interface Props<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/** Segmented Control statt Dropdown: alle Optionen sichtbar, ein Tap. */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel, className }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex gap-1 rounded-[var(--radius-chip)] bg-sunken p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-9 flex-1 rounded-[8px] px-2 text-body transition-colors',
              active ? 'bg-surface text-text font-semibold shadow-sm' : 'text-muted hover:text-text',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

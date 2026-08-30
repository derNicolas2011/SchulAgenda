import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'plain' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Volle Breite – im Sheet der Normalfall. */
  block?: boolean
  children: ReactNode
}

/* Genau vier Varianten. Mehr Buttontypen bedeuten in der Praxis, dass die
 * Hierarchie einer Seite nicht geklärt ist. */
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast hover:opacity-90 active:opacity-80 font-semibold',
  secondary: 'border border-border bg-surface text-text hover:bg-elevated',
  plain: 'text-muted hover:text-text hover:bg-elevated',
  danger: 'text-danger hover:bg-danger-soft',
}

export function Button({ variant = 'secondary', block, className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-chip)] px-4',
        'h-11 text-body transition-colors md:h-9',
        'disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  )
}

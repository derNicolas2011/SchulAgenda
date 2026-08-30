import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { cn } from './cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** Fachfarbe als CSS-Ausdruck, z. B. `var(--subject-blue)`.
   *  Ohne Angabe wird die Akzentfarbe verwendet. */
  color?: string
}

/** Chips ersetzen Dropdowns und Datumspicker: ein Tap statt Aufklappen,
 *  Scrollen, Auswählen, Bestätigen. */
export function Chip({ selected, color, className, style, ...rest }: Props) {
  const tint = color ?? 'var(--accent)'
  const selectedStyle: CSSProperties = selected
    ? {
        color: tint,
        borderColor: tint,
        backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)`,
      }
    : {}

  return (
    <button
      type="button"
      aria-pressed={selected}
      style={{ ...selectedStyle, ...style }}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-chip)] border px-3',
        'text-body whitespace-nowrap transition-colors',
        selected ? 'font-medium' : 'border-border text-muted hover:bg-elevated',
        className,
      )}
      {...rest}
    />
  )
}

/** Kleiner Farbpunkt für Fächer – die einzige Stelle, an der Farbe
 *  Information trägt. */
export function ColorDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ background: color, width: size, height: size }}
    />
  )
}

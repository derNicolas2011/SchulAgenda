import { Check } from 'lucide-react'
import { cn } from './cn'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  color?: string
  className?: string
}

/** 44×44 Trefferfläche, 22×22 sichtbares Kästchen. Die Fläche ist bewusst
 *  grösser als die Grafik – auf dem iPhone entscheidet das über
 *  "funktioniert" und "nervt". */
export function Checkbox({ checked, onChange, label, color, className }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
      className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', className)}
    >
      <span
        className={cn(
          'grid h-[22px] w-[22px] place-items-center rounded-full border-2 transition-colors',
          checked ? 'border-transparent' : 'border-border-strong',
        )}
        style={checked ? { background: color ?? 'var(--success)' } : undefined}
      >
        {checked && <Check size={14} strokeWidth={3} className="text-white" />}
      </span>
    </button>
  )
}

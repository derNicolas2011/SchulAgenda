import type { ReactNode } from 'react'

interface Props {
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-row font-medium">{title}</p>
      {hint && <p className="max-w-xs text-body text-muted">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

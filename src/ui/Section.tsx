import type { ReactNode } from 'react'
import { cn } from './cn'

interface Props {
  title: string
  tone?: 'default' | 'danger'
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, tone = 'default', action, children }: Props) {
  return (
    <section className="mt-6 first:mt-4">
      <div className="mb-1 flex items-center justify-between">
        <h2
          className={cn(
            'text-body font-semibold tracking-[0.01em]',
            tone === 'danger' ? 'text-danger' : 'text-muted',
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

import type { Subject, SubjectColorKey } from '@/domain/types'

/** Fachfarben werden als Token-Namen gespeichert, nicht als Hex – so kann
 *  Hell/Dunkel unterschiedliche Werte verwenden, ohne die Fachidentität
 *  zu verlieren. */
export function subjectColor(subject: Subject | null | undefined): string {
  return subject ? `var(--subject-${subject.colorKey})` : 'var(--text-faint)'
}

export function colorVar(key: SubjectColorKey): string {
  return `var(--subject-${key})`
}

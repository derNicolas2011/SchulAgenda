import { useEffect, useState } from 'react'
import { todayIso } from '@/domain/date'
import type { IsoDate } from '@/domain/types'

/** "Heute" muss sich ändern, ohne dass die App neu geladen wird – sonst
 *  zeigt eine über Nacht offene App den falschen Tag. Neben dem Timer
 *  wird bei Tab-Fokus geprüft, weil Timer im Hintergrund gedrosselt werden. */
export function useToday(timezone = 'Europe/Zurich'): IsoDate {
  const [today, setToday] = useState<IsoDate>(() => todayIso(timezone))

  useEffect(() => {
    const check = () => {
      const current = todayIso(timezone)
      setToday((previous) => (previous === current ? previous : current))
    }
    check()
    const interval = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [timezone])

  return today
}

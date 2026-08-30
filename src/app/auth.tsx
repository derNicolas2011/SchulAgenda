import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  userId: string | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, userId: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return

      /* Lokal ohne Session: still am Entwickler-Konto anmelden, statt den
       * Anmeldebildschirm zu zeigen.
       *
       * Der Import steht bewusst INNERHALB der Bedingung. Ein Guard erst in
       * der Funktion genügt nicht: der Aufruf bliebe referenziert und die
       * Zugangsdaten landeten als Zeichenketten im Produktionsbundle.
       * So fällt das ganze Modul beim Bauen heraus. */
      if (!data.session && import.meta.env.DEV) {
        const { devAutoSignIn } = await import('./devAuth')
        const signedIn = await devAutoSignIn()
        if (!active) return
        if (signedIn) return // setLoading übernimmt onAuthStateChange
      }

      setSession(data.session)
      setLoading(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({ session, userId: session?.user.id ?? null, loading }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

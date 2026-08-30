import { supabase } from '@/lib/supabase'

/* Entwicklungs-Anmeldung.
 *
 * Das Anmelden wird NICHT entfernt – die gesamte Datentrennung hängt an
 * `auth.uid()`, ohne Session greift keine einzige RLS-Policy. Stattdessen
 * meldet sich die App lokal automatisch an einem festen Konto an, das nur
 * in der lokalen Datenbank existiert (siehe supabase/seed.sql).
 *
 * Drei Sperren verhindern, dass das jemals in Produktion aktiv wird:
 *   1. `import.meta.env.DEV` – im Produktionsbundle wird der Block entfernt.
 *   2. Die Supabase-URL muss auf localhost zeigen.
 *   3. `VITE_DEV_AUTOLOGIN=false` schaltet es ab, um den echten
 *      Magic-Link-Weg zu testen.
 */

const DEV_EMAIL = 'dev@agenda.test'
const DEV_PASSWORD = 'agenda-dev'

const LOCAL_URL = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/

export function isDevAutoLoginEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_DEV_AUTOLOGIN === 'false') return false

  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  try {
    return LOCAL_URL.test(new URL(url).origin)
  } catch {
    return false
  }
}

/** Meldet am lokalen Entwickler-Konto an. Gibt zurück, ob es geklappt hat. */
export async function devAutoSignIn(): Promise<boolean> {
  if (!isDevAutoLoginEnabled()) return false

  const { error } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  })

  if (error) {
    // Häufigster Fall: die Datenbank wurde ohne Seed aufgesetzt.
    console.warn(
      `[dev] Automatische Anmeldung fehlgeschlagen: ${error.message}\n` +
        'Fehlt das Konto? `npm run db:reset` legt es samt Testdaten an.',
    )
    return false
  }

  console.info('[dev] Automatisch als dev@agenda.test angemeldet.')
  return true
}

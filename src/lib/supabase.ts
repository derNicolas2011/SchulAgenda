import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Der Anon-Key ist öffentlich und unkritisch – die Autorität liegt
 *  ausschliesslich bei den RLS-Policies in der Datenbank. */
export const supabase = createClient<Database>(url ?? 'http://localhost:54321', anonKey ?? 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

// Nur in der Entwicklung: erlaubt E2E-Tests, eine Session zu setzen, ohne
// den Magic-Link-Versand nachzustellen. Im Produktionsbundle nicht enthalten.
if (import.meta.env.DEV) {
  ;(window as unknown as { __supabase?: typeof supabase }).__supabase = supabase
}

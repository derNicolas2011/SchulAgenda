import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://uyqobcyzajztfprwpoim.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cW9iY3l6YWp6dGZwcndwb2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODczMjcsImV4cCI6MjEwMzY2MzMyN30._f003q7xngNMokphHfJbrhNkCuUdzJHHkMcKQzUtURA'

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

if (import.meta.env.DEV) {
  ;(window as unknown as { __supabase?: typeof supabase }).__supabase = supabase
}

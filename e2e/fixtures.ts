import { createClient } from '@supabase/supabase-js'
import { test as base, type Page } from '@playwright/test'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:55321'
const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const TEST_EMAIL = 'e2e@agenda.test'
const TEST_PASSWORD = 'agenda-e2e-passwort'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureTestUser(): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((user) => user.email === TEST_EMAIL)
  if (existing) return existing.id

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  return data.user!.id
}

/** Jeder Test startet mit leerem Bestand – sonst hängen die Erwartungen
 *  von der Reihenfolge ab. */
async function resetData(userId: string) {
  await admin.from('entries').delete().eq('user_id', userId)
  await admin.from('subjects').delete().eq('user_id', userId)
}

async function signIn(page: Page) {
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error) throw error

  // Erst die App laden, dann die Session setzen: der Client existiert nur
  // im Seitenkontext.
  await page.goto('/')
  await page.evaluate(
    async ([accessToken, refreshToken]) => {
      const client = (window as unknown as { __supabase: import('@supabase/supabase-js').SupabaseClient })
        .__supabase
      await client.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! })
    },
    [data.session!.access_token, data.session!.refresh_token],
  )
}

export const test = base.extend<{ userId: string }>({
  userId: async ({ page }, use) => {
    const userId = await ensureTestUser()
    await resetData(userId)
    await signIn(page)
    await use(userId)
  },
})

export { expect } from '@playwright/test'
export { admin, TEST_EMAIL }

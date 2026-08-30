import { useAgenda } from '@/app/useAgenda'
import { useAuth } from '@/app/auth'
import { applyTheme, storeTheme } from '@/app/theme'
import { useUpdateProfile } from '@/data/queries'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_REMINDERS,
  KIND_META,
  KIND_ORDER,
  REMINDER_OPTIONS,
  type EntryKind,
  type ThemePreference,
} from '@/domain/types'
import { Chip } from '@/ui/Chip'
import { Button } from '@/ui/Button'
import { Segmented } from '@/ui/Segmented'

export function SettingsPage() {
  const { profile } = useAgenda()
  const { session } = useAuth()
  const updateProfile = useUpdateProfile()

  const theme: ThemePreference = profile?.theme ?? 'system'

  function changeTheme(next: ThemePreference) {
    // Sofort anwenden, damit sich der Wechsel nicht nach Netzwerk anfühlt.
    applyTheme(next)
    storeTheme(next)
    updateProfile.mutate({ theme: next })
  }

  function setDefaultReminder(kind: EntryKind, minutes: number | null) {
    const next = { ...DEFAULT_REMINDERS, ...profile?.defaultReminders, [kind]: minutes }
    updateProfile.mutate({ defaultReminders: next })
  }

  return (
    <>
      <header className="pt-6 pb-2 md:pt-10">
        <h1 className="text-display font-semibold tracking-tight">Einstellungen</h1>
      </header>

      <Group title="Darstellung">
        <Segmented
          ariaLabel="Farbschema"
          value={theme}
          onChange={changeTheme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
        />
      </Group>

      <Group
        title="Standard-Erinnerung"
        hint="Wird beim Erstellen automatisch gesetzt – so muss die Erinnerung im Normalfall gar nicht angefasst werden."
      >
        <div className="flex flex-col gap-4">
          {KIND_ORDER.map((kind) => {
            const current = profile?.defaultReminders?.[kind] ?? DEFAULT_REMINDERS[kind]
            return (
              <div key={kind}>
                <p className="mb-1.5 text-meta font-medium text-muted">{KIND_META[kind].label}</p>
                <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                  {REMINDER_OPTIONS[kind].map((option) => (
                    <Chip
                      key={option.label}
                      selected={current === option.minutes}
                      onClick={() => setDefaultReminder(kind, option.minutes)}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Group>

      <Group title="Konto">
        <p className="text-body text-muted">{session?.user.email}</p>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => {
            void supabase.auth.signOut()
          }}
        >
          Abmelden
        </Button>
      </Group>

      <p className="mt-10 pb-6 text-meta text-faint">Agenda · Version 1.0</p>
    </>
  )
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 border-t border-border pt-5 first:mt-4 first:border-0 first:pt-0">
      <h2 className="mb-1 text-body font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-meta text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  )
}

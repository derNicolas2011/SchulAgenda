import { Check, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAgenda } from '@/app/useAgenda'
import { useAuth } from '@/app/auth'
import { applyTheme, storeTheme } from '@/app/theme'
import { useIcsToken, useUpdateProfile } from '@/data/queries'
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
import { useToast } from '@/ui/Toast'
import { icsFeedUrl } from '@/features/settings/icsUrl'

export function SettingsPage() {
  const { profile } = useAgenda()
  const { session } = useAuth()
  const updateProfile = useUpdateProfile()
  const { rotate, revoke } = useIcsToken()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const theme: ThemePreference = profile?.theme ?? 'system'
  const feedUrl = profile?.icsToken ? icsFeedUrl(profile.icsToken) : null

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

  async function copyFeed() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.show('Kopieren nicht möglich – Adresse manuell markieren')
    }
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
        title="Kalender-Abo"
        hint="Deine Einträge erscheinen im iPhone-Kalender – inklusive Erinnerungen. Wer die Adresse hat, sieht deine Einträge; du kannst sie jederzeit ersetzen."
      >
        {feedUrl ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-chip)] border border-border bg-sunken px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-meta text-muted">{feedUrl}</code>
              <button
                type="button"
                onClick={copyFeed}
                aria-label="Adresse kopieren"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-elevated hover:text-text"
              >
                {copied ? <Check size={17} strokeWidth={2} className="text-success" /> : <Copy size={17} strokeWidth={1.75} />}
              </button>
            </div>
            <p className="text-meta text-muted">
              iPhone: Einstellungen → Apps → Kalender → Accounts → Account hinzufügen → Andere →
              Kalenderabo hinzufügen. Der Kalender aktualisiert sich etwa stündlich – „Heute" in der
              App bleibt die verbindliche Quelle.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  rotate.mutate(undefined, { onSuccess: () => toast.show('Neue Adresse erzeugt') })
                }}
              >
                <RefreshCw size={16} strokeWidth={1.75} />
                Adresse ersetzen
              </Button>
              <Button
                variant="plain"
                onClick={() => revoke.mutate(undefined, { onSuccess: () => toast.show('Abo deaktiviert') })}
              >
                Deaktivieren
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={() => rotate.mutate(undefined, { onSuccess: () => toast.show('Kalender-Abo aktiviert') })}
          >
            Kalender-Abo aktivieren
          </Button>
        )}
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

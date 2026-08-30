import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'

/** Magic Link statt Passwort: kein Reset-Flow, kein vergessenes Passwort,
 *  kein Passwort-Manager-Zwang. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: FormEvent | { preventDefault: () => void }) {
    event.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/today` },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    setStatus('sent')
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-title font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 mb-8 text-body text-muted">Tests, Hausaufgaben und Abgaben auf einen Blick.</p>

        {status === 'sent' ? (
          <div className="rounded-[var(--radius-card)] border border-border bg-elevated p-4">
            <p className="text-row font-medium">Link unterwegs</p>
            <p className="mt-1 text-body text-muted">
              Wir haben dir einen Anmeldelink an <span className="text-text">{email}</span> geschickt.
              Öffne ihn auf diesem Gerät.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 text-body font-medium text-accent"
            >
              Andere Adresse verwenden
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-body font-medium">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void onSubmit(event)
                }
              }}
              placeholder="du@beispiel.ch"
              className="h-12 rounded-[var(--radius-chip)] border border-border bg-surface px-3
                         outline-none placeholder:text-faint focus:border-accent"
            />
            <Button type="submit" variant="primary" block disabled={status === 'sending'} className="h-12 md:h-12">
              {status === 'sending' ? 'Wird gesendet…' : 'Anmeldelink senden'}
            </Button>
            
            {/* DEMO-BUTTON HINZUGEFÜGT FÜR VERCEL TEST */}
            <Button 
              type="button" 
              variant="secondary" 
              block 
              disabled={status === 'sending'} 
              className="h-12 md:h-12 border-accent text-accent"
              onClick={async () => {
                setStatus('sending');
                const { error } = await supabase.auth.signInWithPassword({
                  email: 'test@agenda.ch',
                  password: 'agenda-test'
                });
                if (error) {
                  setStatus('error');
                  setMessage(error.message);
                }
              }}
            >
              Demo-Login verwenden
            </Button>

            {status === 'error' && <p className="text-body text-danger">{message}</p>}
            <p className="text-meta text-muted">
              Kein Passwort nötig. Der Link meldet dich direkt an und bleibt danach angemeldet.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

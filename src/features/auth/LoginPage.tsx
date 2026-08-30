import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/ui/Button'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        // Versuche stattdessen ein neues Konto anzulegen
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password
        })
        if (signUpError) {
          setStatus('error')
          setMessage(signUpError.message)
          return
        }
        // Signup erfolgreich!
        return
      }
      
      setStatus('error')
      setMessage(error.message)
      return
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-title font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 mb-8 text-body text-muted">Tests, Hausaufgaben und Abgaben auf einen Blick.</p>

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
            placeholder="du@beispiel.ch"
            className="h-12 rounded-[var(--radius-chip)] border border-border bg-surface px-3
                       outline-none placeholder:text-faint focus:border-accent"
          />

          <label htmlFor="password" className="text-body font-medium mt-2">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-[var(--radius-chip)] border border-border bg-surface px-3
                       outline-none placeholder:text-faint focus:border-accent"
          />

          <Button type="submit" variant="primary" block disabled={status === 'sending'} className="h-12 md:h-12 mt-2">
            {status === 'sending' ? 'Anmelden…' : 'Anmelden'}
          </Button>

          {status === 'error' && <p className="text-body text-danger">{message}</p>}
        </form>
      </div>
    </div>
  )
}

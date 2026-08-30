import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { LoginPage } from '@/features/auth/LoginPage'
import { TodayPage } from '@/features/today/TodayPage'

/* "Heute" ist der Einstieg und bleibt im Hauptbündel. Die übrigen Seiten
 * werden erst beim ersten Besuch geladen. */
const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const SubjectsPage = lazy(() =>
  import('@/features/subjects/SubjectsPage').then((m) => ({ default: m.SubjectsPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
import { ToastProvider } from '@/ui/Toast'
import { AuthProvider, useAuth } from './auth'
import { AppFrame } from './AppFrame'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime verhindert Refetches bei jedem Re-Render. Beim Mounten
      // wird trotzdem immer revalidiert: der persistierte Cache liefert das
      // sofortige Bild, darf aber nie das letzte Wort haben – sonst zeigt
      // ein Reload direkt nach dem Speichern noch den alten Stand.
      staleTime: 60_000,
      refetchOnMount: 'always',
      gcTime: 7 * 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

/* Persistierter Cache: die App startet offline mit vollständigen Daten.
 * localStorage genügt, weil der Bestand weit unter 1 MB bleibt. */
const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'agenda.cache',
})

function Gate() {
  const { session, loading } = useAuth()

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Beim Abmelden muss der persistierte Cache weg: er enthält die
      // Einträge des vorherigen Kontos.
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        void persister.removeClient()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="grid min-h-dvh place-items-center text-body text-muted">Einen Moment…</div>
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppFrame>
      <Suspense fallback={<div className="h-40" />}>
        <Routes>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </Suspense>
    </AppFrame>
  )
}

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <p className="text-row font-medium">Supabase ist nicht konfiguriert</p>
          <p className="mt-2 text-body text-muted">
            Kopiere <code className="text-text">.env.example</code> nach{' '}
            <code className="text-text">.env.local</code> und trage URL und Anon-Key ein.
          </p>
        </div>
      </div>
    )
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Gate />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}

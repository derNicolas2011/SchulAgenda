/** Der Feed wird von einer Edge Function ausgeliefert. `webcal://` sorgt
 *  dafür, dass iOS direkt den Abo-Dialog öffnet statt die Datei anzuzeigen. */
export function icsFeedUrl(token: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL ?? ''
  const url = `${base}/functions/v1/ics/${token}`
  return url.replace(/^https?:\/\//, 'webcal://')
}

/** Für Kopieren-und-im-Browser-Prüfen. */
export function icsHttpUrl(token: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/ics/${token}`
}

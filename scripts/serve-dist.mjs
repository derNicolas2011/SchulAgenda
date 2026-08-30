/* Liefert dist/ mit denselben Kopfzeilen aus, die vercel.json setzt.
 * Zweck: die Content-Security-Policy gegen den echten Build prüfen, bevor
 * deployt wird – eine zu strenge Regel zerlegt die App sonst erst in
 * Produktion, und zwar lautlos in der Konsole des Nutzers.
 *
 * Aufruf: node scripts/serve-dist.mjs [port]
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const port = Number(process.argv[2] ?? 4173)
const root = new URL('../dist/', import.meta.url).pathname

// Für den lokalen Test muss die lokale Supabase-Instanz erreichbar sein.
// In Produktion steht an dieser Stelle nur https://*.supabase.co.
const localApi = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:55321'

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${localApi}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let path = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')

  let body
  try {
    body = await readFile(join(root, path))
  } catch {
    // SPA-Fallback – genau das, was die rewrite-Regel in vercel.json tut.
    path = '/index.html'
    body = await readFile(join(root, path))
  }

  response.writeHead(200, {
    'Content-Type': types[extname(path)] ?? 'application/octet-stream',
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  })
  response.end(body)
}).listen(port, () => {
  console.log(`dist/ mit Produktions-Kopfzeilen auf http://localhost:${port}`)
})

import { defineConfig, devices } from '@playwright/test'

/* Drei kritische Flows, zwei Viewports. Bewusst keine breite UI-Abdeckung:
 * die Regeln, an denen es wirklich hängt, sind als Unit-Tests in
 * src/domain/ abgesichert. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  /* Eigener Server auf 5174, damit die Tests unabhängig vom laufenden
   * Dev-Server sind – und vor allem ohne die automatische Anmeldung:
   * sonst laufen sie gegen das Entwickler-Konto samt Seed-Daten statt
   * gegen ihr eigenes, leeres Testkonto. */
  webServer: {
    command: 'VITE_DEV_AUTOLOGIN=false npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})

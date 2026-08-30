import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

/** Speichern und warten, bis der Schreibvorgang wirklich angekommen ist.
 *  Die UI schliesst das Sheet optimistisch sofort; ein Seitenwechsel im
 *  selben Moment würde den laufenden Request abbrechen. */
async function save(page: Page, label: string) {
  const written = page.waitForResponse(
    (response) => response.url().includes('/rest/v1/entries') && response.request().method() === 'POST',
  )
  await page.getByRole('dialog').getByRole('button', { name: label }).click()
  const response = await written
  if (!response.ok()) {
    throw new Error(`Eintrag speichern fehlgeschlagen (${response.status()}): ${await response.text()}`)
  }
}

/* Flow 1: von null auf einen sichtbaren Test – der Weg, den jeder neue
 * Nutzer zuerst geht. */
test('Fächer anlegen, Test eintragen, überall sichtbar', async ({ page, userId }) => {
  expect(userId).toBeTruthy()

  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible()
  await expect(page.getByText('Leg zuerst deine Fächer an')).toBeVisible()

  await page.getByRole('link', { name: 'Fächer einrichten' }).click()
  await page.getByRole('button', { name: 'Mathematik hinzufügen' }).click()
  // Der Vorschlag verschwindet, das Fach steht in der Liste.
  await expect(page.getByRole('button', { name: 'Mathematik hinzufügen' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Mathematik bearbeiten' })).toBeVisible()

  // Eintrag erstellen: ein Sheet, kein Wizard.
  await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click()
  await expect(page.getByRole('radio', { name: 'Test' })).toBeVisible()

  const sheet = page.getByRole('dialog')
  await sheet.getByRole('radio', { name: 'Test' }).click()
  await sheet.getByPlaceholder('z. B. Kapitel 1–4').fill('Kapitel 1–4')
  await sheet.getByRole('button', { name: 'Mathematik' }).click()
  await sheet.getByRole('button', { name: 'Morgen', exact: true }).click()
  await save(page, 'Eintragen')

  // Der Eintrag ist gespeichert: das Fach zählt ihn als offen.
  await expect(page.getByRole('button', { name: 'Mathematik bearbeiten' })).toContainText('1 offen')

  // Auf "Heute" erscheint er unter "Als Nächstes" – nicht unter "Heute",
  // weil er erst morgen fällig ist.
  await page.goto('/today')
  await expect(page.getByText('Als Nächstes')).toBeVisible()
  await expect(page.getByText('Kapitel 1–4')).toBeVisible()
  await expect(page.getByText('Heute nichts zu tun.')).toBeVisible()

  /* Und im Kalender. Gezielt die Woche des Eintrags ansteuern: an einem
   * Sonntag liegt "morgen" bereits in der nächsten Woche, sonst hinge der
   * Test vom Wochentag des Testlaufs ab.
   * Woche- und Mobil-Layout stehen beide im DOM – auf sichtbar filtern. */
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)

  await page.goto(`/calendar?view=week&date=${tomorrowIso}`)
  await expect(page.getByText('Kapitel 1–4').filter({ visible: true })).toHaveCount(1)
})

/* Flow 2: Abhaken und Rückgängig – die häufigste Interaktion überhaupt. */
test('Hausaufgabe abhaken verschiebt sie nach unten, Wiederöffnen kehrt es um', async ({ page, userId }) => {
  expect(userId).toBeTruthy()

  await page.goto('/subjects')
  await page.getByRole('button', { name: 'Deutsch hinzufügen' }).click()

  await page.getByRole('button', { name: 'Neuer Eintrag' }).first().click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('radio', { name: 'HA' }).click()
  await sheet.getByPlaceholder('z. B. Aufgaben 4–8').fill('Aufgaben 4–8')
  await sheet.getByRole('button', { name: 'Deutsch' }).click()
  await sheet.getByRole('button', { name: 'Heute', exact: true }).click()
  await save(page, 'Eintragen')

  await page.goto('/today')
  await expect(page.getByText('Aufgaben 4–8')).toBeVisible()
  await expect(page.getByText('1 Hausaufgabe')).toBeVisible()

  // Abhaken: verschwindet aus der offenen Liste, landet unter "erledigt".
  await page.getByRole('checkbox', { name: /Aufgaben 4–8/ }).click()
  await expect(page.getByText('1 heute erledigt')).toBeVisible()
  await expect(page.getByText('Alles erledigt.')).toBeVisible()

  // Wieder öffnen kehrt den Zustand um.
  await page.getByRole('button', { name: '1 heute erledigt ▾' }).click()
  await page.getByRole('checkbox', { name: /Aufgaben 4–8/ }).click()
  await expect(page.getByText('1 Hausaufgabe')).toBeVisible()
})

/* Flow 3: Kalender-Navigation inklusive des "Heute"-Buttons, der nur
 * erscheint, wenn man nicht ohnehin dort ist. */
test('Kalender wechselt Woche/Monat und findet zurück zu heute', async ({ page, userId }) => {
  expect(userId).toBeTruthy()

  await page.goto('/calendar?view=week')
  await expect(page.getByRole('radio', { name: 'Woche' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Heute' })).toBeHidden()

  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await page.getByRole('button', { name: 'Nächste Woche' }).click()
  await expect(page.getByRole('button', { name: 'Heute' })).toBeVisible()

  await page.getByRole('radio', { name: 'Monat' }).click()
  await expect(page).toHaveURL(/view=month/)

  await page.getByRole('button', { name: 'Heute' }).click()
  await expect(page.getByRole('button', { name: 'Heute' })).toBeHidden()
})

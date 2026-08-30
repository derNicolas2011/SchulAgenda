/* Query-Keys sind nutzergebunden. Das behebt zwei Dinge auf einmal:
 * der persistierte Cache eines Nutzers kann nach einem Kontowechsel nicht
 * mehr durchschlagen, und Abfragen starten erst, wenn eine Session steht. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  subjects: (userId: string) => ['subjects', userId] as const,
  entries: (userId: string) => ['entries', userId] as const,
}

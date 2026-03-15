/**
 * Centralised access point for all environment variables.
 *
 * All `import.meta.env` reads live here. No other file should reference
 * `import.meta.env` directly — this makes it easy to audit what the app
 * reads from the environment and simplifies testing.
 */

export const config = {
  /** Base URL for the ADT Hub API. Empty string means use the Vite proxy (local dev). */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? "",

  /** Current deployment environment label (local | dev | staging | prod) */
  environment: (import.meta.env.VITE_ENVIRONMENT as string) ?? "local",
} as const;

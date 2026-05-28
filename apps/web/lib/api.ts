/**
 * Centralized utility to get the active backend API URL.
 * Resolves to the NEXT_PUBLIC_API_URL environment variable if set (for production/staging),
 * or falls back to 'http://localhost:8080' for local development.
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}

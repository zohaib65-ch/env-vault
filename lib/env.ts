import "server-only"

import { z } from "zod"

const required = (name: string) =>
  z.string({ error: `${name} is not set` }).trim().min(1, `${name} is empty`)

/** ENCRYPTION_KEY as 32 raw bytes, from base64 or 64 hex characters. */
export function decodeEncryptionKey(raw: string): Buffer | null {
  const value = raw.trim()
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex")
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null
  const key = Buffer.from(value, "base64")
  return key.length === 32 ? key : null
}

const serverEnvSchema = z.object({
  MONGODB_URI: required("MONGODB_URI"),
  ENCRYPTION_KEY: required("ENCRYPTION_KEY").refine(
    (value) => decodeEncryptionKey(value) !== null,
    "ENCRYPTION_KEY must be 32 random bytes. Generate one with: openssl rand -base64 32"
  ),
  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
  APP_URL: z.url({ error: "APP_URL must be a full URL, e.g. http://localhost:3000" }),
  // Fails closed: list who may sign in, or opt in to open sign-up with "*".
  ALLOWED_EMAILS: z
    .string({ error: "ALLOWED_EMAILS is not set (your Google email, or * to allow anyone)" })
    .trim()
    .min(1, "ALLOWED_EMAILS is empty (your Google email, or * to allow anyone)"),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid server environment:\n${problems.map((p) => `  - ${p}`).join("\n")}`)
    this.name = "ConfigError"
  }
}

/**
 * Server-only environment. Parsed on use (it's cheap) so `next build` works
 * without secrets and edits to .env apply without restarting `next dev`.
 */
export function getEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((issue) => issue.message))
  }
  return parsed.data
}

export function isEmailAllowed(email: string) {
  const raw = getEnv().ALLOWED_EMAILS
  if (raw === "*") return true
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(email.toLowerCase())
}

/** Secure-only cookies whenever the app is served over HTTPS. */
export function usesHttps() {
  return getEnv().APP_URL.startsWith("https://")
}

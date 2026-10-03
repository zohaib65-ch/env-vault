import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from "node:crypto"

import { ConfigError, decodeEncryptionKey, getEnv } from "@/lib/env"

const ALGORITHM = "aes-256-gcm"
const FORMAT_VERSION = "v1"
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

function getEncryptionKey(): Buffer {
  // getEnv() has already validated the format; this only narrows the type.
  const key = decodeEncryptionKey(getEnv().ENCRYPTION_KEY)
  if (!key) throw new ConfigError(["ENCRYPTION_KEY is invalid"])
  return key
}

/** Independent subkey of ENCRYPTION_KEY for a purpose other than encryption. */
export function deriveKey(purpose: string) {
  return Buffer.from(
    hkdfSync("sha256", getEncryptionKey(), Buffer.alloc(0), `env-vault:${purpose}`, 32)
  )
}

/**
 * Additional authenticated data that binds a ciphertext to the record that
 * owns it, so an encrypted value copied onto another record fails to decrypt.
 */
export function variableContext(variableId: string) {
  return `env-vault:variable:${variableId}`
}

/**
 * Encrypts with AES-256-GCM and a fresh random 96-bit IV.
 * Output: `v1:<iv>:<authTag>:<ciphertext>` (base64url segments).
 */
export function encryptSecret(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTES,
  })
  cipher.setAAD(Buffer.from(context, "utf8"))

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":")
}

export function decryptSecret(payload: string, context: string): string {
  const [version, iv, authTag, ciphertext] = payload.split(":")
  if (
    version !== FORMAT_VERSION ||
    !iv ||
    !authTag ||
    ciphertext === undefined
  ) {
    throw new Error("Unsupported ciphertext format")
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
    { authTagLength: AUTH_TAG_BYTES }
  )
  decipher.setAAD(Buffer.from(context, "utf8"))
  decipher.setAuthTag(Buffer.from(authTag, "base64url"))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

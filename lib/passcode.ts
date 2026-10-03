import "server-only"

import {
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto"

import { deriveKey } from "@/lib/crypto"

// OWASP-recommended scrypt parameters: N=2^17, r=8, p=1 (~128 MiB per hash).
const SCRYPT_N = 2 ** 17
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64
const SALT_BYTES = 16
const SCHEME = "scrypt-hmac"

function scryptAsync(
  password: Buffer,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

function scryptOptions(N: number, r: number, p: number): ScryptOptions {
  return { N, r, p, maxmem: 256 * N * r + 1024 * 1024 }
}

/**
 * A 4-digit PIN has only 10,000 values, so a copy of the database alone must
 * not be enough to brute-force the hash offline. The PIN is keyed with a
 * server-side pepper (derived from ENCRYPTION_KEY) before it is hashed.
 */
function pepper(passcode: string) {
  return createHmac("sha256", deriveKey("passcode-pepper"))
    .update(passcode.normalize("NFKC"))
    .digest()
}

/** Returns `scrypt-hmac$N$r$p$salt$hash` so parameters can be raised later. */
export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const hash = await scryptAsync(
    pepper(passcode),
    salt,
    KEY_LENGTH,
    scryptOptions(SCRYPT_N, SCRYPT_R, SCRYPT_P)
  )
  return [
    SCHEME,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$")
}

export async function verifyPasscodeHash(
  passcode: string,
  stored: string
): Promise<boolean> {
  const [scheme, n, r, p, saltText, hashText] = stored.split("$")
  if (scheme !== SCHEME || !saltText || !hashText) return false

  const expected = Buffer.from(hashText, "base64url")
  const actual = await scryptAsync(
    pepper(passcode),
    Buffer.from(saltText, "base64url"),
    expected.length,
    scryptOptions(Number(n), Number(r), Number(p))
  )

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

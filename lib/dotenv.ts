import { ENV_KEY_PATTERN } from "@/lib/validation"

// The line grammar of the `dotenv` package (which Next.js uses to load .env
// files), except that whitespace outside quotes never crosses a line break:
// dotenv's `\s*` does, which makes blank-line-heavy input parse in O(n²).
const LINE =
  /^[^\S\n]*(?:export[^\S\n]+)?([\w.-]+)(?:[^\S\n]*=[^\S\n]*|:[^\S\n]+)('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\n]+)?[^\S\n]*(?:#.*)?$/gm

export type ParsedEnvFile = {
  entries: { key: string; value: string }[]
  invalidKeys: string[]
  duplicateKeys: string[]
}

export function parseEnvFile(content: string): ParsedEnvFile {
  const source = content.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const values = new Map<string, string>()
  const invalidKeys = new Set<string>()
  const duplicateKeys = new Set<string>()

  for (const match of source.matchAll(LINE)) {
    const key = match[1]
    let value = (match[2] ?? "").trim()
    const quote = value[0]

    if (value.length >= 2 && "'\"`".includes(quote) && value.endsWith(quote)) {
      value = value.slice(1, -1)
    }
    if (quote === '"') {
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r")
    }

    if (!ENV_KEY_PATTERN.test(key)) {
      invalidKeys.add(key)
      continue
    }
    if (values.has(key)) duplicateKeys.add(key)
    // Like dotenv, the last definition of a key wins.
    values.set(key, value)
  }

  return {
    entries: [...values].map(([key, value]) => ({ key, value })),
    invalidKeys: [...invalidKeys],
    duplicateKeys: [...duplicateKeys],
  }
}

const BARE_VALUE = /^[A-Za-z0-9_./:@%+,=~^-]*$/

/**
 * Serialises a value so `dotenv` parses it back to exactly the same string.
 * Single quotes are preferred because dotenv applies no escaping inside them.
 */
function serializeValue(value: string) {
  if (BARE_VALUE.test(value)) return value
  if (!value.includes("'")) return `'${value}'`
  if (!value.includes('"') && !/\\[nr]/.test(value)) return `"${value}"`
  if (!value.includes("`")) return `\`${value}\``
  return `"${value}"`
}

export function serializeEnvFile(
  entries: { key: string; value: string }[],
  header: string[] = []
) {
  const lines = header.map((line) => `# ${line.replace(/[\r\n]+/g, " ")}`)
  if (lines.length) lines.push("")
  for (const { key, value } of entries) {
    lines.push(`${key}=${serializeValue(value)}`)
  }
  return `${lines.join("\n")}\n`
}

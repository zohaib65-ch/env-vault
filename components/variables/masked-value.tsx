import { cn } from "@/lib/utils"

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789_-:/."

/**
 * Decorative placeholder rendered in place of a secret. It is derived from
 * the variable id, never from the value, so it leaks neither content nor length.
 */
function placeholderFor(seed: string) {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  let out = ""
  for (let i = 0; i < 22; i++) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0
    out += ALPHABET[hash % ALPHABET.length]
  }
  return out
}

export function MaskedValue({ seed, className }: { seed: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Hidden value"
      className={cn("relative inline-flex max-w-full items-center overflow-hidden", className)}
    >
      <span
        aria-hidden
        className="truncate font-mono text-[13px] text-muted-foreground/80 blur-[5px] select-none"
      >
        {placeholderFor(seed)}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center overflow-hidden font-mono text-sm tracking-[0.2em] whitespace-nowrap text-muted-foreground/70"
      >
        ••••••••••••••••
      </span>
    </span>
  )
}

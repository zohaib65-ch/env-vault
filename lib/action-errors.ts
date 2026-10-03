import "server-only"

import { unstable_rethrow } from "next/navigation"

import { fail } from "@/lib/action-result"

export function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  )
}

/**
 * Converts an unexpected failure into a generic result. Only the error class
 * is logged: messages from lower layers could echo user input.
 */
export function unexpectedError(error: unknown, operation: string) {
  unstable_rethrow(error)
  const kind = error instanceof Error ? error.name : typeof error
  console.error(`[action] ${operation} failed (${kind})`)
  return fail({
    code: "SERVER",
    message: "Something went wrong. Please try again.",
  })
}

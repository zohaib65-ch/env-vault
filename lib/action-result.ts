export type ActionError =
  | {
      code: "VALIDATION"
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }
  | { code: "NOT_FOUND"; message: string }
  | { code: "CONFLICT"; message: string }
  | { code: "INVALID_PASSCODE"; message: string; remainingAttempts: number }
  | { code: "LOCKED"; message: string; lockedUntil: string }
  | { code: "PASSCODE_NOT_SET"; message: string }
  | { code: "PASSKEY_FAILED"; message: string }
  | { code: "SERVER"; message: string }

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError }

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

export function fail(error: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error }
}

export function isPasscodeError(error: ActionError) {
  return (
    error.code === "INVALID_PASSCODE" ||
    error.code === "LOCKED" ||
    error.code === "PASSCODE_NOT_SET"
  )
}

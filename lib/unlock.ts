import type { AuthenticationResponseJSON } from "@simplewebauthn/browser"

/** Proof the user supplied to open a secret: their PIN, or a Touch ID assertion. */
export type Unlock =
  | { passcode: string }
  | { passkey: AuthenticationResponseJSON }

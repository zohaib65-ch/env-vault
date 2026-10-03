import { platformAuthenticatorIsAvailable } from "@simplewebauthn/browser"

// Remembers which Touch ID credential belongs to this browser, so the prompt
// can start automatically here. A convenience only — the server decides.
const DEVICE_KEY = "envvault:touch-id-credential"

let availability: Promise<boolean> | null = null

/** True when this device has a built-in authenticator like Touch ID. */
export function touchIdAvailable() {
  if (typeof window === "undefined") return Promise.resolve(false)
  availability ??= platformAuthenticatorIsAvailable().catch(() => false)
  return availability
}

export function touchIdCredentialOnThisDevice() {
  try {
    return window.localStorage.getItem(DEVICE_KEY)
  } catch {
    return null
  }
}

export function rememberTouchIdCredential(credentialId: string) {
  try {
    window.localStorage.setItem(DEVICE_KEY, credentialId)
  } catch {
    // Storage blocked (private mode); Touch ID still works via the button.
  }
}

export function forgetTouchIdCredential() {
  try {
    window.localStorage.removeItem(DEVICE_KEY)
  } catch {
    // Nothing to forget.
  }
}

/** Cancelled, timed out or refused by the browser / authenticator. */
export function isWebAuthnError(error: unknown) {
  return (
    error instanceof Error &&
    [
      "NotAllowedError",
      "AbortError",
      "InvalidStateError",
      "SecurityError",
      "NotSupportedError",
      "WebAuthnError",
    ].includes(error.name)
  )
}

"use client"

import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import {
  startAuthentication,
  WebAuthnAbortService,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser"
import {
  Fingerprint,
  LockKeyhole,
  ShieldAlert,
  TimerIcon,
  XCircle,
} from "lucide-react"

import { startPasskeyAuthentication } from "@/app/actions/passkeys"
import { PinInput } from "@/components/shared/pin-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import type { ActionError, ActionResult } from "@/lib/action-result"
import {
  isWebAuthnError,
  rememberTouchIdCredential,
  touchIdAvailable,
  touchIdCredentialOnThisDevice,
} from "@/lib/touch-id"
import type { Unlock } from "@/lib/unlock"
import { cn } from "@/lib/utils"
import { PASSCODE_LENGTH } from "@/lib/validation"

type PasscodeRequest<T> = {
  title?: string
  description: React.ReactNode
  confirmLabel?: string
  /** Require the PIN even when fingerprint unlock is set up. */
  pinOnly?: boolean
  /**
   * Called synchronously from the click or keystroke with the user's proof
   * (PIN or fingerprint), so clipboard writes keep the user gesture.
   */
  run: (unlock: Promise<Unlock>) => Promise<ActionResult<T>>
}

type ActiveRequest = PasscodeRequest<unknown> & {
  resolve: (value: unknown) => void
}

type PasscodeContextValue = {
  /** Resolves with the action's data, or `null` if the user cancels. */
  requestPasscode: <T>(request: PasscodeRequest<T>) => Promise<T | null>
}

type FingerprintState = "off" | "preparing" | "ready" | "prompting"

const PasscodeContext = createContext<PasscodeContextValue | null>(null)

export function usePasscode() {
  const context = useContext(PasscodeContext)
  if (!context) throw new Error("usePasscode must be used inside <PasscodeProvider>")
  return context
}

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])
  if (!until) return 0
  return Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000))
}

function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = String(seconds % 60).padStart(2, "0")
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`
}

export function PasscodeProvider({
  children,
  fingerprintEnabled,
}: {
  children: React.ReactNode
  /** The user has registered fingerprint unlock on at least one device. */
  fingerprintEnabled: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  // Refs hold what async callbacks need, so they never act on a stale dialog.
  const requestRef = useRef<ActiveRequest | null>(null)
  const busyRef = useRef(false)
  const optionsRef = useRef<PublicKeyCredentialRequestOptionsJSON | null>(null)
  const credentialIdRef = useRef<string | null>(null)

  const [request, setRequest] = useState<ActiveRequest | null>(null)
  const [open, setOpen] = useState(false)
  const [passcode, setPasscode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [fingerprint, setFingerprint] = useState<FingerprintState>("off")

  const secondsLocked = useCountdown(lockedUntil)
  const locked = secondsLocked > 0

  function finish(result: unknown) {
    const current = requestRef.current
    requestRef.current = null
    optionsRef.current = null
    WebAuthnAbortService.cancelCeremony()
    current?.resolve(result)
    setOpen(false)
    setPasscode("")
    setFingerprint("off")
  }

  /** Fetches a one-time challenge so the fingerprint prompt can open instantly. */
  async function prepareFingerprint(autoStart: boolean) {
    const current = requestRef.current
    if (!current || !(await touchIdAvailable())) return
    if (requestRef.current !== current) return
    setFingerprint("preparing")
    const result = await startPasskeyAuthentication().catch(() => null)
    if (requestRef.current !== current) return
    if (!result?.ok) {
      setFingerprint("off")
      return
    }
    optionsRef.current = result.data
    setFingerprint("ready")
    if (autoStart && !busyRef.current) unlockWithFingerprint(true)
  }

  function handleFailure(failure: ActionError) {
    setPasscode("")
    if (failure.code === "INVALID_PASSCODE") {
      setError(
        failure.remainingAttempts <= 2
          ? `Incorrect passcode · ${failure.remainingAttempts} ${failure.remainingAttempts === 1 ? "attempt" : "attempts"} left`
          : "Incorrect passcode"
      )
      setShakeKey((key) => key + 1)
    } else if (failure.code === "LOCKED") {
      setLockedUntil(failure.lockedUntil)
      setError(null)
    } else if (failure.code === "PASSCODE_NOT_SET") {
      finish(null)
      router.push("/setup")
      return
    } else {
      setError(failure.message)
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function attempt(unlock: Promise<Unlock>, automatic = false) {
    const current = requestRef.current
    if (!current || busyRef.current) return
    busyRef.current = true
    setPending(true)
    setError(null)

    // `run` starts synchronously so clipboard writes keep the user gesture.
    current
      .run(unlock)
      .then((result) => {
        if (requestRef.current !== current) return
        if (result.ok) {
          if (credentialIdRef.current) rememberTouchIdCredential(credentialIdRef.current)
          finish(result.data)
        } else {
          handleFailure(result.error)
        }
      })
      .catch((cause) => {
        if (requestRef.current !== current) return
        if (!isWebAuthnError(cause)) {
          setError("Network error. Check your connection and try again.")
        } else if (!automatic) {
          setError("Fingerprint check was cancelled. Try again, or enter your PIN.")
        }
      })
      .finally(() => {
        busyRef.current = false
        credentialIdRef.current = null
        setPending(false)
        // Fingerprint challenges are single-use; line up a fresh one.
        if (requestRef.current === current && !optionsRef.current && !current.pinOnly && fingerprintEnabled) {
          void prepareFingerprint(false)
        }
      })
  }

  function submitPin(code: string) {
    if (locked || code.length !== PASSCODE_LENGTH) return
    attempt(Promise.resolve({ passcode: code }))
  }

  function unlockWithFingerprint(automatic = false) {
    const options = optionsRef.current
    if (!options || busyRef.current || !requestRef.current) return
    optionsRef.current = null
    setFingerprint("prompting")

    // Opens the system prompt synchronously (Safari requires the user gesture).
    const unlock = startAuthentication({ optionsJSON: options }).then(
      (passkey): Unlock => {
        credentialIdRef.current = passkey.id
        return { passkey }
      }
    )
    unlock.catch(() => {}).finally(() => setFingerprint((state) => (state === "prompting" ? "preparing" : state)))
    attempt(unlock, automatic)
  }

  function requestPasscode<T>(next: PasscodeRequest<T>) {
    return new Promise<T | null>((resolve) => {
      requestRef.current?.resolve(null)
      const active: ActiveRequest = {
        ...(next as PasscodeRequest<unknown>),
        resolve: resolve as (value: unknown) => void,
      }
      requestRef.current = active
      optionsRef.current = null
      busyRef.current = false
      setRequest(active)
      setPasscode("")
      setError(null)
      setPending(false)
      setFingerprint("off")
      setOpen(true)

      if (fingerprintEnabled && !next.pinOnly) {
        // Start the prompt by itself on a device that has used it before.
        void prepareFingerprint(touchIdCredentialOnThisDevice() !== null)
      }
    })
  }

  return (
    <PasscodeContext.Provider value={{ requestPasscode }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) finish(null)
        }}
      >
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-[400px]"
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submitPin(passcode)
            }}
            autoComplete="off"
          >
            <div className="relative px-6 pt-7 pb-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,oklch(0.79_0.155_163/0.16),transparent_70%)]" />
              <DialogHeader className="relative items-center gap-3 text-center">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-2xl border bg-background/60 shadow-inner",
                    locked ? "text-destructive" : "text-brand"
                  )}
                >
                  {locked ? (
                    <ShieldAlert className="size-5" />
                  ) : (
                    <LockKeyhole className="size-5" />
                  )}
                </span>
                <DialogTitle className="text-base">
                  {locked ? "Passcode locked" : (request?.title ?? "Secret Protected")}
                </DialogTitle>
                <DialogDescription className="text-balance">
                  {locked
                    ? "Too many incorrect attempts. For your security, PIN entry is paused."
                    : request?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-6 space-y-4">
                {fingerprint !== "off" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full gap-2.5 text-[15px]"
                      onClick={() => unlockWithFingerprint()}
                      disabled={fingerprint !== "ready" || pending}
                    >
                      {fingerprint === "prompting" ? (
                        <Spinner />
                      ) : (
                        <Fingerprint className="size-5 text-brand" />
                      )}
                      {fingerprint === "prompting"
                        ? "Touch the fingerprint sensor…"
                        : "Unlock with fingerprint"}
                    </Button>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      or enter your PIN
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                ) : null}

                {locked ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 font-mono text-sm text-destructive">
                    <TimerIcon className="size-4" />
                    Try again in {formatCountdown(secondsLocked)}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <PinInput
                      key={shakeKey}
                      ref={inputRef}
                      id="vault-passcode"
                      size="lg"
                      aria-label="4-digit security passcode"
                      value={passcode}
                      onChange={(next) => {
                        setPasscode(next)
                        if (error) setError(null)
                        // Submitting inside the keystroke's event handler keeps
                        // the user gesture that clipboard writes need.
                        if (next.length === PASSCODE_LENGTH) submitPin(next)
                      }}
                      disabled={pending}
                      invalid={Boolean(error)}
                      aria-describedby={error ? "passcode-error" : undefined}
                      className={cn(
                        "justify-center",
                        error && "animate-[shake_0.35s_ease-in-out]"
                      )}
                    />
                  </div>
                )}

                <p
                  id="passcode-error"
                  role="alert"
                  className={cn(
                    "flex min-h-5 items-center justify-center gap-1.5 text-center text-sm text-destructive transition-opacity",
                    error ? "opacity-100" : "opacity-0"
                  )}
                >
                  {error ? (
                    <>
                      <XCircle className="size-4 shrink-0" />
                      {error}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => finish(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || locked || passcode.length !== PASSCODE_LENGTH}
              >
                {pending && fingerprint !== "prompting" ? <Spinner /> : <LockKeyhole />}
                {request?.confirmLabel ?? "Unlock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PasscodeContext.Provider>
  )
}

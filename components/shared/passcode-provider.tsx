"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { LockKeyhole, ShieldAlert, TimerIcon, XCircle } from "lucide-react"

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
import { PinInput } from "@/components/shared/pin-input"
import type { ActionResult } from "@/lib/action-result"
import { cn } from "@/lib/utils"
import { PASSCODE_LENGTH } from "@/lib/validation"

type PasscodeRequest<T> = {
  title?: string
  description: React.ReactNode
  confirmLabel?: string
  /** Called synchronously from the submit handler with the typed passcode. */
  run: (passcode: string) => Promise<ActionResult<T>>
}

type ActiveRequest = PasscodeRequest<unknown> & {
  resolve: (value: unknown) => void
}

type PasscodeContextValue = {
  /** Resolves with the action's data, or `null` if the user cancels. */
  requestPasscode: <T>(request: PasscodeRequest<T>) => Promise<T | null>
}

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

export function PasscodeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [request, setRequest] = useState<ActiveRequest | null>(null)
  const [open, setOpen] = useState(false)
  const [passcode, setPasscode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)

  const secondsLocked = useCountdown(lockedUntil)
  const locked = secondsLocked > 0

  const requestPasscode = useCallback(<T,>(next: PasscodeRequest<T>) => {
    return new Promise<T | null>((resolve) => {
      setRequest({ ...(next as PasscodeRequest<unknown>), resolve: resolve as (v: unknown) => void })
      setPasscode("")
      setError(null)
      setPending(false)
      setOpen(true)
    })
  }, [])

  function close(result: unknown) {
    request?.resolve(result)
    setOpen(false)
    setPasscode("")
  }

  function submit(code: string) {
    if (!request || pending || locked || code.length !== PASSCODE_LENGTH) return

    setPending(true)
    setError(null)
    // `run` starts synchronously so clipboard writes keep the user gesture.
    request
      .run(code)
      .then((result) => {
        if (result.ok) {
          close(result.data)
          return
        }
        const failure = result.error
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
          close(null)
          router.push("/setup")
        } else {
          setError(failure.message)
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      })
      .catch(() => setError("Network error. Check your connection and try again."))
      .finally(() => setPending(false))
  }

  return (
    <PasscodeContext.Provider value={{ requestPasscode }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) close(null)
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
              submit(passcode)
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
                    ? "Too many incorrect attempts. For your security, passcode entry is paused."
                    : request?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="relative mt-6 space-y-2.5">
                {locked ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 font-mono text-sm text-destructive">
                    <TimerIcon className="size-4" />
                    Try again in {formatCountdown(secondsLocked)}
                  </div>
                ) : (
                  <>
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
                        if (next.length === PASSCODE_LENGTH) submit(next)
                      }}
                      disabled={pending}
                      invalid={Boolean(error)}
                      aria-describedby={error ? "passcode-error" : undefined}
                      className={cn(
                        "justify-center",
                        error && "animate-[shake_0.35s_ease-in-out]"
                      )}
                    />
                    <p
                      id="passcode-error"
                      role="alert"
                      className={cn(
                        "flex min-h-5 items-center justify-center gap-1.5 text-sm text-destructive transition-opacity",
                        error ? "opacity-100" : "opacity-0"
                      )}
                    >
                      {error ? (
                        <>
                          <XCircle className="size-4" />
                          {error}
                        </>
                      ) : null}
                    </p>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="mx-0 mb-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => close(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || locked || passcode.length !== PASSCODE_LENGTH}
              >
                {pending ? <Spinner /> : <LockKeyhole />}
                {request?.confirmLabel ?? "Unlock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PasscodeContext.Provider>
  )
}

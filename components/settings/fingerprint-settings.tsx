"use client"

import { useEffect, useState, useSyncExternalStore, useTransition } from "react"
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser"
import { Fingerprint, Laptop } from "lucide-react"
import { toast } from "sonner"

import {
  finishPasskeyRegistration,
  removePasskey,
  startPasskeyRegistration,
} from "@/app/actions/passkeys"
import { usePasscode } from "@/components/shared/passcode-provider"
import { TimeAgo } from "@/components/shared/time-ago"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { fail } from "@/lib/action-result"
import { formatDate } from "@/lib/format"
import {
  forgetTouchIdCredential,
  isWebAuthnError,
  rememberTouchIdCredential,
  touchIdAvailable,
  touchIdCredentialOnThisDevice,
} from "@/lib/touch-id"
import type { PasskeyItem } from "@/lib/types"

const subscribe = () => () => {}

export function FingerprintSettings({ passkeys }: { passkeys: PasskeyItem[] }) {
  const { requestPasscode } = usePasscode()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [retryOptions, setRetryOptions] =
    useState<PublicKeyCredentialCreationOptionsJSON | null>(null)
  const [removing, startRemoving] = useTransition()
  const thisDevice = useSyncExternalStore(
    subscribe,
    touchIdCredentialOnThisDevice,
    () => null
  )

  useEffect(() => {
    touchIdAvailable().then(setSupported)
  }, [])

  const enabledHere = passkeys.some((passkey) => passkey.credentialId === thisDevice)

  async function register(options: PublicKeyCredentialCreationOptionsJSON) {
    setBusy(true)
    try {
      const response = await startRegistration({ optionsJSON: options })
      setRetryOptions(null)
      const result = await finishPasskeyRegistration({ response })
      if (result.ok) {
        rememberTouchIdCredential(result.data.credentialId)
        toast.success("Fingerprint unlock is on", {
          description: "Use it next time you reveal, copy or export a secret.",
        })
      } else {
        toast.error(result.error.message)
      }
    } catch (error) {
      if (isWebAuthnError(error) && (error as Error).name === "InvalidStateError") {
        setRetryOptions(null)
        toast.info("This device is already set up for fingerprint unlock.")
      } else if (isWebAuthnError(error)) {
        // Cancelled, or the browser wants a fresh click before it shows the prompt.
        setRetryOptions(options)
      } else {
        toast.error("Couldn't set up fingerprint unlock. Please try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  async function enable() {
    const options = await requestPasscode({
      title: "Turn on fingerprint unlock",
      description: "Enter your PIN to allow fingerprint unlock on this device.",
      confirmLabel: "Continue",
      pinOnly: true,
      run: (unlock) =>
        unlock.then((proof) =>
          "passcode" in proof
            ? startPasskeyRegistration({ passcode: proof.passcode })
            : fail({ code: "VALIDATION", message: "Enter your PIN." })
        ),
    })
    if (options) await register(options)
  }

  function remove(passkey: PasskeyItem) {
    startRemoving(async () => {
      const result = await removePasskey({ passkeyId: passkey.id })
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      if (passkey.credentialId === thisDevice) forgetTouchIdCredential()
      toast.success(`Fingerprint unlock removed from ${passkey.name}`)
    })
  }

  return (
    <div className="space-y-4">
      {passkeys.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-brand">
                <Fingerprint className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{passkey.name}</p>
                  {passkey.credentialId === thisDevice ? (
                    <Badge variant="outline" className="border-brand/30 text-[11px] text-brand">
                      This device
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Added {formatDate(passkey.createdAt)}
                  {passkey.lastUsedAt ? (
                    <>
                      {" · "}
                      <TimeAgo date={passkey.lastUsedAt} prefix="last used" />
                    </>
                  ) : (
                    " · never used"
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={removing}
                onClick={() => remove(passkey)}
                className="text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {supported === false ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Laptop className="size-4 shrink-0" />
          This browser can&apos;t use a fingerprint sensor here. Your PIN still works.
        </p>
      ) : enabledHere ? (
        <p className="flex items-center gap-2 text-sm text-brand">
          <Fingerprint className="size-4 shrink-0" />
          Fingerprint unlock is on for this device.
        </p>
      ) : (
        <Button onClick={enable} disabled={busy || supported === null}>
          {busy ? <Spinner /> : <Fingerprint />}
          Turn on for this device
        </Button>
      )}

      {retryOptions ? (
        <div className="flex flex-col gap-3 rounded-lg border border-brand/20 bg-brand/[0.04] p-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-muted-foreground">
            The fingerprint prompt was closed. Click to scan your fingerprint again.
          </p>
          <Button
            variant="outline"
            onClick={() => register(retryOptions)}
            disabled={busy}
          >
            <Fingerprint />
            Scan fingerprint
          </Button>
        </div>
      ) : null}
    </div>
  )
}

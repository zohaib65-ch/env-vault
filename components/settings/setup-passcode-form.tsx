"use client"

import { useRef, useState, useTransition } from "react"
import { ArrowRight } from "lucide-react"

import { setupPasscode } from "@/app/actions/security"
import { PinInput } from "@/components/shared/pin-input"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { PASSCODE_LENGTH } from "@/lib/validation"

export function SetupPasscodeForm() {
  const confirmRef = useRef<HTMLInputElement>(null)
  const [passcode, setPasscode] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const complete = passcode.length === PASSCODE_LENGTH && confirm.length === PASSCODE_LENGTH

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!complete) return
    setMessage(null)
    startTransition(async () => {
      // Redirects to the dashboard on success.
      const result = await setupPasscode({ passcode, confirm })
      if (result && !result.ok) {
        setErrors(result.error.code === "VALIDATION" ? (result.error.fieldErrors ?? {}) : {})
        setMessage(result.error.message)
        setConfirm("")
        confirmRef.current?.focus()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="mt-6" autoComplete="off">
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.passcode)}>
          <FieldLabel htmlFor="passcode">4-digit passcode</FieldLabel>
          <PinInput
            id="passcode"
            value={passcode}
            onChange={(next) => {
              setPasscode(next)
              setErrors({})
              if (next.length === PASSCODE_LENGTH) confirmRef.current?.focus()
            }}
            invalid={Boolean(errors.passcode)}
            autoFocus
          />
          <FieldError>{errors.passcode?.[0]}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="confirm">Confirm passcode</FieldLabel>
          <PinInput
            ref={confirmRef}
            id="confirm"
            value={confirm}
            onChange={(next) => {
              setConfirm(next)
              setErrors({})
            }}
            invalid={Boolean(errors.confirm)}
          />
          <FieldError>{errors.confirm?.[0]}</FieldError>
          <FieldDescription>
            Avoid obvious codes like 1234 or a birth year. There&apos;s no
            recovery email, so remember it.
          </FieldDescription>
        </Field>

        {message && !errors.passcode && !errors.confirm ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-10 w-full"
          disabled={pending || !complete}
        >
          {pending ? <Spinner /> : null}
          Create passcode & open vault
          {!pending ? <ArrowRight /> : null}
        </Button>
      </FieldGroup>
    </form>
  )
}

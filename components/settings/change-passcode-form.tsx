"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { changePasscode } from "@/app/actions/security"
import { PinInput } from "@/components/shared/pin-input"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/format"
import { PASSCODE_LENGTH } from "@/lib/validation"

export function ChangePasscodeForm() {
  const currentRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState("")
  const [passcode, setPasscode] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [pending, startTransition] = useTransition()

  const complete = [current, passcode, confirm].every(
    (value) => value.length === PASSCODE_LENGTH
  )

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!complete) return
    startTransition(async () => {
      const result = await changePasscode({ current, passcode, confirm })
      if (result.ok) {
        setCurrent("")
        setPasscode("")
        setConfirm("")
        setErrors({})
        toast.success("Security passcode changed", {
          description: "Use the new passcode on all your devices.",
        })
        return
      }

      const error = result.error
      if (error.code === "VALIDATION") {
        setErrors(error.fieldErrors ?? {})
      } else if (error.code === "INVALID_PASSCODE") {
        setCurrent("")
        setErrors({
          current: [
            `Incorrect passcode · ${error.remainingAttempts} ${error.remainingAttempts === 1 ? "attempt" : "attempts"} left`,
          ],
        })
        currentRef.current?.focus()
      } else if (error.code === "LOCKED") {
        setErrors({
          current: [`Locked after too many attempts. Try again after ${formatDateTime(error.lockedUntil)}.`],
        })
      } else {
        toast.error(error.message)
      }
    })
  }

  function advance(next: string, target: React.RefObject<HTMLInputElement | null>) {
    if (next.length === PASSCODE_LENGTH) target.current?.focus()
  }

  return (
    <form onSubmit={onSubmit} autoComplete="off">
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.current)}>
          <FieldLabel htmlFor="current-passcode">Current passcode</FieldLabel>
          <PinInput
            ref={currentRef}
            id="current-passcode"
            value={current}
            onChange={(next) => {
              setCurrent(next)
              setErrors({})
              advance(next, nextRef)
            }}
            invalid={Boolean(errors.current)}
          />
          <FieldError>{errors.current?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.passcode)}>
          <FieldLabel htmlFor="new-passcode">New passcode</FieldLabel>
          <PinInput
            ref={nextRef}
            id="new-passcode"
            value={passcode}
            onChange={(next) => {
              setPasscode(next)
              setErrors({})
              advance(next, confirmRef)
            }}
            invalid={Boolean(errors.passcode)}
          />
          <FieldError>{errors.passcode?.[0]}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="confirm-passcode">Confirm new passcode</FieldLabel>
          <PinInput
            ref={confirmRef}
            id="confirm-passcode"
            value={confirm}
            onChange={(next) => {
              setConfirm(next)
              setErrors({})
            }}
            invalid={Boolean(errors.confirm)}
          />
          <FieldError>{errors.confirm?.[0]}</FieldError>
        </Field>
        <div>
          <Button type="submit" disabled={pending || !complete}>
            {pending ? <Spinner /> : null}
            Change passcode
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

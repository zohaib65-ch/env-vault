"use client"

import { useContext } from "react"
import { OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"

import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"
import { PASSCODE_LENGTH } from "@/lib/validation"

function MaskedSlot({
  index,
  invalid,
  size,
}: {
  index: number
  invalid?: boolean
  size: "default" | "lg"
}) {
  const context = useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = context?.slots[index] ?? {}

  return (
    <div
      data-active={isActive}
      className={cn(
        "relative flex items-center justify-center rounded-lg border border-input bg-input/30 transition-all",
        size === "lg" ? "size-14" : "size-11",
        "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50",
        invalid && "border-destructive data-[active=true]:border-destructive data-[active=true]:ring-destructive/30"
      )}
    >
      {/* Digits are never rendered, only a dot per entered digit. */}
      {char ? (
        <span className="animate-in zoom-in-50 size-2.5 rounded-full bg-foreground duration-150" />
      ) : null}
      {hasFakeCaret ? (
        <span className="animate-caret-blink pointer-events-none h-5 w-px bg-foreground duration-1000" />
      ) : null}
    </div>
  )
}

/** Masked 4-digit PIN entry. Only digits can be typed or pasted. */
export function PinInput({
  id,
  value,
  onChange,
  invalid,
  disabled,
  autoFocus,
  size = "default",
  className,
  ref,
  ...aria
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  size?: "default" | "lg"
  className?: string
  ref?: React.Ref<HTMLInputElement>
  "aria-label"?: string
  "aria-describedby"?: string
}) {
  return (
    <InputOTP
      ref={ref}
      id={id}
      value={value}
      onChange={onChange}
      maxLength={PASSCODE_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      disabled={disabled}
      pushPasswordManagerStrategy="none"
      aria-invalid={invalid || undefined}
      data-1p-ignore
      data-lpignore="true"
      containerClassName={className}
      {...aria}
    >
      <InputOTPGroup className="gap-2.5">
        {Array.from({ length: PASSCODE_LENGTH }, (_, index) => (
          <MaskedSlot key={index} index={index} invalid={invalid} size={size} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

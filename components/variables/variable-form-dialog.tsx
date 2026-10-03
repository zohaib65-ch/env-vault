"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, LockKeyhole, PenLine, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { accessSecret, createVariable, updateVariable } from "@/app/actions/variables"
import { usePasscode } from "@/components/shared/passcode-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { VariableItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import { envKeySchema, envValueSchema } from "@/lib/validation"

type ValueMode = "keep" | "replace" | "unlocked"

function SecretTextarea({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  placeholder?: string
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        aria-invalid={invalid}
        className={cn(
          "scrollbar-thin max-h-48 min-h-20 resize-y pr-10 font-mono text-[13px] break-all",
          !visible && "text-security"
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide value" : "Show value"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}

export function VariableFormDialog({
  open,
  onOpenChange,
  projectId,
  variable,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** When provided the dialog edits this variable. Remount (via `key`) per open. */
  variable?: VariableItem | null
}) {
  const { requestPasscode } = usePasscode()
  const editing = Boolean(variable)

  const [key, setKey] = useState(variable?.key ?? "")
  const [value, setValue] = useState("")
  const [mode, setMode] = useState<ValueMode>(editing ? "keep" : "replace")
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [unlocking, setUnlocking] = useState(false)
  const [pending, startTransition] = useTransition()

  function reset(next = variable) {
    setKey(next?.key ?? "")
    setValue("")
    setMode(next ? "keep" : "replace")
    setErrors({})
  }

  function validate() {
    const nextErrors: Record<string, string[]> = {}
    const keyResult = envKeySchema.safeParse(key)
    if (!keyResult.success) nextErrors.key = [keyResult.error.issues[0].message]
    if (mode !== "keep") {
      const valueResult = envValueSchema.safeParse(value)
      if (!valueResult.success) nextErrors.value = [valueResult.error.issues[0].message]
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function unlockCurrentValue() {
    if (!variable) return
    setUnlocking(true)
    const data = await requestPasscode({
      description: (
        <>
          Confirm it&apos;s you to edit the value of{" "}
          <code className="font-mono text-foreground">{variable.key}</code>.
        </>
      ),
      run: (unlock) =>
        unlock.then((proof) =>
          accessSecret({ variableId: variable.id, purpose: "edit", unlock: proof })
        ),
    })
    setUnlocking(false)
    if (data) {
      setValue(data.value)
      setMode("unlocked")
    }
  }

  function submit(addAnother: boolean) {
    if (!validate()) return
    startTransition(async () => {
      const result = variable
        ? await updateVariable({
            variableId: variable.id,
            key,
            value: mode === "keep" ? null : value,
          })
        : await createVariable({ projectId, key, value })

      if (!result.ok) {
        const fieldErrors =
          result.error.code === "VALIDATION" ? result.error.fieldErrors : undefined
        setErrors(fieldErrors ?? {})
        if (!fieldErrors) toast.error(result.error.message)
        return
      }

      toast.success(
        variable ? `${key.trim()} updated` : `${key.trim()} added`,
        { description: "Stored encrypted with AES-256-GCM." }
      )
      if (addAnother) {
        reset(null)
      } else {
        setValue("")
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending || unlocking) return
        if (!next) setValue("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(false)
          }}
          className="grid gap-5"
          autoComplete="off"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit variable" : "Add variable"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename the variable or replace its value. The current value stays hidden unless you unlock it."
                : "The value is encrypted on the server before it is stored."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.key)}>
              <FieldLabel htmlFor="variable-key">Variable Name</FieldLabel>
              <Input
                id="variable-key"
                value={key}
                onChange={(event) => {
                  setKey(event.target.value)
                  if (errors.key) setErrors((e) => ({ ...e, key: undefined }))
                }}
                placeholder="MONGODB_URI"
                autoFocus={!editing}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={128}
                aria-invalid={Boolean(errors.key)}
                className="h-9 font-mono text-[13px]"
              />
              <FieldError>{errors.key?.[0]}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.value)}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="variable-value">Value</FieldLabel>
                {editing && mode !== "keep" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={() => {
                      setValue("")
                      setMode("keep")
                      setErrors((e) => ({ ...e, value: undefined }))
                    }}
                  >
                    <RotateCcw />
                    Keep current value
                  </Button>
                ) : null}
              </div>

              {mode === "keep" ? (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-brand">
                      <LockKeyhole className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm tracking-[0.2em] text-muted-foreground">
                        ••••••••••••
                      </p>
                      <p className="text-xs text-muted-foreground">Current value is hidden</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={unlockCurrentValue}
                      disabled={unlocking}
                    >
                      {unlocking ? <Spinner /> : <LockKeyhole />}
                      Unlock
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMode("replace")}
                    >
                      <PenLine />
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <SecretTextarea
                  id="variable-value"
                  value={value}
                  onChange={(next) => {
                    setValue(next)
                    if (errors.value) setErrors((e) => ({ ...e, value: undefined }))
                  }}
                  invalid={Boolean(errors.value)}
                  placeholder={mode === "replace" && editing ? "Enter a new value" : "Paste the secret value"}
                  autoFocus={editing}
                />
              )}
              {mode === "unlocked" ? (
                <FieldDescription>Unlocked with your passcode. Edit and save, or keep the current value.</FieldDescription>
              ) : null}
              <FieldError>{errors.value?.[0]}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            {!editing ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => submit(true)}
                disabled={pending || !key.trim()}
              >
                Save & add another
              </Button>
            ) : null}
            <Button type="submit" disabled={pending || !key.trim()}>
              {pending ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

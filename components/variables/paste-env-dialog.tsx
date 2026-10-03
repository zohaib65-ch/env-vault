"use client"

import { useRef, useState, useTransition } from "react"
import {
  ArrowLeft,
  CircleAlert,
  ClipboardPaste,
  EyeOff,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { importEnv, previewEnvImport } from "@/app/actions/variables"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { pluralize } from "@/lib/format"
import type { ImportPreview } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MAX_IMPORT_BYTES } from "@/lib/validation"

const PLACEHOLDER = "MONGODB_URI=...\nNEXTAUTH_SECRET=...\nAPI_KEY=..."

export function PasteEnvDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState("")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [overwrite, setOverwrite] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setContent("")
    setPreview(null)
    setSelected(new Set())
    setOverwrite(false)
    setError(null)
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  // Parsed on the server; only variable names come back for the preview.
  function analyse(text: string) {
    setError(null)
    if (!text.trim()) {
      setError("Paste the contents of your .env file first.")
      return
    }
    if (new Blob([text]).size > MAX_IMPORT_BYTES) {
      setError("That's more than 256 KB. Is it really a .env file?")
      return
    }
    startTransition(async () => {
      const result = await previewEnvImport({ projectId, content: text })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setPreview(result.data)
      setSelected(new Set(result.data.keys.map((entry) => entry.key)))
    })
  }

  function confirmImport() {
    if (!preview) return
    startTransition(async () => {
      const result = await importEnv({
        projectId,
        content,
        keys: [...selected],
        overwrite,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      const { created, updated, skipped } = result.data
      toast.success(`Imported ${pluralize(created + updated, "variable")}`, {
        description: [
          created ? `${created} added` : null,
          updated ? `${updated} updated` : null,
          skipped ? `${skipped} skipped` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })
      close()
    })
  }

  const existingCount = preview?.keys.filter((entry) => entry.exists).length ?? 0
  const selectedCount = selected.size
  const willSkip = preview
    ? preview.keys.filter((e) => e.exists && selected.has(e.key) && !overwrite).length
    : 0
  const toImport = selectedCount - willSkip

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (next) onOpenChange(true)
        else close()
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Paste .env</DialogTitle>
          <DialogDescription>
            Copy everything from your local <code className="font-mono">.env</code>{" "}
            and paste it here to add all variables to{" "}
            <span className="text-foreground">{projectName}</span> at once. Only
            variable names are shown back to you.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="min-w-0 space-y-2">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value)
                if (error) setError(null)
              }}
              onPaste={(event) => {
                // A whole file pasted into the empty box is previewed straight
                // away. The text is set here rather than by the browser so it
                // can't be lost when the box turns read-only during the preview.
                const pasted = event.clipboardData.getData("text")
                if (content || !pasted.includes("=")) return
                event.preventDefault()
                setContent(pasted)
                analyse(pasted)
              }}
              placeholder={PLACEHOLDER}
              rows={8}
              readOnly={pending}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              aria-label=".env contents"
              className={cn(
                "scrollbar-thin max-h-72 min-h-40 resize-y font-mono text-[13px] break-all",
                content && "text-security"
              )}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {pending ? (
                <>
                  <Spinner className="size-3.5" /> Reading variables…
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5" />
                  What you paste stays hidden. Comments and blank lines are ignored.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>{pluralize(preview.keys.length, "variable")} found.</span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() =>
                    setSelected(
                      selectedCount === preview.keys.length
                        ? new Set()
                        : new Set(preview.keys.map((entry) => entry.key))
                    )
                  }
                >
                  {selectedCount === preview.keys.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <ul className="scrollbar-thin max-h-60 divide-y overflow-y-auto">
                {preview.keys.map((entry) => {
                  const checked = selected.has(entry.key)
                  return (
                    <li key={entry.key}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/30">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setSelected((current) => {
                              const next = new Set(current)
                              if (value) next.add(entry.key)
                              else next.delete(entry.key)
                              return next
                            })
                          }
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate font-mono text-[13px]",
                            !checked && "text-muted-foreground line-through decoration-muted-foreground/50"
                          )}
                        >
                          {entry.key}
                        </span>
                        {entry.exists ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[11px]",
                              overwrite ? "border-warning/40 text-warning" : "text-muted-foreground"
                            )}
                          >
                            {overwrite ? "Overwrite" : "Exists · skip"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 border-brand/30 text-[11px] text-brand">
                            New
                          </Badge>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>

            {preview.invalidKeys.length > 0 ? (
              <p className="flex items-start gap-2 text-xs text-warning">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                <span>
                  Skipping invalid names:{" "}
                  <span className="font-mono">{preview.invalidKeys.join(", ")}</span>
                </span>
              </p>
            ) : null}
            {preview.duplicateKeys.length > 0 ? (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <CircleAlert className="mt-px size-3.5 shrink-0" />
                <span>
                  Defined more than once (last value wins):{" "}
                  <span className="font-mono">{preview.duplicateKeys.join(", ")}</span>
                </span>
              </p>
            ) : null}

            {existingCount > 0 ? (
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <Label htmlFor="overwrite" className="flex-col items-start gap-0.5">
                  <span className="flex items-center gap-1.5 text-sm">
                    <RefreshCw className="size-3.5" />
                    Overwrite existing variables
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {pluralize(existingCount, "variable")} already{" "}
                    {existingCount === 1 ? "exists" : "exist"} in this project
                  </span>
                </Label>
                <Switch id="overwrite" checked={overwrite} onCheckedChange={setOverwrite} />
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              className="sm:mr-auto"
              onClick={() => {
                setPreview(null)
                setError(null)
              }}
              disabled={pending}
            >
              <ArrowLeft />
              Edit paste
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          {preview ? (
            <Button
              type="button"
              onClick={confirmImport}
              disabled={pending || toImport === 0}
            >
              {pending ? <Spinner /> : null}
              Import Variables{toImport > 0 ? ` (${toImport})` : null}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => analyse(content)}
              disabled={pending || !content.trim()}
            >
              {pending ? <Spinner /> : <ClipboardPaste />}
              Find variables
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

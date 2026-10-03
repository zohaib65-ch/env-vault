"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { deleteProject } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { pluralize } from "@/lib/format"

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: { id: string; name: string; variableCount: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [confirmName, setConfirmName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await deleteProject({ projectId: project.id, confirmName })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      onOpenChange(false)
      toast.success(`${project.name} deleted`)
      router.replace("/projects")
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        setConfirmName("")
        setError(null)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <span className="mb-1 flex size-10 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </span>
            <DialogTitle>Delete {project.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the project and its{" "}
              {pluralize(project.variableCount, "encrypted variable")}. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="confirm-project-name">
              Type <span className="font-mono text-foreground">{project.name}</span> to confirm
            </FieldLabel>
            <Input
              id="confirm-project-name"
              value={confirmName}
              onChange={(event) => {
                setConfirmName(event.target.value)
                setError(null)
              }}
              autoComplete="off"
              autoFocus
              aria-invalid={Boolean(error)}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || confirmName.trim() !== project.name}
            >
              {pending ? <Spinner /> : null}
              Delete project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

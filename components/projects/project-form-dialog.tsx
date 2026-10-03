"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { createProject, updateProject } from "@/app/actions/projects"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type ProjectFormDialogProps = {
  trigger?: React.ReactNode
  project?: { id: string; name: string; description: string }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProjectFormDialog({
  trigger,
  project,
  open: controlledOpen,
  onOpenChange,
}: ProjectFormDialogProps) {
  const router = useRouter()
  const editing = Boolean(project)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const [pending, startTransition] = useTransition()

  function reset() {
    setName(project?.name ?? "")
    setDescription(project?.description ?? "")
    setErrors({})
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = project
        ? await updateProject({ projectId: project.id, name, description })
        : await createProject({ name, description })

      if (!result.ok) {
        const fieldErrors =
          result.error.code === "VALIDATION" ? result.error.fieldErrors : undefined
        setErrors(fieldErrors ?? {})
        if (!fieldErrors) toast.error(result.error.message)
        return
      }

      setOpen(false)
      if (project) {
        toast.success("Project updated")
      } else if (result.data) {
        toast.success(`${name.trim()} created`, {
          description: "Add your first environment variables.",
        })
        router.push(`/projects/${result.data.id}`)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (next) reset()
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Create project"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Rename the project or update its description."
                : "A project holds the environment variables for one of your apps."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Next Project"
                maxLength={64}
                autoFocus
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError>{errors.name?.[0]}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Production keys for the marketing site"
                maxLength={280}
                rows={3}
                className="resize-none"
                aria-invalid={Boolean(errors.description)}
              />
              <FieldDescription>Optional · {280 - description.length} characters left</FieldDescription>
              <FieldError>{errors.description?.[0]}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Spinner /> : null}
              {editing ? "Save changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

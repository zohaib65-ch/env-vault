"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Download,
  Ellipsis,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { exportEnv } from "@/app/actions/variables"
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog"
import { ProjectAvatar } from "@/components/projects/project-avatar"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { usePasscode } from "@/components/shared/passcode-provider"
import { TimeAgo } from "@/components/shared/time-ago"
import { PasteEnvDialog } from "@/components/variables/paste-env-dialog"
import { VariableFormDialog } from "@/components/variables/variable-form-dialog"
import { VariablesTable } from "@/components/variables/variables-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { copySecretFromServer, downloadTextFile } from "@/lib/client-secrets"
import { formatDate, pluralize } from "@/lib/format"
import type { ProjectSummary, VariableItem } from "@/lib/types"

export function ProjectWorkspace({
  project,
  variables,
  highlightKey,
}: {
  project: ProjectSummary
  variables: VariableItem[]
  highlightKey?: string
}) {
  const { requestPasscode } = usePasscode()
  const [variableDialog, setVariableDialog] = useState<{
    open: boolean
    variable: VariableItem | null
    key: number
  }>({ open: false, variable: null, key: 0 })
  const [pasteOpen, setPasteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function openVariableDialog(variable: VariableItem | null) {
    setVariableDialog((state) => ({ open: true, variable, key: state.key + 1 }))
  }

  async function copyAll() {
    const data = await requestPasscode({
      title: "Copy all variables",
      description: (
        <>
          Confirm it&apos;s you to copy all{" "}
          {pluralize(variables.length, "variable")} from{" "}
          <span className="text-foreground">{project.name}</span> to your clipboard.
        </>
      ),
      confirmLabel: "Copy all",
      run: (unlock) =>
        copySecretFromServer(() =>
          unlock.then(async (proof) => {
            const result = await exportEnv({
              projectId: project.id,
              unlock: proof,
              mode: "clipboard",
            })
            return result.ok ? { ok: true, data: { value: result.data.content } } : result
          })
        ),
    })
    if (data) {
      toast.success(`${pluralize(variables.length, "variable")} copied`, {
        description: "Paste them into the .env file in your project.",
      })
    }
  }

  async function downloadFile() {
    const data = await requestPasscode({
      title: "Download .env",
      description: (
        <>
          Confirm it&apos;s you to download{" "}
          {pluralize(variables.length, "variable")} from{" "}
          <span className="text-foreground">{project.name}</span> as a file.
        </>
      ),
      confirmLabel: "Download",
      run: (unlock) =>
        unlock.then((proof) => exportEnv({ projectId: project.id, unlock: proof })),
    })
    if (data) {
      downloadTextFile(data.fileName, data.content)
      toast.success(".env downloaded", {
        description: `${pluralize(data.count, "variable")} saved to ${data.fileName}.`,
      })
    }
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{project.name}</span>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <ProjectAvatar name={project.name} className="size-12 text-base" shuffle />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
            {project.description ? (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{pluralize(variables.length, "variable")}</span>
              <span aria-hidden>·</span>
              <TimeAgo date={project.updatedAt} prefix="Updated" />
              <span aria-hidden>·</span>
              <span>Created {formatDate(project.createdAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste />
            Paste .env
          </Button>
          <Button variant="outline" onClick={copyAll} disabled={variables.length === 0}>
            <ClipboardCopy />
            Copy all
          </Button>
          <Button onClick={() => openVariableDialog(null)}>
            <Plus />
            Add Variable
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Project options">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={downloadFile}
                disabled={variables.length === 0}
              >
                <Download />
                Download .env file
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-brand/15 bg-brand/[0.04] px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-muted-foreground">
          <span className="text-foreground">Values are hidden by default.</span>{" "}
          Revealing, copying or exporting a secret requires your security passcode
          and is logged.
        </p>
      </div>

      <VariablesTable
        key={highlightKey ?? "all"}
        variables={variables}
        highlightKey={highlightKey}
        onAdd={() => openVariableDialog(null)}
        onPaste={() => setPasteOpen(true)}
        onEdit={(variable) => openVariableDialog(variable)}
      />

      <VariableFormDialog
        key={variableDialog.key}
        open={variableDialog.open}
        onOpenChange={(open) => setVariableDialog((state) => ({ ...state, open }))}
        projectId={project.id}
        variable={variableDialog.variable}
      />
      <PasteEnvDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        projectId={project.id}
        projectName={project.name}
      />
      <ProjectFormDialog
        key={`${project.name}-${project.description}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}

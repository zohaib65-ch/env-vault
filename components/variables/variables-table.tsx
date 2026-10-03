"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  Copy,
  Ellipsis,
  Eye,
  EyeOff,
  ClipboardPaste,
  KeyRound,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { accessSecret, deleteVariable } from "@/app/actions/variables"
import { usePasscode } from "@/components/shared/passcode-provider"
import { TimeAgo } from "@/components/shared/time-ago"
import { MaskedValue } from "@/components/variables/masked-value"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { copySecretFromServer } from "@/lib/client-secrets"
import type { VariableItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const REVEAL_SECONDS = 30

type Revealed = Record<string, { value: string; hideAt: number }>

function revealDeadline() {
  return Date.now() + REVEAL_SECONDS * 1000
}

function IconAction({
  label,
  onClick,
  children,
  className,
  disabled,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          aria-label={label}
          disabled={disabled}
          className={cn("text-muted-foreground hover:text-foreground", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function VariablesTable({
  variables,
  highlightKey,
  onAdd,
  onPaste,
  onEdit,
}: {
  variables: VariableItem[]
  highlightKey?: string
  onAdd: () => void
  onPaste: () => void
  onEdit: (variable: VariableItem) => void
}) {
  const { requestPasscode } = usePasscode()
  const [query, setQuery] = useState("")
  const [revealed, setRevealed] = useState<Revealed>({})
  const [now, setNow] = useState(() => Date.now())
  const [toDelete, setToDelete] = useState<VariableItem | null>(null)
  const [deleting, startDelete] = useTransition()
  const [flashKey, setFlashKey] = useState(highlightKey)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())

  const hasRevealed = Object.keys(revealed).length > 0

  // Revealed values disappear after REVEAL_SECONDS or when the tab is hidden.
  useEffect(() => {
    if (!hasRevealed) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      setRevealed((previous) => {
        const next = Object.fromEntries(
          Object.entries(previous).filter(([, entry]) => entry.hideAt > current)
        )
        return Object.keys(next).length === Object.keys(previous).length ? previous : next
      })
    }, 1000)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setRevealed({})
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [hasRevealed])

  // Scroll to and briefly highlight a variable opened from search.
  useEffect(() => {
    if (!highlightKey) return
    const target = variables.find((v) => v.key === highlightKey)
    if (!target) return
    rowRefs.current.get(target.id)?.scrollIntoView({ block: "center", behavior: "smooth" })
    const timer = setTimeout(() => setFlashKey(undefined), 2400)
    return () => clearTimeout(timer)
  }, [highlightKey, variables])

  const term = query.trim().toLowerCase()
  const filtered = term
    ? variables.filter((variable) => variable.key.toLowerCase().includes(term))
    : variables

  async function reveal(variable: VariableItem) {
    const data = await requestPasscode({
      description: (
        <>
          Enter your security passcode to reveal{" "}
          <code className="font-mono text-foreground">{variable.key}</code>.
        </>
      ),
      confirmLabel: "Reveal",
      run: (passcode) =>
        accessSecret({ variableId: variable.id, passcode, purpose: "reveal" }),
    })
    if (data) {
      const hideAt = revealDeadline()
      setNow(hideAt - REVEAL_SECONDS * 1000)
      setRevealed((previous) => ({ ...previous, [variable.id]: { value: data.value, hideAt } }))
    }
  }

  function hide(variable: VariableItem) {
    setRevealed((previous) => {
      const next = { ...previous }
      delete next[variable.id]
      return next
    })
  }

  async function copy(variable: VariableItem) {
    const data = await requestPasscode({
      description: (
        <>
          Enter your security passcode to copy{" "}
          <code className="font-mono text-foreground">{variable.key}</code> to your
          clipboard.
        </>
      ),
      confirmLabel: "Copy",
      run: (passcode) =>
        copySecretFromServer(() =>
          accessSecret({ variableId: variable.id, passcode, purpose: "copy" })
        ),
    })
    if (data) {
      toast.success("Secret copied to clipboard", {
        description: `${variable.key} is ready to paste into your local .env`,
      })
    }
  }

  function confirmDelete() {
    const variable = toDelete
    if (!variable) return
    startDelete(async () => {
      const result = await deleteVariable({ variableId: variable.id })
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      hide(variable)
      setToDelete(null)
      toast.success(`${variable.key} deleted`)
    })
  }

  if (variables.length === 0) {
    return (
      <Empty className="rounded-xl border bg-card/40 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-xl text-brand">
            <KeyRound className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-base">No variables yet</EmptyTitle>
          <EmptyDescription>
            Add variables one by one, or paste your whole{" "}
            <code className="font-mono">.env</code> at once. Values are encrypted
            before they are stored.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={onAdd}>
            <Plus />
            Add Variable
          </Button>
          <Button variant="outline" onClick={onPaste}>
            <ClipboardPaste />
            Paste .env
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Environment Variables</h2>
          <Badge variant="secondary" className="tabular-nums">
            {variables.length}
          </Badge>
        </div>
        <InputGroup className="h-8 sm:max-w-64">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name…"
            aria-label="Filter variables by name"
            className="font-mono text-[13px] placeholder:font-sans"
          />
        </InputGroup>
      </div>

      {filtered.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No matching variables</EmptyTitle>
            <EmptyDescription>
              No variable names contain “{query.trim()}”.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[42%] pl-4 sm:w-[34%]">Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="hidden w-36 lg:table-cell">Updated</TableHead>
              <TableHead className="w-12 pr-4 text-right sm:w-44">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((variable) => {
              const shown = revealed[variable.id]
              const secondsLeft = shown
                ? Math.max(0, Math.ceil((shown.hideAt - now) / 1000))
                : 0
              return (
                <TableRow
                  key={variable.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(variable.id, node)
                    else rowRefs.current.delete(variable.id)
                  }}
                  className={cn(
                    "group transition-colors",
                    flashKey === variable.key && "bg-brand/10 hover:bg-brand/10"
                  )}
                >
                  <TableCell className="pl-4 align-top">
                    <div className="flex min-h-7 items-center">
                      <span className="truncate font-mono text-[13px] font-medium" title={variable.key}>
                        {variable.key}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {shown ? (
                      <div className="animate-in fade-in flex min-h-7 items-start gap-2 duration-200">
                        <code className="scrollbar-thin max-h-24 min-w-0 flex-1 overflow-y-auto rounded-md border border-brand/20 bg-brand/5 px-2 py-1 font-mono text-[12.5px] break-all whitespace-pre-wrap text-foreground">
                          {shown.value || <span className="text-muted-foreground italic">empty</span>}
                        </code>
                        <span
                          className="mt-1.5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums"
                          aria-label={`Hides in ${secondsLeft} seconds`}
                        >
                          {secondsLeft}s
                        </span>
                      </div>
                    ) : (
                      <div className="flex min-h-7 items-center">
                        <MaskedValue seed={variable.id} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden align-top text-xs text-muted-foreground lg:table-cell">
                    <div className="flex min-h-7 items-center">
                      <TimeAgo date={variable.updatedAt} />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 align-top">
                    <div className="hidden items-center justify-end gap-0.5 sm:flex">
                      {shown ? (
                        <IconAction label="Hide" onClick={() => hide(variable)}>
                          <EyeOff />
                        </IconAction>
                      ) : (
                        <IconAction label="Reveal" onClick={() => reveal(variable)}>
                          <Eye />
                        </IconAction>
                      )}
                      <IconAction label="Copy" onClick={() => copy(variable)}>
                        <Copy />
                      </IconAction>
                      <IconAction label="Edit" onClick={() => onEdit(variable)}>
                        <Pencil />
                      </IconAction>
                      <IconAction
                        label="Delete"
                        onClick={() => setToDelete(variable)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </IconAction>
                    </div>
                    <div className="flex justify-end sm:hidden">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${variable.key}`}
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {shown ? (
                            <DropdownMenuItem onSelect={() => hide(variable)}>
                              <EyeOff />
                              Hide
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => reveal(variable)}>
                              <Eye />
                              Reveal
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => copy(variable)}>
                            <Copy />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onEdit(variable)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setToDelete(variable)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete {toDelete?.key}?</AlertDialogTitle>
            <AlertDialogDescription>
              The encrypted value will be permanently removed from this project.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                confirmDelete()
              }}
            >
              {deleting ? <Spinner /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

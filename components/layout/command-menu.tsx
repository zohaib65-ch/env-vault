"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  FolderKanban,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import type { SearchResults } from "@/lib/types"

const PAGES = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Settings", href: "/settings", icon: Settings },
]

const EMPTY: SearchResults = { projects: [], variables: [] }

export function CommandMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (!term) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        if (response.status === 401) {
          router.replace("/login")
          return
        }
        if (response.ok) setResults(await response.json())
      } catch {
        // Aborted or offline — keep the previous results.
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 150)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, router])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  const hasQuery = query.trim().length > 0
  const visible = hasQuery ? results : EMPTY
  const pages = PAGES.filter((page) =>
    page.title.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-8 w-full max-w-sm justify-start gap-2 bg-muted/40 px-2.5 font-normal text-muted-foreground shadow-none hover:text-foreground"
      >
        <Search className="size-4" />
        <span className="truncate">
          <span className="hidden sm:inline">Search projects and variables…</span>
          <span className="sm:hidden">Search…</span>
        </span>
        <KbdGroup className="ml-auto hidden sm:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setQuery("")
            setResults(EMPTY)
          }
        }}
        title="Search ENV Vault"
        description="Search projects and variable names"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search projects or variable names, e.g. mongo"
          />
          <CommandList className="scrollbar-thin max-h-[min(420px,60vh)]">
            {hasQuery && !loading ? (
              <CommandEmpty>
                No projects or variables match “{query.trim()}”.
              </CommandEmpty>
            ) : null}
            {loading && visible.projects.length + visible.variables.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner /> Searching…
              </div>
            ) : null}

            {visible.variables.length > 0 ? (
              <CommandGroup heading="Variables">
                {visible.variables.map((variable) => (
                  <CommandItem
                    key={variable.id}
                    value={`variable-${variable.id}`}
                    onSelect={() =>
                      go(
                        `/projects/${variable.projectId}?key=${encodeURIComponent(variable.key)}`
                      )
                    }
                  >
                    <KeyRound className="text-brand" />
                    <span className="truncate font-mono text-[13px]">{variable.key}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {variable.projectName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {visible.projects.length > 0 ? (
              <CommandGroup heading="Projects">
                {visible.projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => go(`/projects/${project.id}`)}
                  >
                    <FolderOpen />
                    <span className="truncate">{project.name}</span>
                    {project.description ? (
                      <span className="ml-auto max-w-[45%] truncate text-xs text-muted-foreground">
                        {project.description}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {pages.length > 0 ? (
              <CommandGroup heading="Go to">
                {pages.map((page) => (
                  <CommandItem
                    key={page.href}
                    value={`page-${page.href}`}
                    onSelect={() => go(page.href)}
                  >
                    <page.icon />
                    {page.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
          <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> close
            </span>
            <span className="ml-auto">Values are never searched</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}

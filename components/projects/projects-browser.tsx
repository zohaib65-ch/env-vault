"use client"

import { useDeferredValue, useState } from "react"
import { FolderPlus, Plus, Search, SearchX } from "lucide-react"

import { ProjectCard } from "@/components/projects/project-card"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { Button } from "@/components/ui/button"
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
import type { ProjectSummary } from "@/lib/types"

export function ProjectsBrowser({ projects }: { projects: ProjectSummary[] }) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const term = deferredQuery.trim().toLowerCase()
  const filtered = term
    ? projects.filter(
        (project) =>
          project.name.toLowerCase().includes(term) ||
          project.description.toLowerCase().includes(term)
      )
    : projects

  if (projects.length === 0) {
    return (
      <Empty className="border bg-card/40 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-xl text-brand">
            <FolderPlus className="size-5" />
          </EmptyMedia>
          <EmptyTitle className="text-base">No projects yet</EmptyTitle>
          <EmptyDescription>
            Projects group the environment variables for each app — for example
            “My Portfolio”, “E-commerce App” or “Backend API”.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ProjectFormDialog
            trigger={
              <Button>
                <Plus />
                Create your first project
              </Button>
            }
          />
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-5">
      <InputGroup className="h-9 max-w-sm bg-card">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter projects…"
          aria-label="Filter projects"
        />
      </InputGroup>

      {filtered.length === 0 ? (
        <Empty className="border bg-card/40 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No matching projects</EmptyTitle>
            <EmptyDescription>Nothing matches “{query.trim()}”.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {!term ? (
            <ProjectFormDialog
              trigger={
                <button
                  type="button"
                  className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-white/20 hover:bg-card/60 hover:text-foreground"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl border bg-card">
                    <Plus className="size-4" />
                  </span>
                  New project
                </button>
              }
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

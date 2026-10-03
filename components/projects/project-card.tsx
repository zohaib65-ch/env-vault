import Link from "next/link"
import { ArrowRight, Clock, KeyRound } from "lucide-react"

import { ProjectAvatar } from "@/components/projects/project-avatar"
import { TimeAgo } from "@/components/shared/time-ago"
import { pluralize } from "@/lib/format"
import type { ProjectSummary } from "@/lib/types"

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="group relative flex flex-col rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[color-mix(in_oklch,var(--card),white_2%)] hover:shadow-xl hover:shadow-black/30">
      <div className="flex items-start gap-3.5">
        <ProjectAvatar name={project.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">
            <Link
              href={`/projects/${project.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {project.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {project.description || "No description"}
          </p>
        </div>
      </div>

      <dl className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <KeyRound className="size-3.5 text-brand" />
          <dt className="sr-only">Variables</dt>
          <dd className="text-foreground/90">
            {pluralize(project.variableCount, "Environment Variable")}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <dt className="sr-only">Last updated</dt>
          <dd>
            <TimeAgo date={project.updatedAt} prefix="Updated" className="relative z-10" />
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
        <span className="font-medium text-foreground/90">Open project</span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </article>
  )
}

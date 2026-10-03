import type { Metadata } from "next"
import { Plus } from "lucide-react"

import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { ProjectsBrowser } from "@/components/projects/projects-browser"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/dal/auth"
import { listProjects } from "@/lib/dal/projects"
import { pluralize } from "@/lib/format"

export const metadata: Metadata = { title: "Projects" }

export default async function ProjectsPage() {
  const user = await requireUser()
  const projects = await listProjects(user.id)
  const variableTotal = projects.reduce((sum, p) => sum + p.variableCount, 0)

  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      <PageHeader
        title="Projects"
        description={
          projects.length
            ? `${pluralize(projects.length, "project")} · ${pluralize(variableTotal, "encrypted variable")}`
            : "Organise environment variables by the app they belong to."
        }
        actions={
          <ProjectFormDialog
            trigger={
              <Button>
                <Plus />
                New Project
              </Button>
            }
          />
        }
      />
      <ProjectsBrowser projects={projects} />
    </div>
  )
}

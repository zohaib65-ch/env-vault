import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProjectWorkspace } from "@/components/projects/project-workspace"
import { requireUser } from "@/lib/dal/auth"
import { getOwnedProject, getProjectDetail } from "@/lib/dal/projects"

export async function generateMetadata(
  props: PageProps<"/projects/[projectId]">
): Promise<Metadata> {
  const user = await requireUser()
  const { projectId } = await props.params
  const project = await getOwnedProject(user.id, projectId)
  return { title: project?.name ?? "Project not found" }
}

export default async function ProjectPage(props: PageProps<"/projects/[projectId]">) {
  const user = await requireUser()
  const [{ projectId }, { key }] = await Promise.all([props.params, props.searchParams])

  const detail = await getProjectDetail(user.id, projectId)
  if (!detail) notFound()

  return (
    <ProjectWorkspace
      project={detail.project}
      variables={detail.variables}
      highlightKey={typeof key === "string" ? key : undefined}
    />
  )
}

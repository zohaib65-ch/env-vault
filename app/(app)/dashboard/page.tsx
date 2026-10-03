import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Clock,
  Eye,
  FolderKanban,
  KeyRound,
  Plus,
  Sparkles,
} from "lucide-react"

import { ProjectCard } from "@/components/projects/project-card"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { requireUser } from "@/lib/dal/auth"
import { getDashboardData } from "@/lib/dal/projects"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const user = await requireUser()
  const data = await getDashboardData(user.id)
  const firstName = user.name.split(" ")[0]

  const newProjectButton = (
    <ProjectFormDialog
      trigger={
        <Button>
          <Plus />
          New Project
        </Button>
      }
    />
  )

  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Everything in your vault, encrypted and in sync across your devices."
        actions={newProjectButton}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={data.totalProjects}
          hint="Across your whole vault"
          icon={FolderKanban}
        />
        <StatCard
          label="Environment Variables"
          value={data.totalVariables}
          hint="Encrypted with AES-256-GCM"
          icon={KeyRound}
          accent
        />
        <StatCard
          label="Recently Updated"
          value={data.updatedThisWeek}
          hint="Projects changed in the last 7 days"
          icon={Clock}
        />
        <StatCard
          label="Secrets Accessed"
          value={data.secretAccess}
          hint="Reveals, copies & exports this week"
          icon={Eye}
        />
      </section>

      {data.totalProjects === 0 ? (
        <Empty className="border bg-card/40 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-xl text-brand">
              <Sparkles className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="text-base">Your vault is empty</EmptyTitle>
            <EmptyDescription>
              Create a project for each app you work on, then add or import its
              environment variables.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newProjectButton}</EmptyContent>
        </Empty>
      ) : (
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Recently updated projects</h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/projects">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

import Link from "next/link"
import { ArrowLeft, FolderX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function ProjectNotFound() {
  return (
    <Empty className="mt-10 border bg-card/40 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl">
          <FolderX className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-base">Project not found</EmptyTitle>
        <EmptyDescription>
          It may have been deleted, or it doesn&apos;t belong to your vault.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" asChild>
          <Link href="/projects">
            <ArrowLeft />
            Back to projects
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

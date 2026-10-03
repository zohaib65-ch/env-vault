import { HeaderSkeleton, ProjectCardSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <div className="space-y-5">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

import {
  HeaderSkeleton,
  ProjectCardSkeleton,
  StatSkeleton,
} from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}

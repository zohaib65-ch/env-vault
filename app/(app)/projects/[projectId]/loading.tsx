import { VariablesTableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <VariablesTableSkeleton />
    </div>
  )
}

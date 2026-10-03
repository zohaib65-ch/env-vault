import { Skeleton } from "@/components/ui/skeleton"

export function HeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {withAction ? <Skeleton className="h-8 w-32" /> : null}
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3.5">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <div className="mt-5 flex gap-4">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="mt-5 border-t pt-4">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-36" />
    </div>
  )
}

export function VariablesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-56" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-0">
          <Skeleton className="h-4 w-[28%]" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-20 lg:block" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  )
}

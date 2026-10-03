import { HeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton withAction={false} />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid gap-6 rounded-xl border bg-card p-6 lg:grid-cols-[260px_1fr] lg:gap-10"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

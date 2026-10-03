import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5">
      {accent ? (
        <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-brand/10 blur-2xl" />
      ) : null}
      <div className="relative flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg border bg-background/60",
            accent ? "text-brand" : "text-muted-foreground"
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="relative mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString("en")}
      </p>
      <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

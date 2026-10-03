import { cn } from "@/lib/utils"

function hueFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 360
}

/** Deterministic colour tile so each project is recognisable at a glance. */
export function ProjectAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hue = hueFor(name)
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold",
        className
      )}
      style={{
        backgroundColor: `oklch(0.27 0.06 ${hue})`,
        borderColor: `oklch(0.42 0.08 ${hue} / 0.6)`,
        color: `oklch(0.88 0.11 ${hue})`,
      }}
    >
      {initials || "#"}
    </span>
  )
}

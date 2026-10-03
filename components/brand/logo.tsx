import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-linear-to-br from-emerald-300 to-teal-500 shadow-[0_0_28px_-6px] shadow-emerald-400/50 ring-1 ring-white/25 ring-inset",
        className
      )}
    >
      <svg viewBox="0 0 64 64" className="size-[62%]" fill="none">
        <g
          stroke="#062a22"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="14" y="28" width="36" height="25" rx="7" />
          <path d="M22 28v-6a10 10 0 0 1 20 0v6" />
        </g>
        <circle cx="32" cy="39" r="4" fill="#062a22" />
        <path d="M32 41v5" stroke="#062a22" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="text-[15px] font-semibold tracking-tight">
        ENV <span className="text-muted-foreground">Vault</span>
      </span>
    </span>
  )
}

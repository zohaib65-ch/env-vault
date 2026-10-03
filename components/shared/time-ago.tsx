"use client"

import { useEffect, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDateTime, timeAgo } from "@/lib/format"

export function TimeAgo({
  date,
  prefix,
  className,
}: {
  date: string
  prefix?: string
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date} className={className} suppressHydrationWarning>
          {prefix ? `${prefix} ` : null}
          {timeAgo(date, now)}
        </time>
      </TooltipTrigger>
      <TooltipContent suppressHydrationWarning>{formatDateTime(date)}</TooltipContent>
    </Tooltip>
  )
}

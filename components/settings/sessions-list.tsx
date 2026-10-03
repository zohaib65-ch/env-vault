"use client"

import { useTransition } from "react"
import { Laptop, MonitorSmartphone, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { revokeOtherSessions, revokeSession } from "@/app/actions/auth"
import { TimeAgo } from "@/components/shared/time-ago"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { pluralize } from "@/lib/format"
import type { SessionItem } from "@/lib/types"

function DeviceIcon({ device }: { device: string }) {
  if (/iOS|Android/.test(device)) return <Smartphone className="size-4" />
  if (/macOS|Windows|Linux|ChromeOS/.test(device)) return <Laptop className="size-4" />
  return <MonitorSmartphone className="size-4" />
}

export function SessionsList({ sessions }: { sessions: SessionItem[] }) {
  const [pending, startTransition] = useTransition()
  const others = sessions.filter((session) => !session.current)

  function revoke(session: SessionItem) {
    startTransition(async () => {
      const result = await revokeSession({ sessionId: session.id })
      if (result.ok) toast.success(`Signed out ${session.device}`)
      else toast.error(result.error.message)
    })
  }

  function revokeOthers() {
    startTransition(async () => {
      const result = await revokeOtherSessions()
      if (result.ok) {
        toast.success(`Signed out ${pluralize(result.data.count, "other session")}`)
      } else {
        toast.error(result.error.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <DeviceIcon device={session.device} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{session.device}</p>
                {session.current ? (
                  <Badge variant="outline" className="border-brand/30 text-[11px] text-brand">
                    This device
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {session.ip ? `${session.ip} · ` : null}
                {session.current ? (
                  "Active now"
                ) : (
                  <TimeAgo date={session.lastSeenAt} prefix="Last active" />
                )}
              </p>
            </div>
            {session.current ? null : (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => revoke(session)}
                className="text-muted-foreground hover:text-destructive"
              >
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 ? (
        <Button variant="outline" size="sm" onClick={revokeOthers} disabled={pending}>
          {pending ? <Spinner /> : null}
          Sign out of all other devices
        </Button>
      ) : null}
    </div>
  )
}

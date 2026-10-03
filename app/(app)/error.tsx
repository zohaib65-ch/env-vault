"use client"

import { RotateCw, ServerCrash } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <Empty className="mt-10 border border-destructive/20 bg-destructive/[0.03] py-16">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-xl bg-destructive/10 text-destructive"
        >
          <ServerCrash className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-base">Something went wrong</EmptyTitle>
        <EmptyDescription>
          We couldn&apos;t load this page. Your secrets are safe — nothing was
          changed.
          {error.digest ? (
            <span className="mt-2 block font-mono text-xs text-muted-foreground/70">
              Reference: {error.digest}
            </span>
          ) : null}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCw />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}

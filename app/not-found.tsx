import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden px-4 text-center">
      <div className="bg-grid mask-radial-fade pointer-events-none absolute inset-0 opacity-60" />
      <LogoMark className="relative size-10 rounded-xl" />
      <div className="relative space-y-2">
        <p className="font-mono text-sm text-brand">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This page doesn&apos;t exist in your vault.
        </p>
      </div>
      <Button variant="outline" asChild className="relative">
        <Link href="/dashboard">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>
    </main>
  )
}

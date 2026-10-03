import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Fingerprint, KeyRound, ShieldCheck } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import { SetupPasscodeForm } from "@/components/settings/setup-passcode-form"
import { requireUser } from "@/lib/dal/auth"
import { hasPasscode } from "@/lib/dal/security"

export const metadata: Metadata = { title: "Create your passcode" }

export default async function SetupPage() {
  const user = await requireUser()
  if (await hasPasscode(user.id)) redirect("/dashboard")

  const firstName = user.name.split(" ")[0] || "there"

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-grid mask-radial-fade pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute top-[-20%] left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.155_163/0.14),transparent)]" />

      <div className="animate-in fade-in slide-in-from-bottom-2 relative w-full max-w-md duration-500">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LogoMark className="size-6 rounded-md" />
          <span>Step 2 of 2 · Secure your vault</span>
        </div>

        <div className="mt-5 rounded-2xl border bg-card/90 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-brand">
            <Fingerprint className="size-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            Welcome, {firstName}. Create your 4-digit security passcode.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This passcode is separate from your Google password. You&apos;ll enter
            it every time you reveal, copy or export a secret.
          </p>

          <SetupPasscodeForm />
        </div>

        <ul className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-brand" />
            Stored only as a peppered scrypt hash, never in plain text.
          </li>
          <li className="flex items-start gap-2">
            <KeyRound className="mt-px size-3.5 shrink-0 text-brand" />
            5 wrong attempts lock it and sign out every device.
          </li>
        </ul>
      </div>
    </main>
  )
}

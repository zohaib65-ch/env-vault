import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  CircleAlert,
  FileKey2,
  Wrench,
  LaptopMinimal,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

import { GoogleIcon } from "@/components/brand/google-icon"
import { LogoMark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { ConfigError } from "@/lib/env"

export const metadata: Metadata = { title: "Sign in" }

const ERRORS: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  state_mismatch: "Your sign-in attempt expired. Please try again.",
  oauth_failed: "We couldn't verify your Google account. Please try again.",
  not_allowed: "This Google account isn't allowed to open this vault.",
  config: "ENV Vault isn't configured yet. Check the server environment variables.",
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Encrypted at rest",
    body: "Every value is sealed with AES-256-GCM before it reaches the database.",
  },
  {
    icon: LockKeyhole,
    title: "Passcode-gated secrets",
    body: "Reveal, copy and export require a separate security passcode.",
  },
  {
    icon: LaptopMinimal,
    title: "Every laptop, one vault",
    body: "Sign in anywhere with Google and pull the exact variables you need.",
  },
]

const PREVIEW_KEYS = [
  ["MONGODB_URI", "mongodb+srv://cluster0.x8f2"],
  ["NEXTAUTH_SECRET", "q8Zt1vLx0bA7wPmE4kS"],
  ["GOOGLE_CLIENT_ID", "7718209431-0h3kq.apps"],
  ["STRIPE_SECRET_KEY", "sk_live_51Hc9aK2eZvKY"],
  ["API_KEY", "c4a1f09e7b2d4f61"],
]

export default async function LoginPage(props: PageProps<"/login">) {
  let signedIn = false
  let configProblems: string[] | null = null
  try {
    signedIn = Boolean(await getCurrentUser())
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error
    configProblems = error.problems
  }
  if (signedIn) redirect("/dashboard")

  const { error } = await props.searchParams
  const message = typeof error === "string" ? ERRORS[error] : undefined

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="bg-grid mask-radial-fade pointer-events-none absolute inset-0 opacity-80" />
      <div className="pointer-events-none absolute top-[-18%] left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.155_163/0.16),transparent)]" />

      <div className="relative grid w-full max-w-5xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="animate-in fade-in slide-in-from-bottom-2 mx-auto w-full max-w-sm duration-500 lg:mx-0">
          <LogoMark className="size-11 rounded-xl" />

          <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-[2.75rem]">
            ENV Vault
          </h1>
          <p className="mt-3 text-base text-pretty text-muted-foreground">
            Securely manage your environment variables from anywhere.
          </p>

          {configProblems ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm"
            >
              <p className="flex items-center gap-2 font-medium text-warning">
                <Wrench className="size-4" />
                Finish setting up ENV Vault
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-foreground/80">
                {configProblems.map((problem) => (
                  <li key={problem}>· {problem}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Fix them in <code className="font-mono">.env</code> or{" "}
                <code className="font-mono">.env.local</code> (see{" "}
                <code className="font-mono">.env.example</code>), then reload this page.
              </p>
            </div>
          ) : null}

          {message ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {message}
            </div>
          ) : null}

          <Button
            asChild
            size="lg"
            className="mt-8 h-11 w-full gap-3 rounded-xl text-[15px] shadow-[0_8px_30px_-12px] shadow-white/25"
          >
            <a href="/api/auth/google">
              <GoogleIcon className="size-[18px]" />
              Continue with Google
            </a>
          </Button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your Google password is never shared with ENV Vault.
          </p>

          <ul className="mt-10 space-y-5 border-t pt-8">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-brand">
                  <feature.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-hidden
          className="animate-in fade-in slide-in-from-bottom-4 relative hidden duration-700 lg:block"
        >
          <div className="rounded-2xl border bg-card/80 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="ml-3 flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                <FileKey2 className="size-3.5 text-brand" />
                my-next-project / .env
              </span>
            </div>
            <div className="space-y-1 p-3 font-mono text-[13px]">
              {PREVIEW_KEYS.map(([key, fake], index) => (
                <div
                  key={key}
                  className="flex items-center gap-4 rounded-lg px-3 py-2.5 odd:bg-white/[0.02]"
                >
                  <span className="w-6 text-right text-xs text-muted-foreground/50">
                    {index + 1}
                  </span>
                  <span className="w-44 truncate text-foreground">{key}</span>
                  <span className="flex-1 truncate text-muted-foreground blur-[5px] select-none">
                    {fake}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -right-6 -bottom-16 w-64 rounded-xl border bg-popover/95 p-4 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg border bg-background text-brand">
                <LockKeyhole className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Secret Protected</p>
                <p className="text-xs text-muted-foreground">Enter your 4-digit passcode</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((slot) => (
                <span
                  key={slot}
                  className="flex h-10 items-center justify-center rounded-md border bg-background"
                >
                  {slot < 3 ? <span className="size-2 rounded-full bg-foreground/80" /> : null}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

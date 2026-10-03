import type { Metadata } from "next"
import {
  Ban,
  Database,
  Fingerprint,
  ScanFace,
  KeyRound,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"

import { GoogleIcon } from "@/components/brand/google-icon"
import { UserAvatar } from "@/components/layout/user-menu"
import { ChangePasscodeForm } from "@/components/settings/change-passcode-form"
import { FingerprintSettings } from "@/components/settings/fingerprint-settings"
import { LogoutButton } from "@/components/settings/logout-button"
import { SessionsList } from "@/components/settings/sessions-list"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/dal/auth"
import {
  BASE_LOCKOUT_MINUTES,
  getSecurityStatus,
  MAX_FAILED_ATTEMPTS,
} from "@/lib/dal/security"
import { listPasskeys } from "@/lib/dal/passkeys"
import { listSessions } from "@/lib/dal/sessions"
import { formatDate, formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Settings" }

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-brand" />
          <h2 className="font-medium">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-6">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm sm:mt-0 sm:text-right">{value}</dd>
      </div>
    </div>
  )
}

export default async function SettingsPage() {
  const user = await requireUser()
  const [status, sessions, passkeys] = await Promise.all([
    getSecurityStatus(user.id),
    listSessions(user.id, user.sessionId),
    listPasskeys(user.id),
  ])

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      <PageHeader
        title="Settings"
        description="Manage your account, security passcode and signed-in devices."
      />

      <Section
        icon={UserRound}
        title="Google account"
        description="ENV Vault uses Google to confirm who you are. Your Google password is never shared with the app."
      >
        <div className="flex flex-col gap-4 rounded-lg border bg-background/40 p-4 sm:flex-row sm:items-center">
          <UserAvatar
            user={{ name: user.name, email: user.email, image: user.image }}
            className="size-12 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{user.name || "Google user"}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Badge variant="outline" className="gap-1.5">
              <GoogleIcon className="size-3" />
              Connected
            </Badge>
            <span className="text-xs text-muted-foreground">
              Member since {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </Section>

      <Section
        icon={KeyRound}
        title="Security passcode"
        description="Required to reveal, copy or export secrets. It is separate from your Google password."
      >
        <ChangePasscodeForm />
      </Section>

      <Section
        icon={Fingerprint}
        title="Fingerprint unlock"
        description="Use Touch ID instead of typing your PIN to reveal, copy or export. Your fingerprint never leaves your device, and the PIN keeps working as a backup."
      >
        <FingerprintSettings passkeys={passkeys} />
      </Section>

      <Section
        icon={ShieldCheck}
        title="Security information"
        description="How ENV Vault protects your environment variables."
      >
        <dl className="divide-y">
          <Fact
            icon={LockKeyhole}
            label="Value encryption"
            value="AES-256-GCM · unique random IV per value"
          />
          <Fact
            icon={Database}
            label="Stored in MongoDB"
            value="Ciphertext only, never plaintext"
          />
          <Fact
            icon={Fingerprint}
            label="Passcode storage"
            value="4-digit PIN · peppered, salted scrypt hash"
          />
          <Fact
            icon={ScanFace}
            label="Fingerprint unlock"
            value={
              passkeys.length
                ? `WebAuthn passkey on ${passkeys.length} ${passkeys.length === 1 ? "device" : "devices"} · new one-time challenge per unlock`
                : "Not set up"
            }
          />
          <Fact
            icon={Ban}
            label="Brute-force protection"
            value={`${MAX_FAILED_ATTEMPTS} wrong attempts lock it for ${BASE_LOCKOUT_MINUTES} min (doubling each time) and sign out every device`}
          />
          <Fact
            icon={KeyRound}
            label="Passcode last changed"
            value={status ? formatDateTime(status.passcodeUpdatedAt) : "Not set"}
          />
          <Fact
            icon={ShieldCheck}
            label="Current status"
            value={
              status?.lockedUntil ? (
                <span className="text-destructive">
                  Locked until {formatDateTime(status.lockedUntil)}
                </span>
              ) : status && status.failedAttempts > 0 ? (
                <span className="text-warning">
                  {status.failedAttempts} failed {status.failedAttempts === 1 ? "attempt" : "attempts"} since last unlock
                </span>
              ) : (
                <span className="text-brand">No failed attempts</span>
              )
            }
          />
        </dl>
      </Section>

      <Section
        icon={MonitorSmartphone}
        title="Signed-in devices"
        description="Every browser where you're signed in. Revoke any device you don't recognise."
      >
        <SessionsList sessions={sessions} />
      </Section>

      <Section
        icon={LogOut}
        title="Log out"
        description="End your session on this device. Your vault stays encrypted in the database."
      >
        <LogoutButton />
      </Section>
    </div>
  )
}

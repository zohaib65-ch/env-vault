export const ACTIVITY_ACTIONS = [
  "auth.login",
  "auth.logout",
  "project.created",
  "project.updated",
  "project.deleted",
  "variable.created",
  "variable.updated",
  "variable.deleted",
  "secret.revealed",
  "secret.copied",
  "env.imported",
  "env.exported",
  "passcode.set",
  "passcode.changed",
  "passcode.failed",
  "passcode.locked",
  "session.revoked",
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export const SECRET_ACCESS_ACTIONS: ActivityAction[] = [
  "secret.revealed",
  "secret.copied",
  "env.exported",
]

/** Never contains secret values — only names and counts. */
export type ActivityMetadata = {
  projectName?: string
  key?: string
  previousKey?: string
  count?: number
  created?: number
  updated?: number
  skipped?: number
  purpose?: string
  device?: string
  targetDevice?: string
}

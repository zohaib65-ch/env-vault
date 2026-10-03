// Data transfer objects handed to the UI. None of them carry secret values.

export type ProjectSummary = {
  id: string
  name: string
  description: string
  variableCount: number
  createdAt: string
  updatedAt: string
}

export type VariableItem = {
  id: string
  key: string
  createdAt: string
  updatedAt: string
}

export type SessionItem = {
  id: string
  device: string
  ip: string | null
  createdAt: string
  lastSeenAt: string
  current: boolean
}

export type SearchResults = {
  projects: { id: string; name: string; description: string }[]
  variables: { id: string; key: string; projectId: string; projectName: string }[]
}

export type SecurityStatus = {
  failedAttempts: number
  lockedUntil: string | null
  passcodeUpdatedAt: string
}

export type ImportPreview = {
  keys: { key: string; exists: boolean }[]
  invalidKeys: string[]
  duplicateKeys: string[]
}

export type PasskeyItem = {
  id: string
  credentialId: string
  name: string
  createdAt: string
  lastUsedAt: string | null
}

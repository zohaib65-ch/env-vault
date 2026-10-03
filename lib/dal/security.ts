import "server-only"

import { Types } from "mongoose"

import { fail, type ActionError } from "@/lib/action-result"
import type { ActivityMetadata } from "@/lib/activity-types"
import { logActivity } from "@/lib/dal/activity"
import { connectToDatabase } from "@/lib/db"
import { SecuritySettings } from "@/lib/models/security-settings"
import { Session } from "@/lib/models/session"
import { verifyPasscodeHash } from "@/lib/passcode"
import type { SecurityStatus } from "@/lib/types"

export const MAX_FAILED_ATTEMPTS = 5
export const BASE_LOCKOUT_MINUTES = 15
const MAX_LOCKOUT_MS = 24 * 60 * 60 * 1000

function lockoutDuration(lockoutCount: number) {
  return Math.min(
    BASE_LOCKOUT_MINUTES * 60 * 1000 * 2 ** lockoutCount,
    MAX_LOCKOUT_MS
  )
}

function lockedError(lockedUntil: Date): ActionError {
  return {
    code: "LOCKED",
    message: "Too many failed attempts. Passcode entry is temporarily locked.",
    lockedUntil: lockedUntil.toISOString(),
  }
}

export async function hasPasscode(userId: string) {
  await connectToDatabase()
  return Boolean(
    await SecuritySettings.exists({ userId: new Types.ObjectId(userId) })
  )
}

export async function getSecurityStatus(
  userId: string
): Promise<SecurityStatus | null> {
  await connectToDatabase()
  const settings = await SecuritySettings.findOne({
    userId: new Types.ObjectId(userId),
  }).lean()
  if (!settings) return null

  const locked = settings.lockedUntil && settings.lockedUntil > new Date()
  return {
    failedAttempts: settings.failedAttempts,
    lockedUntil: locked ? settings.lockedUntil!.toISOString() : null,
    passcodeUpdatedAt: (
      settings.passcodeUpdatedAt ?? settings.createdAt
    ).toISOString(),
  }
}

export type PasscodeCheck = { ok: true } | { ok: false; error: ActionError }

/**
 * Starts a lockout unless one is already active (another request may have got
 * there first) and returns when the active lockout ends.
 *
 * Starting a lockout also signs the account out everywhere: with a 4-digit
 * PIN, a stolen session must not be able to keep guessing after each lock.
 */
async function startLockout(userId: string, ownerId: Types.ObjectId, lockoutCount: number) {
  const now = new Date()
  const lockedUntil = new Date(now.getTime() + lockoutDuration(lockoutCount))
  const { modifiedCount } = await SecuritySettings.updateOne(
    {
      userId: ownerId,
      $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
    },
    { $set: { lockedUntil, failedAttempts: 0 }, $inc: { lockoutCount: 1 } }
  )
  if (modifiedCount === 1) {
    await logActivity({ userId, action: "passcode.locked" })
    await Session.deleteMany({ userId: ownerId })
    return lockedUntil
  }
  const current = await SecuritySettings.findOne({ userId: ownerId }).lean()
  return current?.lockedUntil ?? lockedUntil
}

/**
 * Server-side passcode check with brute-force protection.
 *
 * Each attempt is counted atomically *before* the hash comparison and only
 * cleared on success, so firing many requests in parallel cannot squeeze in
 * more than MAX_FAILED_ATTEMPTS guesses. After the limit the passcode locks
 * for 15 minutes, doubling with every further lockout (capped at 24 hours).
 * The doubling is not reset by a successful unlock, so interleaving guesses
 * with the owner's own unlocks still escalates.
 */
export async function verifyUserPasscode(
  userId: string,
  passcode: string,
  audit: { projectId?: string | null; metadata?: ActivityMetadata } = {}
): Promise<PasscodeCheck> {
  await connectToDatabase()
  const ownerId = new Types.ObjectId(userId)
  const now = new Date()

  const reserved = await SecuritySettings.findOneAndUpdate(
    {
      userId: ownerId,
      $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
    },
    { $inc: { failedAttempts: 1 } },
    { returnDocument: "after" }
  )
    .select("+passcodeHash")
    .lean()

  if (!reserved) {
    const settings = await SecuritySettings.findOne({ userId: ownerId }).lean()
    if (!settings) {
      return fail({
        code: "PASSCODE_NOT_SET",
        message: "Create a security passcode first.",
      })
    }
    return fail(lockedError(settings.lockedUntil ?? now))
  }

  if (reserved.failedAttempts > MAX_FAILED_ATTEMPTS) {
    // The final attempt is already used (by a concurrent request, or one that
    // died before it could record the lockout). Make sure the lock exists.
    return fail(lockedError(await startLockout(userId, ownerId, reserved.lockoutCount)))
  }

  const valid = await verifyPasscodeHash(passcode, reserved.passcodeHash)

  if (valid) {
    await SecuritySettings.updateOne(
      { userId: ownerId },
      { $set: { failedAttempts: 0, lockedUntil: null } }
    )
    return { ok: true }
  }

  await logActivity({
    userId,
    action: "passcode.failed",
    projectId: audit.projectId,
    metadata: audit.metadata,
  })

  if (reserved.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return fail(lockedError(await startLockout(userId, ownerId, reserved.lockoutCount)))
  }

  const remainingAttempts = MAX_FAILED_ATTEMPTS - reserved.failedAttempts
  return fail({
    code: "INVALID_PASSCODE",
    message: "Incorrect passcode",
    remainingAttempts,
  })
}

"use server"

import { refresh } from "next/cache"
import { redirect } from "next/navigation"
import { Types } from "mongoose"

import { unexpectedError } from "@/lib/action-errors"
import { fail, ok, type ActionResult } from "@/lib/action-result"
import { destroyCurrentSession, getCurrentUser } from "@/lib/auth/session"
import { logActivity } from "@/lib/dal/activity"
import { requireUser } from "@/lib/dal/auth"
import { Session } from "@/lib/models/session"
import { objectIdSchema } from "@/lib/validation"

export async function logout() {
  const user = await getCurrentUser()
  if (user) await logActivity({ userId: user.id, action: "auth.logout" })
  await destroyCurrentSession()
  redirect("/login")
}

export async function revokeSession(input: {
  sessionId: string
}): Promise<ActionResult> {
  const user = await requireUser()
  if (!objectIdSchema.safeParse(input.sessionId).success) {
    return fail({ code: "NOT_FOUND", message: "Session not found." })
  }
  if (input.sessionId === user.sessionId) {
    return fail({
      code: "VALIDATION",
      message: "Use “Log out” to end your current session.",
    })
  }

  try {
    const session = await Session.findOneAndDelete({
      _id: new Types.ObjectId(input.sessionId),
      userId: new Types.ObjectId(user.id),
    }).lean()
    if (!session) return fail({ code: "NOT_FOUND", message: "Session not found." })

    await logActivity({
      userId: user.id,
      action: "session.revoked",
      metadata: { targetDevice: session.device ?? undefined, count: 1 },
    })
    refresh()
    return ok(null)
  } catch (error) {
    return unexpectedError(error, "revokeSession")
  }
}

export async function revokeOtherSessions(): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser()

  try {
    const { deletedCount } = await Session.deleteMany({
      userId: new Types.ObjectId(user.id),
      _id: { $ne: new Types.ObjectId(user.sessionId) },
    })
    if (deletedCount > 0) {
      await logActivity({
        userId: user.id,
        action: "session.revoked",
        metadata: { count: deletedCount },
      })
    }
    refresh()
    return ok({ count: deletedCount })
  } catch (error) {
    return unexpectedError(error, "revokeOtherSessions")
  }
}

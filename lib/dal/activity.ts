import "server-only"

import { Types } from "mongoose"

import {
  SECRET_ACCESS_ACTIONS,
  type ActivityAction,
  type ActivityMetadata,
} from "@/lib/activity-types"
import { getRequestContext } from "@/lib/auth/session"
import { connectToDatabase } from "@/lib/db"
import { ActivityLog } from "@/lib/models/activity-log"

/** Records an audit event. Only names and counts — never secret values. */
export async function logActivity(entry: {
  userId: string
  action: ActivityAction
  projectId?: string | Types.ObjectId | null
  metadata?: ActivityMetadata
}) {
  try {
    await connectToDatabase()
    const { ip, device } = await getRequestContext()
    await ActivityLog.create({
      userId: entry.userId,
      projectId: entry.projectId ?? null,
      action: entry.action,
      metadata: { ...entry.metadata, device },
      ip,
    })
  } catch (error) {
    // An audit write must never break the user's action.
    console.error("[activity] failed to record event", entry.action, error)
  }
}

export async function countSecretAccessSince(userId: string, since: Date) {
  await connectToDatabase()
  return ActivityLog.countDocuments({
    userId: new Types.ObjectId(userId),
    action: { $in: SECRET_ACCESS_ACTIONS },
    createdAt: { $gte: since },
  })
}

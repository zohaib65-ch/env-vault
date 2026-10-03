import "server-only"

import { Types } from "mongoose"

import { connectToDatabase } from "@/lib/db"
import { Session } from "@/lib/models/session"
import type { SessionItem } from "@/lib/types"

export async function listSessions(
  userId: string,
  currentSessionId: string
): Promise<SessionItem[]> {
  await connectToDatabase()
  const sessions = await Session.find({
    userId: new Types.ObjectId(userId),
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastSeenAt: -1 })
    .lean()

  return sessions.map((session) => ({
    id: session._id.toString(),
    device: session.device ?? "Unknown device",
    ip: session.ip ?? null,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    current: session._id.toString() === currentSessionId,
  }))
}

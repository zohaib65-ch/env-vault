import "server-only"

import { Types } from "mongoose"

import { connectToDatabase } from "@/lib/db"
import { Passkey } from "@/lib/models/passkey"
import type { PasskeyItem } from "@/lib/types"

export async function hasPasskeys(userId: string) {
  await connectToDatabase()
  return Boolean(await Passkey.exists({ userId: new Types.ObjectId(userId) }))
}

export async function listPasskeys(userId: string): Promise<PasskeyItem[]> {
  await connectToDatabase()
  const passkeys = await Passkey.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()
  return passkeys.map((passkey) => ({
    id: passkey._id.toString(),
    credentialId: passkey.credentialId,
    name: passkey.name,
    createdAt: passkey.createdAt.toISOString(),
    lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
  }))
}

import "server-only"

import { cookies, headers } from "next/headers"
import { cache } from "react"
import { Types } from "mongoose"

import { randomToken, sha256 } from "@/lib/crypto"
import { connectToDatabase } from "@/lib/db"
import { isEmailAllowed, usesHttps } from "@/lib/env"
import { describeDevice } from "@/lib/format"
import { Session } from "@/lib/models/session"
import { User } from "@/lib/models/user"

// The __Host- prefix makes the browser enforce Secure, Path=/ and no Domain.
export function sessionCookieName() {
  return usesHttps() ? "__Host-envvault_session" : "envvault_session"
}

/**
 * Expires a cookie with the same attributes it was set with. A plain delete
 * omits `Secure`, which browsers reject for `__Host-` cookies.
 */
export async function expireCookie(name: string) {
  ;(await cookies()).set(name, "", {
    httpOnly: true,
    secure: usesHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000

export type CurrentUser = {
  id: string
  email: string
  name: string
  image: string | null
  createdAt: Date
  sessionId: string
}

export async function getRequestContext() {
  const headerList = await headers()
  // Display only. Prefer the header set by the hosting proxy; the left-most
  // X-Forwarded-For entry is whatever the client chose to send.
  const nearestHop = headerList.get("x-forwarded-for")?.split(",").at(-1)?.trim()
  return {
    ip: headerList.get("x-real-ip")?.trim() || nearestHop || null,
    device: describeDevice(headerList.get("user-agent")),
  }
}

export async function createSession(userId: Types.ObjectId | string) {
  await connectToDatabase()
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const { ip, device } = await getRequestContext()

  await Session.create({
    tokenHash: sha256(token),
    userId,
    expiresAt,
    device,
    ip,
  })

  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: usesHttps(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

/**
 * Resolves the signed-in user from the session cookie. Memoised per request,
 * so layouts, pages and actions can all call it freely.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value
  if (!token || token.length > 128) return null

  await connectToDatabase()
  const session = await Session.findOne({
    tokenHash: sha256(token),
    expiresAt: { $gt: new Date() },
  }).lean()
  if (!session) return null

  const user = await User.findById(session.userId).lean()
  // Re-checked per request so removing an email from ALLOWED_EMAILS takes
  // effect immediately, not when the 30-day session expires.
  if (!user || !isEmailAllowed(user.email)) return null

  if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await Session.updateOne(
      { _id: session._id },
      { $set: { lastSeenAt: new Date() } }
    )
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? "",
    image: user.image ?? null,
    createdAt: user.createdAt,
    sessionId: session._id.toString(),
  }
})

export async function destroyCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName())?.value
  if (token) {
    await connectToDatabase()
    await Session.deleteOne({ tokenHash: sha256(token) })
  }
  await expireCookie(sessionCookieName())
}

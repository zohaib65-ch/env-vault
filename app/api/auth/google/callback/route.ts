import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { exchangeCodeForProfile, oauthCookieName } from "@/lib/auth/google"
import { createSession, expireCookie } from "@/lib/auth/session"
import { logActivity } from "@/lib/dal/activity"
import { connectToDatabase } from "@/lib/db"
import { getEnv, isEmailAllowed } from "@/lib/env"
import { User } from "@/lib/models/user"

const oauthCookieSchema = z.object({
  state: z.string().min(32),
  nonce: z.string().min(32),
  codeVerifier: z.string().min(43),
})

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function GET(request: NextRequest) {
  const appUrl = getEnv().APP_URL
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, appUrl))

  const cookieStore = await cookies()
  const stored = cookieStore.get(oauthCookieName())?.value
  await expireCookie(oauthCookieName())

  const params = request.nextUrl.searchParams
  if (params.get("error")) return fail("access_denied")

  const code = params.get("code")
  const state = params.get("state")
  if (!code || !state || !stored) return fail("state_mismatch")

  let oauth: z.infer<typeof oauthCookieSchema>
  try {
    oauth = oauthCookieSchema.parse(JSON.parse(stored))
  } catch {
    return fail("state_mismatch")
  }
  if (!safeEqual(state, oauth.state)) return fail("state_mismatch")

  let profile
  try {
    profile = await exchangeCodeForProfile({
      code,
      codeVerifier: oauth.codeVerifier,
      nonce: oauth.nonce,
    })
  } catch (error) {
    console.error("[auth] Google sign-in failed", error instanceof Error ? error.message : error)
    return fail("oauth_failed")
  }

  if (!isEmailAllowed(profile.email)) return fail("not_allowed")

  await connectToDatabase()
  const user = await User.findOneAndUpdate(
    { googleId: profile.googleId },
    {
      $set: { email: profile.email, name: profile.name, image: profile.image },
      $setOnInsert: { googleId: profile.googleId },
    },
    { upsert: true, returnDocument: "after" }
  ).lean()

  await createSession(user._id)
  await logActivity({ userId: user._id.toString(), action: "auth.login" })

  return NextResponse.redirect(new URL("/dashboard", appUrl))
}

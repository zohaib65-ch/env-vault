import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import {
  buildGoogleAuthorizeUrl,
  OAUTH_COOKIE_MAX_AGE,
  oauthCookieName,
} from "@/lib/auth/google"
import { randomToken } from "@/lib/crypto"
import { ConfigError, getEnv, usesHttps } from "@/lib/env"

export async function GET(request: NextRequest) {
  try {
    getEnv()
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error
    // The login page lists exactly which settings need fixing.
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const state = randomToken(32)
  const nonce = randomToken(32)
  const codeVerifier = randomToken(48)

  const cookieStore = await cookies()
  cookieStore.set(oauthCookieName(), JSON.stringify({ state, nonce, codeVerifier }), {
    httpOnly: true,
    secure: usesHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  })

  return NextResponse.redirect(buildGoogleAuthorizeUrl({ state, nonce, codeVerifier }))
}

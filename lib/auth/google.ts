import "server-only"

import { createHash } from "node:crypto"
import { createRemoteJWKSet, jwtVerify } from "jose"

import { getEnv, usesHttps } from "@/lib/env"

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
)

export function oauthCookieName() {
  return usesHttps() ? "__Host-envvault_oauth" : "envvault_oauth"
}
export const OAUTH_COOKIE_MAX_AGE = 10 * 60

export type GoogleProfile = {
  googleId: string
  email: string
  name: string
  image: string | null
}

export function googleRedirectUri() {
  return new URL("/api/auth/google/callback", getEnv().APP_URL).toString()
}

export function buildGoogleAuthorizeUrl(params: {
  state: string
  nonce: string
  codeVerifier: string
}) {
  const codeChallenge = createHash("sha256")
    .update(params.codeVerifier)
    .digest("base64url")

  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    client_id: getEnv().GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: params.state,
    nonce: params.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString()
  return url
}

export async function exchangeCodeForProfile(params: {
  code: string
  codeVerifier: string
  nonce: string
}): Promise<GoogleProfile> {
  const env = getEnv()
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: params.codeVerifier,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`)
  }

  const tokens = (await response.json()) as { id_token?: string }
  if (!tokens.id_token) throw new Error("Google did not return an ID token")

  const { payload } = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
  })

  if (payload.nonce !== params.nonce) throw new Error("ID token nonce mismatch")
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("ID token is missing required claims")
  }
  if (payload.email_verified !== true) {
    throw new Error("Google account email is not verified")
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : payload.email,
    image: typeof payload.picture === "string" ? payload.picture : null,
  }
}

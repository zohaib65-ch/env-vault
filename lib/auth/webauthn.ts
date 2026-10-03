import "server-only"

import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server"
import { Types } from "mongoose"

import type { CurrentUser } from "@/lib/auth/session"
import { connectToDatabase } from "@/lib/db"
import { getEnv } from "@/lib/env"
import { Passkey } from "@/lib/models/passkey"
import { WebAuthnChallenge } from "@/lib/models/webauthn-challenge"

const CHALLENGE_TTL_MS = 5 * 60 * 1000

/** Passkeys are bound to the domain in APP_URL. */
export function relyingParty() {
  const url = new URL(getEnv().APP_URL)
  return { rpName: "ENV Vault", rpID: url.hostname, origin: url.origin }
}

/** Stores a fresh challenge, replacing any unused one for this session. */
export async function issueChallenge(
  user: CurrentUser,
  purpose: "register" | "authenticate",
  challenge: string
) {
  await connectToDatabase()
  const sessionId = new Types.ObjectId(user.sessionId)
  await WebAuthnChallenge.deleteMany({ sessionId, purpose })
  await WebAuthnChallenge.create({
    userId: new Types.ObjectId(user.id),
    sessionId,
    purpose,
    challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  })
}

function challengeFromClientData(clientDataJSON: string) {
  try {
    const data = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8"))
    return typeof data?.challenge === "string" ? data.challenge : null
  } catch {
    return null
  }
}

/**
 * Atomically deletes the challenge the browser signed, so each one can be
 * used exactly once and only by the session it was issued to.
 */
export async function consumeChallenge(
  user: CurrentUser,
  purpose: "register" | "authenticate",
  clientDataJSON: string
) {
  const challenge = challengeFromClientData(clientDataJSON)
  if (!challenge) return null
  await connectToDatabase()
  const issued = await WebAuthnChallenge.findOneAndDelete({
    userId: new Types.ObjectId(user.id),
    sessionId: new Types.ObjectId(user.sessionId),
    purpose,
    challenge,
    expiresAt: { $gt: new Date() },
  }).lean()
  return issued ? challenge : null
}

/** Verifies a Touch ID assertion against one of the user's registered devices. */
export async function verifyPasskeyAssertion(
  user: CurrentUser,
  response: AuthenticationResponseJSON
) {
  await connectToDatabase()
  const passkey = await Passkey.findOne({
    userId: new Types.ObjectId(user.id),
    credentialId: response.id,
  }).lean()
  if (!passkey) return false

  const challenge = await consumeChallenge(
    user,
    "authenticate",
    response.response.clientDataJSON
  )
  if (!challenge) return false

  const { rpID, origin } = relyingParty()
  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    })
    if (!verified) return false

    await Passkey.updateOne(
      { _id: passkey._id },
      { $set: { counter: authenticationInfo.newCounter, lastUsedAt: new Date() } }
    )
    return true
  } catch {
    return false
  }
}

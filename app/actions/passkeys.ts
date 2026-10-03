"use server"

import { refresh } from "next/cache"
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server"
import { Types } from "mongoose"
import { z } from "zod"

import { isDuplicateKeyError, unexpectedError } from "@/lib/action-errors"
import { fail, ok, type ActionResult } from "@/lib/action-result"
import { getRequestContext } from "@/lib/auth/session"
import { consumeChallenge, issueChallenge, relyingParty } from "@/lib/auth/webauthn"
import { logActivity } from "@/lib/dal/activity"
import { requireUser } from "@/lib/dal/auth"
import { verifyUserPasscode } from "@/lib/dal/security"
import { connectToDatabase } from "@/lib/db"
import { Passkey } from "@/lib/models/passkey"
import { objectIdSchema, passcodeAttemptSchema } from "@/lib/validation"

const SETUP_FAILED = {
  code: "PASSKEY_FAILED",
  message: "Touch ID setup didn't complete. Please try again.",
} as const

async function userPasskeys(userId: string) {
  await connectToDatabase()
  return Passkey.find({ userId: new Types.ObjectId(userId) })
    .select({ credentialId: 1, transports: 1 })
    .lean()
}

/** Step 1 of enabling Touch ID: confirm the PIN, then issue a challenge. */
export async function startPasskeyRegistration(input: {
  passcode: string
}): Promise<ActionResult<PublicKeyCredentialCreationOptionsJSON>> {
  const user = await requireUser()

  const passcode = passcodeAttemptSchema.safeParse(input?.passcode)
  if (!passcode.success) {
    return fail({ code: "VALIDATION", message: "Enter your passcode." })
  }

  try {
    const check = await verifyUserPasscode(user.id, passcode.data, {
      metadata: { purpose: "enable Touch ID" },
    })
    if (!check.ok) return check

    const { rpName, rpID } = relyingParty()
    const existing = await userPasskeys(user.id)
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      preferredAuthenticatorType: "localDevice",
      timeout: 120_000,
    })

    await issueChallenge(user, "register", options.challenge)
    return ok(options)
  } catch (error) {
    return unexpectedError(error, "startPasskeyRegistration")
  }
}

const registrationResponseSchema = z.object({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: z.string().min(1).max(8192),
    attestationObject: z.string().min(1).max(65536),
    transports: z.array(z.string().max(32)).max(10).optional(),
  }).loose(),
  clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
}).loose()

/** Step 2: verify the new credential the device created and store its public key. */
export async function finishPasskeyRegistration(input: {
  response: RegistrationResponseJSON
}): Promise<ActionResult<{ credentialId: string }>> {
  const user = await requireUser()

  const parsed = registrationResponseSchema.safeParse(input?.response)
  if (!parsed.success) return fail(SETUP_FAILED)
  const response = parsed.data as unknown as RegistrationResponseJSON

  try {
    const challenge = await consumeChallenge(
      user,
      "register",
      response.response.clientDataJSON
    )
    if (!challenge) return fail(SETUP_FAILED)

    const { rpID, origin } = relyingParty()
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    }).catch(() => null)
    if (!verification?.verified) return fail(SETUP_FAILED)

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo
    const { device } = await getRequestContext()

    await Passkey.create({
      userId: new Types.ObjectId(user.id),
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: device,
    })
    await logActivity({
      userId: user.id,
      action: "passkey.added",
      metadata: { targetDevice: device },
    })
    refresh()
    return ok({ credentialId: credential.id })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail({
        code: "CONFLICT",
        message: "Touch ID is already enabled on this device.",
      })
    }
    return unexpectedError(error, "finishPasskeyRegistration")
  }
}

/** Issues a one-time challenge for unlocking a secret with Touch ID. */
export async function startPasskeyAuthentication(): Promise<
  ActionResult<PublicKeyCredentialRequestOptionsJSON>
> {
  const user = await requireUser()

  try {
    const passkeys = await userPasskeys(user.id)
    if (passkeys.length === 0) {
      return fail({ code: "NOT_FOUND", message: "Touch ID isn't set up yet." })
    }

    const options = await generateAuthenticationOptions({
      rpID: relyingParty().rpID,
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      userVerification: "required",
      timeout: 60_000,
    })

    await issueChallenge(user, "authenticate", options.challenge)
    return ok(options)
  } catch (error) {
    return unexpectedError(error, "startPasskeyAuthentication")
  }
}

export async function removePasskey(input: {
  passkeyId: string
}): Promise<ActionResult> {
  const user = await requireUser()
  if (!objectIdSchema.safeParse(input?.passkeyId).success) {
    return fail({ code: "NOT_FOUND", message: "Device not found." })
  }

  try {
    const passkey = await Passkey.findOneAndDelete({
      _id: new Types.ObjectId(input.passkeyId),
      userId: new Types.ObjectId(user.id),
    }).lean()
    if (!passkey) return fail({ code: "NOT_FOUND", message: "Device not found." })

    await logActivity({
      userId: user.id,
      action: "passkey.removed",
      metadata: { targetDevice: passkey.name },
    })
    refresh()
    return ok(null)
  } catch (error) {
    return unexpectedError(error, "removePasskey")
  }
}

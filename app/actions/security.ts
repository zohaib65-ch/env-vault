"use server"

import { redirect } from "next/navigation"
import { Types } from "mongoose"
import { z } from "zod"

import { isDuplicateKeyError, unexpectedError } from "@/lib/action-errors"
import { fail, ok, type ActionResult } from "@/lib/action-result"
import { logActivity } from "@/lib/dal/activity"
import { requireUser } from "@/lib/dal/auth"
import { hasPasscode, verifyUserPasscode } from "@/lib/dal/security"
import { connectToDatabase } from "@/lib/db"
import { SecuritySettings } from "@/lib/models/security-settings"
import { hashPasscode } from "@/lib/passcode"
import {
  fieldErrorsOf,
  newPasscodeSchema,
  passcodeAttemptSchema,
} from "@/lib/validation"

export async function setupPasscode(input: {
  passcode: string
  confirm: string
}): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = newPasscodeSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }

  // A passcode can only be created once; changing it requires the old one.
  // Checked before hashing so repeated calls can't tie up the CPU.
  if (await hasPasscode(user.id)) redirect("/dashboard")

  try {
    await connectToDatabase()
    await SecuritySettings.create({
      userId: new Types.ObjectId(user.id),
      passcodeHash: await hashPasscode(parsed.data.passcode),
    })
    await logActivity({ userId: user.id, action: "passcode.set" })
  } catch (error) {
    // A concurrent request created it first.
    if (!isDuplicateKeyError(error)) return unexpectedError(error, "setupPasscode")
  }

  redirect("/dashboard")
}

const changePasscodeSchema = z
  .object({ current: passcodeAttemptSchema })
  .and(newPasscodeSchema)

export async function changePasscode(input: {
  current: string
  passcode: string
  confirm: string
}): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = changePasscodeSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }

  try {
    const check = await verifyUserPasscode(user.id, parsed.data.current, {
      metadata: { purpose: "change-passcode" },
    })
    if (!check.ok) return check

    await SecuritySettings.updateOne(
      { userId: new Types.ObjectId(user.id) },
      {
        $set: {
          passcodeHash: await hashPasscode(parsed.data.passcode),
          passcodeUpdatedAt: new Date(),
          failedAttempts: 0,
          lockoutCount: 0,
          lockedUntil: null,
        },
      }
    )
    await logActivity({ userId: user.id, action: "passcode.changed" })
    return ok(null)
  } catch (error) {
    return unexpectedError(error, "changePasscode")
  }
}

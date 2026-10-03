"use server"

import { refresh } from "next/cache"
import { Types } from "mongoose"
import { z } from "zod"

import { isDuplicateKeyError, unexpectedError } from "@/lib/action-errors"
import { fail, ok, type ActionResult } from "@/lib/action-result"
import { decryptSecret, encryptSecret, variableContext } from "@/lib/crypto"
import { logActivity } from "@/lib/dal/activity"
import { requireUser } from "@/lib/dal/auth"
import { getOwnedProject, touchProject } from "@/lib/dal/projects"
import { verifyUserPasscode } from "@/lib/dal/security"
import { connectToDatabase } from "@/lib/db"
import { parseEnvFile, serializeEnvFile } from "@/lib/dotenv"
import { slugify } from "@/lib/format"
import { EnvironmentVariable } from "@/lib/models/environment-variable"
import type { ImportPreview } from "@/lib/types"
import {
  createVariableSchema,
  envKeySchema,
  fieldErrorsOf,
  MAX_IMPORT_BYTES,
  MAX_VALUE_LENGTH,
  objectIdSchema,
  passcodeAttemptSchema,
  secretAccessSchema,
  updateVariableSchema,
} from "@/lib/validation"

const PROJECT_NOT_FOUND = { code: "NOT_FOUND", message: "Project not found." } as const
const VARIABLE_NOT_FOUND = { code: "NOT_FOUND", message: "Variable not found." } as const

function duplicateKey(key: string) {
  const message = `${key} already exists in this project.`
  return fail({ code: "VALIDATION", message, fieldErrors: { key: [message] } })
}

async function findOwnedVariable(
  userId: string,
  variableId: string,
  withValue = false
) {
  await connectToDatabase()
  const query = EnvironmentVariable.findOne({
    _id: new Types.ObjectId(variableId),
    userId: new Types.ObjectId(userId),
  })
  if (withValue) query.select("+encryptedValue")
  return query.lean()
}

export async function createVariable(input: {
  projectId: string
  key: string
  value: string
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = createVariableSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }
  const { key, value } = parsed.data

  try {
    const project = await getOwnedProject(user.id, parsed.data.projectId)
    if (!project) return fail(PROJECT_NOT_FOUND)

    const id = new Types.ObjectId()
    await EnvironmentVariable.create({
      _id: id,
      userId: project.userId,
      projectId: project._id,
      key,
      encryptedValue: encryptSecret(value, variableContext(id.toString())),
    })
    await touchProject(project._id)
    await logActivity({
      userId: user.id,
      action: "variable.created",
      projectId: project._id,
      metadata: { key, projectName: project.name },
    })
    refresh()
    return ok({ id: id.toString() })
  } catch (error) {
    if (isDuplicateKeyError(error)) return duplicateKey(key)
    return unexpectedError(error, "createVariable")
  }
}

export async function updateVariable(input: {
  variableId: string
  key: string
  value: string | null
}): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = updateVariableSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }
  const { variableId, key, value } = parsed.data

  try {
    const variable = await findOwnedVariable(user.id, variableId)
    if (!variable) return fail(VARIABLE_NOT_FOUND)
    const project = await getOwnedProject(user.id, variable.projectId.toString())
    if (!project) return fail(PROJECT_NOT_FOUND)

    const changes: { key: string; encryptedValue?: string } = { key }
    if (value !== null) {
      changes.encryptedValue = encryptSecret(
        value,
        variableContext(variable._id.toString())
      )
    }
    if (key === variable.key && value === null) return ok(null)

    await EnvironmentVariable.updateOne(
      { _id: variable._id, userId: variable.userId },
      { $set: changes }
    )
    await touchProject(project._id)
    await logActivity({
      userId: user.id,
      action: "variable.updated",
      projectId: project._id,
      metadata: {
        key,
        projectName: project.name,
        ...(key !== variable.key ? { previousKey: variable.key } : {}),
        ...(value !== null ? { purpose: "value" } : {}),
      },
    })
    refresh()
    return ok(null)
  } catch (error) {
    if (isDuplicateKeyError(error)) return duplicateKey(key)
    return unexpectedError(error, "updateVariable")
  }
}

export async function deleteVariable(input: {
  variableId: string
}): Promise<ActionResult> {
  const user = await requireUser()
  if (!objectIdSchema.safeParse(input.variableId).success) {
    return fail(VARIABLE_NOT_FOUND)
  }

  try {
    const variable = await findOwnedVariable(user.id, input.variableId)
    if (!variable) return fail(VARIABLE_NOT_FOUND)
    const project = await getOwnedProject(user.id, variable.projectId.toString())

    await EnvironmentVariable.deleteOne({
      _id: variable._id,
      userId: variable.userId,
    })
    if (project) await touchProject(project._id)
    await logActivity({
      userId: user.id,
      action: "variable.deleted",
      projectId: variable.projectId,
      metadata: { key: variable.key, projectName: project?.name },
    })
    refresh()
    return ok(null)
  } catch (error) {
    return unexpectedError(error, "deleteVariable")
  }
}

/**
 * Returns ONE decrypted value after the passcode has been verified on the
 * server. Used for reveal, copy and unlocking a value inside the edit form.
 */
export async function accessSecret(input: {
  variableId: string
  passcode: string
  purpose: "reveal" | "copy" | "edit"
}): Promise<ActionResult<{ value: string }>> {
  const user = await requireUser()

  const parsed = secretAccessSchema.safeParse(input)
  if (!parsed.success) {
    return fail({ code: "VALIDATION", message: "Enter your passcode." })
  }
  const { variableId, passcode, purpose } = parsed.data

  try {
    const variable = await findOwnedVariable(user.id, variableId, true)
    if (!variable) return fail(VARIABLE_NOT_FOUND)
    const project = await getOwnedProject(user.id, variable.projectId.toString())
    if (!project) return fail(PROJECT_NOT_FOUND)

    const check = await verifyUserPasscode(user.id, passcode, {
      projectId: project._id.toString(),
      metadata: { key: variable.key, projectName: project.name, purpose },
    })
    if (!check.ok) return check

    const value = decryptSecret(
      variable.encryptedValue,
      variableContext(variable._id.toString())
    )

    await logActivity({
      userId: user.id,
      action: purpose === "copy" ? "secret.copied" : "secret.revealed",
      projectId: project._id,
      metadata: { key: variable.key, projectName: project.name, purpose },
    })
    return ok({ value })
  } catch (error) {
    return unexpectedError(error, "accessSecret")
  }
}

/**
 * Builds the project's .env after the passcode has been verified, either to
 * download as a file or to copy to the clipboard in one go.
 */
export async function exportEnv(input: {
  projectId: string
  passcode: string
  mode?: "download" | "clipboard"
}): Promise<ActionResult<{ fileName: string; content: string; count: number }>> {
  const user = await requireUser()
  const mode = input.mode === "clipboard" ? "clipboard" : "download"

  const passcode = passcodeAttemptSchema.safeParse(input.passcode)
  if (!passcode.success) {
    return fail({ code: "VALIDATION", message: "Enter your passcode." })
  }

  try {
    const project = await getOwnedProject(user.id, input.projectId)
    if (!project) return fail(PROJECT_NOT_FOUND)

    const check = await verifyUserPasscode(user.id, passcode.data, {
      projectId: project._id.toString(),
      metadata: {
        projectName: project.name,
        purpose: mode === "clipboard" ? "copy all" : "export",
      },
    })
    if (!check.ok) return check

    const variables = await EnvironmentVariable.find({
      userId: project.userId,
      projectId: project._id,
    })
      .select("+encryptedValue")
      .sort({ key: 1 })
      .lean()

    const content = serializeEnvFile(
      variables.map((variable) => ({
        key: variable.key,
        value: decryptSecret(
          variable.encryptedValue,
          variableContext(variable._id.toString())
        ),
      })),
      [`${project.name} — from ENV Vault`]
    )

    await logActivity({
      userId: user.id,
      action: "env.exported",
      projectId: project._id,
      metadata: {
        projectName: project.name,
        count: variables.length,
        purpose: mode === "clipboard" ? "clipboard" : "download",
      },
    })

    return ok({
      fileName: `${slugify(project.name)}.env`,
      content,
      count: variables.length,
    })
  } catch (error) {
    return unexpectedError(error, "exportEnv")
  }
}

/** Validates pasted .env text and parses it on the server. */
function parsePastedEnv(content: unknown) {
  if (typeof content !== "string" || !content.trim()) {
    return fail({ code: "VALIDATION", message: "Paste the contents of your .env file." })
  }
  if (Buffer.byteLength(content, "utf8") > MAX_IMPORT_BYTES) {
    return fail({
      code: "VALIDATION",
      message: "That's more than 256 KB. Is it really a .env file?",
    })
  }
  if (content.includes("\u0000")) {
    return fail({ code: "VALIDATION", message: "That doesn't look like .env text." })
  }

  const parsed = parseEnvFile(content)
  if (parsed.entries.length === 0) {
    return fail({
      code: "VALIDATION",
      message: "No variables found. Lines should look like KEY=value.",
    })
  }
  return { ok: true as const, parsed }
}

/** Parses pasted .env text on the server and returns variable NAMES only. */
export async function previewEnvImport(input: {
  projectId: string
  content: string
}): Promise<ActionResult<ImportPreview>> {
  const user = await requireUser()

  try {
    const project = await getOwnedProject(user.id, String(input.projectId))
    if (!project) return fail(PROJECT_NOT_FOUND)

    const pasted = parsePastedEnv(input.content)
    if (!pasted.ok) return pasted

    const keys = pasted.parsed.entries.map((entry) => entry.key)
    const existing = await EnvironmentVariable.find({
      userId: project.userId,
      projectId: project._id,
      key: { $in: keys },
    })
      .select({ key: 1 })
      .lean()
    const existingKeys = new Set(existing.map((variable) => variable.key))

    return ok({
      keys: keys.map((key) => ({ key, exists: existingKeys.has(key) })),
      invalidKeys: pasted.parsed.invalidKeys,
      duplicateKeys: pasted.parsed.duplicateKeys,
    })
  } catch (error) {
    return unexpectedError(error, "previewEnvImport")
  }
}

const importSelectionSchema = z.object({
  keys: z.array(envKeySchema).min(1, "Select at least one variable.").max(1000),
  overwrite: z.boolean(),
})

export async function importEnv(input: {
  projectId: string
  content: string
  keys: string[]
  overwrite: boolean
}): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  const user = await requireUser()

  const selection = importSelectionSchema.safeParse(input)
  if (!selection.success) {
    return fail({ code: "VALIDATION", message: "Select at least one variable." })
  }

  try {
    const project = await getOwnedProject(user.id, String(input.projectId))
    if (!project) return fail(PROJECT_NOT_FOUND)

    const pasted = parsePastedEnv(input.content)
    if (!pasted.ok) return pasted

    const { overwrite } = selection.data
    const selectedKeys = new Set(selection.data.keys)
    const entries = pasted.parsed.entries.filter((entry) =>
      selectedKeys.has(entry.key)
    )

    const tooLarge = entries.filter((entry) => entry.value.length > MAX_VALUE_LENGTH)
    if (tooLarge.length > 0) {
      return fail({
        code: "VALIDATION",
        message: `Values must be 64 KB or smaller: ${tooLarge.map((e) => e.key).join(", ")}`,
      })
    }

    const existing = await EnvironmentVariable.find({
      userId: project.userId,
      projectId: project._id,
      key: { $in: entries.map((entry) => entry.key) },
    })
      .select({ key: 1 })
      .lean()
    const existingIds = new Map(existing.map((v) => [v.key, v._id]))

    let created = 0
    let updated = 0
    let skipped = 0
    const operations: Parameters<typeof EnvironmentVariable.bulkWrite>[0] = []

    for (const { key, value } of entries) {
      const existingId = existingIds.get(key)
      if (existingId) {
        if (!overwrite) {
          skipped++
          continue
        }
        operations.push({
          updateOne: {
            filter: { _id: existingId, userId: project.userId },
            update: {
              $set: {
                encryptedValue: encryptSecret(
                  value,
                  variableContext(existingId.toString())
                ),
              },
            },
          },
        })
        updated++
      } else {
        const id = new Types.ObjectId()
        operations.push({
          insertOne: {
            document: {
              _id: id,
              userId: project.userId,
              projectId: project._id,
              key,
              encryptedValue: encryptSecret(value, variableContext(id.toString())),
            },
          },
        })
        created++
      }
    }

    if (operations.length > 0) {
      await EnvironmentVariable.bulkWrite(operations, { ordered: false })
      await touchProject(project._id)
    }

    await logActivity({
      userId: user.id,
      action: "env.imported",
      projectId: project._id,
      metadata: {
        projectName: project.name,
        count: created + updated,
        created,
        updated,
        skipped,
      },
    })
    refresh()
    return ok({ created, updated, skipped })
  } catch (error) {
    return unexpectedError(error, "importEnv")
  }
}

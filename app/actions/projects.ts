"use server"

import { refresh } from "next/cache"

import { isDuplicateKeyError, unexpectedError } from "@/lib/action-errors"
import { fail, ok, type ActionResult } from "@/lib/action-result"
import { logActivity } from "@/lib/dal/activity"
import { requireUser } from "@/lib/dal/auth"
import { getOwnedProject } from "@/lib/dal/projects"
import { connectToDatabase } from "@/lib/db"
import { EnvironmentVariable } from "@/lib/models/environment-variable"
import { Project } from "@/lib/models/project"
import { fieldErrorsOf, projectInputSchema } from "@/lib/validation"

const DUPLICATE_NAME = "You already have a project with this name."

export async function createProject(input: {
  name: string
  description?: string
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const parsed = projectInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }

  try {
    await connectToDatabase()
    const project = await Project.create({ userId: user.id, ...parsed.data })
    await logActivity({
      userId: user.id,
      action: "project.created",
      projectId: project._id,
      metadata: { projectName: project.name },
    })
    return ok({ id: project._id.toString() })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail({
        code: "VALIDATION",
        message: DUPLICATE_NAME,
        fieldErrors: { name: [DUPLICATE_NAME] },
      })
    }
    return unexpectedError(error, "createProject")
  }
}

export async function updateProject(input: {
  projectId: string
  name: string
  description?: string
}): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = projectInputSchema.safeParse(input)
  if (!parsed.success) {
    return fail({
      code: "VALIDATION",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    })
  }

  try {
    const project = await getOwnedProject(user.id, input.projectId)
    if (!project) return fail({ code: "NOT_FOUND", message: "Project not found." })

    await Project.updateOne({ _id: project._id }, { $set: parsed.data })
    await logActivity({
      userId: user.id,
      action: "project.updated",
      projectId: project._id,
      metadata: { projectName: parsed.data.name },
    })
    refresh()
    return ok(null)
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return fail({
        code: "VALIDATION",
        message: DUPLICATE_NAME,
        fieldErrors: { name: [DUPLICATE_NAME] },
      })
    }
    return unexpectedError(error, "updateProject")
  }
}

export async function deleteProject(input: {
  projectId: string
  confirmName: string
}): Promise<ActionResult> {
  const user = await requireUser()

  try {
    const project = await getOwnedProject(user.id, input.projectId)
    if (!project) return fail({ code: "NOT_FOUND", message: "Project not found." })

    if (input.confirmName?.trim() !== project.name) {
      return fail({
        code: "VALIDATION",
        message: "Type the project name exactly to confirm.",
        fieldErrors: { confirmName: ["The name doesn't match."] },
      })
    }

    const { deletedCount } = await EnvironmentVariable.deleteMany({
      userId: project.userId,
      projectId: project._id,
    })
    await Project.deleteOne({ _id: project._id, userId: project.userId })
    await logActivity({
      userId: user.id,
      action: "project.deleted",
      metadata: { projectName: project.name, count: deletedCount },
    })
    return ok(null)
  } catch (error) {
    return unexpectedError(error, "deleteProject")
  }
}

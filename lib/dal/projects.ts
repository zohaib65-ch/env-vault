import "server-only"

import { Types } from "mongoose"

import { countSecretAccessSince } from "@/lib/dal/activity"
import { connectToDatabase } from "@/lib/db"
import { EnvironmentVariable } from "@/lib/models/environment-variable"
import { Project } from "@/lib/models/project"
import type { ProjectSummary, VariableItem } from "@/lib/types"
import { objectIdSchema } from "@/lib/validation"

type ProjectDoc = {
  _id: Types.ObjectId
  name: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

function toSummary(doc: ProjectDoc, variableCount: number): ProjectSummary {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? "",
    variableCount,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

async function countVariablesByProject(
  userId: Types.ObjectId,
  projectIds: Types.ObjectId[]
) {
  if (projectIds.length === 0) return new Map<string, number>()
  const rows = await EnvironmentVariable.aggregate<{
    _id: Types.ObjectId
    count: number
  }>([
    { $match: { userId, projectId: { $in: projectIds } } },
    { $group: { _id: "$projectId", count: { $sum: 1 } } },
  ])
  return new Map(rows.map((row) => [row._id.toString(), row.count]))
}

/**
 * Ownership check used before any project-scoped read or write.
 * Returns null for malformed ids and for projects owned by someone else.
 */
export async function getOwnedProject(userId: string, projectId: string) {
  if (!objectIdSchema.safeParse(projectId).success) return null
  await connectToDatabase()
  return Project.findOne({
    _id: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  }).lean()
}

export async function listProjects(
  userId: string,
  options: { limit?: number } = {}
): Promise<ProjectSummary[]> {
  await connectToDatabase()
  const ownerId = new Types.ObjectId(userId)
  let query = Project.find({ userId: ownerId }).sort({ updatedAt: -1, _id: -1 })
  if (options.limit) query = query.limit(options.limit)
  const projects = await query.lean()

  const counts = await countVariablesByProject(
    ownerId,
    projects.map((project) => project._id)
  )
  return projects.map((project) =>
    toSummary(project, counts.get(project._id.toString()) ?? 0)
  )
}

export async function listSidebarProjects(userId: string) {
  await connectToDatabase()
  const projects = await Project.find({ userId: new Types.ObjectId(userId) })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(5)
    .select({ name: 1 })
    .lean()
  return projects.map((project) => ({
    id: project._id.toString(),
    name: project.name,
  }))
}

export async function getDashboardData(userId: string) {
  await connectToDatabase()
  const ownerId = new Types.ObjectId(userId)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalProjects, totalVariables, updatedThisWeek, secretAccess, recent] =
    await Promise.all([
      Project.countDocuments({ userId: ownerId }),
      EnvironmentVariable.countDocuments({ userId: ownerId }),
      Project.countDocuments({ userId: ownerId, updatedAt: { $gte: weekAgo } }),
      countSecretAccessSince(userId, weekAgo),
      listProjects(userId, { limit: 6 }),
    ])

  return {
    totalProjects,
    totalVariables,
    updatedThisWeek,
    secretAccess,
    recentProjects: recent,
  }
}

export async function getProjectDetail(userId: string, projectId: string) {
  const project = await getOwnedProject(userId, projectId)
  if (!project) return null

  const variables = await EnvironmentVariable.find({
    userId: project.userId,
    projectId: project._id,
  })
    .sort({ key: 1 })
    .lean()

  const items: VariableItem[] = variables.map((variable) => ({
    id: variable._id.toString(),
    key: variable.key,
    createdAt: variable.createdAt.toISOString(),
    updatedAt: variable.updatedAt.toISOString(),
  }))

  return { project: toSummary(project, items.length), variables: items }
}

/** Bumps `updatedAt` so variable changes surface in "recently updated". */
export async function touchProject(projectId: Types.ObjectId | string) {
  await Project.updateOne(
    { _id: projectId },
    { $set: { updatedAt: new Date() } },
    { timestamps: false }
  )
}

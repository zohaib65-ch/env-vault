import "server-only"

import { Types } from "mongoose"

import { connectToDatabase } from "@/lib/db"
import { EnvironmentVariable } from "@/lib/models/environment-variable"
import { Project } from "@/lib/models/project"
import type { SearchResults } from "@/lib/types"

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Searches project names/descriptions and variable *names*. Encrypted values
 * are never read, decrypted or matched.
 */
export async function searchVault(
  userId: string,
  rawQuery: string
): Promise<SearchResults> {
  const query = rawQuery.trim().slice(0, 64)
  if (!query) return { projects: [], variables: [] }

  await connectToDatabase()
  const ownerId = new Types.ObjectId(userId)
  const pattern = new RegExp(escapeRegex(query), "i")

  const [projects, variables] = await Promise.all([
    Project.find({
      userId: ownerId,
      $or: [{ name: pattern }, { description: pattern }],
    })
      .sort({ updatedAt: -1 })
      .limit(6)
      .lean(),
    EnvironmentVariable.find({ userId: ownerId, key: pattern })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
  ])

  const projectIds = [...new Set(variables.map((v) => v.projectId.toString()))]
  const owners = await Project.find({
    userId: ownerId,
    _id: { $in: projectIds.map((id) => new Types.ObjectId(id)) },
  })
    .select({ name: 1 })
    .lean()
  const projectNames = new Map(owners.map((p) => [p._id.toString(), p.name]))

  return {
    projects: projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description ?? "",
    })),
    variables: variables
      .filter((variable) => projectNames.has(variable.projectId.toString()))
      .map((variable) => ({
        id: variable._id.toString(),
        key: variable.key,
        projectId: variable.projectId.toString(),
        projectName: projectNames.get(variable.projectId.toString())!,
      })),
  }
}

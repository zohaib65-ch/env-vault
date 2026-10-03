import "server-only"

import { redirect } from "next/navigation"

import { getCurrentUser, type CurrentUser } from "@/lib/auth/session"

/**
 * Entry point for every page and Server Action that touches user data.
 * Redirects to the login screen when there is no valid session.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

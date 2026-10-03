import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth/session"
import { ConfigError } from "@/lib/env"

export default async function Home() {
  let signedIn = false
  try {
    signedIn = Boolean(await getCurrentUser())
  } catch (error) {
    // The login page explains what configuration is missing.
    if (!(error instanceof ConfigError)) throw error
  }
  redirect(signedIn ? "/dashboard" : "/login")
}

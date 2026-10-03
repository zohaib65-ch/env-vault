import { NextResponse, type NextRequest } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { searchVault } from "@/lib/dal/search"

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get("q") ?? ""
  const results = await searchVault(user.id, query)

  return NextResponse.json(results, {
    headers: { "Cache-Control": "private, no-store" },
  })
}

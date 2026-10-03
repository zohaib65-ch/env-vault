import { NextResponse, type NextRequest } from "next/server"

// Optimistic check only: it looks for the session cookie so signed-out
// visitors are bounced early. Every page, Server Action and Route Handler
// still validates the session against the database itself.
const SESSION_COOKIES = ["__Host-envvault_session", "envvault_session"]

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))
  if (hasSession) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/projects/:path*",
    "/settings/:path*",
    "/setup",
    "/api/search",
  ],
}

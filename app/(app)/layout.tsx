import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { PasscodeProvider } from "@/components/shared/passcode-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/dal/auth"
import { hasPasscode } from "@/lib/dal/security"
import { ConfigError } from "@/lib/env"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireUser()
  } catch (error) {
    // The login page lists exactly which server settings need fixing.
    if (error instanceof ConfigError) redirect("/login")
    throw error
  }
  if (!(await hasPasscode(user.id))) redirect("/setup")

  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar user={{ name: user.name, email: user.email, image: user.image }} />
      <SidebarInset className="min-w-0 md:border md:border-sidebar-border">
        <AppHeader />
        <PasscodeProvider>
          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="w-full">{children}</div>
          </div>
        </PasscodeProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}

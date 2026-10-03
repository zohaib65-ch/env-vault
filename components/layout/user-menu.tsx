"use client"

import Link from "next/link"
import { useTransition } from "react"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import { logout } from "@/app/actions/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type ShellUser = { name: string; email: string; image: string | null }

export function initialsOf(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  const initials =
    parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2)
  return initials.toUpperCase()
}

export function UserAvatar({
  user,
  className,
}: {
  user: ShellUser
  className?: string
}) {
  return (
    <Avatar className={className}>
      {user.image ? (
        <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className="bg-secondary text-xs font-medium">
        {initialsOf(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
  )
}

export function UserMenu({ user }: { user: ShellUser }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [isPending, startTransition] = useTransition()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} className="size-8 rounded-lg" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || "Account"}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1.5 py-1.5 text-left text-sm">
                <UserAvatar user={user} className="size-8 rounded-lg" />
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-medium text-foreground">
                    {user.name || "Account"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={() => setOpenMobile(false)}>
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onSelect={() => startTransition(() => logout())}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

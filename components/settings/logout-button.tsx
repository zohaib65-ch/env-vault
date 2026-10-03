"use client"

import { useTransition } from "react"
import { LogOut } from "lucide-react"

import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
    >
      {pending ? <Spinner /> : <LogOut />}
      Log out
    </Button>
  )
}

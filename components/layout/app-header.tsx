import { CommandMenu } from "@/components/layout/command-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/60 sm:px-4 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <div className="flex min-w-0 flex-1 items-center">
        <CommandMenu />
      </div>
    
    </header>
  )
}

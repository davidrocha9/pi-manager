import type { ReactNode } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { AppHeader } from "./app-header"
import { AppSidebar, type TabId } from "./app-sidebar"

type AppShellProps = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onNewProject: () => void
  showSearch: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  children: ReactNode
}

export function AppShell({
  activeTab,
  onTabChange,
  onNewProject,
  showSearch,
  searchQuery,
  onSearchChange,
  children,
}: AppShellProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <AppSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          onNewProject={onNewProject}
        />
        <SidebarInset className="min-w-0">
          <AppHeader
            showSearch={showSearch}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

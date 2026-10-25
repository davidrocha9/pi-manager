import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import type { TabId } from "@/components/layout/app-sidebar"
import { AppShell } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectsView } from "@/components/projects/projects-view"
import { useHealth } from "@/hooks/use-health"
import { createQueryClient } from "@/lib/query-client"

const queryClient = createQueryClient()

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("projects")
  const [searchQuery, setSearchQuery] = useState("")
  const health = useHealth()

  const pageTitle = activeTab === "projects" ? "Dashboard" : "Pi Health"
  const healthError = health.isError ? health.error.message : null

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNewProject={() => undefined}
      showSearch={activeTab === "projects"}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <PageHeader
        title={pageTitle}
        description="Manage and monitor your Pi projects and system health."
        healthError={healthError}
      />
      {activeTab === "projects" ? (
        <div className="mt-6">
          <ProjectsView
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            onCreateProject={() => undefined}
          />
        </div>
      ) : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import type { TabId } from "@/components/layout/app-sidebar"
import { AppShell } from "@/components/layout/app-shell"
import { PageHeader } from "@/components/layout/page-header"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { ProjectsView } from "@/components/projects/projects-view"
import { PiHealthView } from "@/components/health/pi-health-view"
import { useHealth } from "@/hooks/use-health"
import { createQueryClient } from "@/lib/query-client"

const queryClient = createQueryClient()

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("projects")
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const health = useHealth()

  const pageTitle = activeTab === "projects" ? "Dashboard" : "Pi Health"
  const healthError = health.isError ? health.error.message : null

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onNewProject={() => setCreateOpen(true)}
      showSearch={activeTab === "projects"}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <PageHeader
        title={pageTitle}
        description="Manage and monitor your Pi projects and system health."
        healthError={healthError}
      />
      <div className="mt-6">
        {activeTab === "projects" ? (
          <ProjectsView
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            onCreateProject={() => setCreateOpen(true)}
          />
        ) : (
          <PiHealthView />
        )}
      </div>
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
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

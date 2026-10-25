import { AlertTriangle, RefreshCw, SearchX, Terminal } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/empty-state"
import { StaleBanner } from "@/components/stale-banner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useHealth } from "@/hooks/use-health"
import { useIsPhone } from "@/hooks/use-media-query"
import {
  useDeleteProject,
  useProjects,
  useStartProject,
  useStopProject,
} from "@/hooks/use-projects"
import type { Project } from "@/lib/api"
import { errorMessage } from "@/lib/utils"

import { DeleteProjectDialog } from "./delete-project-dialog"
import { LogDialog } from "./log-dialog"
import { ProjectCard } from "./project-card"
import { ProjectsTable } from "./projects-table"

type ProjectsViewProps = {
  searchQuery: string
  onClearSearch: () => void
  onCreateProject: () => void
}

export function filterProjects(projects: Project[], query: string): Project[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return projects

  return projects.filter((project) =>
    [project.id, project.description, project.path, project.status].some((field) =>
      field?.toLowerCase().includes(trimmed),
    ),
  )
}

function ProjectsSkeleton({ isPhone }: { isPhone: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <span className="sr-only">Loading projects</span>
      {isPhone ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <div className="mt-4 flex gap-2 border-t border-border/70 pt-4">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="size-9" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4">Directory</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Ports</TableHead>
                <TableHead className="px-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="ml-auto h-8 w-40" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export function ProjectsView({
  searchQuery,
  onClearSearch,
  onCreateProject,
}: ProjectsViewProps) {
  const isPhone = useIsPhone()
  const projectsQuery = useProjects()
  const healthQuery = useHealth()
  const startMutation = useStartProject()
  const stopMutation = useStopProject()
  const deleteMutation = useDeleteProject()

  const [logProjectId, setLogProjectId] = useState<string | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)

  const projects = projectsQuery.data ?? []
  const host = healthQuery.data?.tailscale_name || "localhost"

  const visibleProjects = useMemo(
    () => filterProjects(projects, searchQuery),
    [projects, searchQuery],
  )

  const isRowPending = (id: string) =>
    (startMutation.isPending && startMutation.variables === id) ||
    (stopMutation.isPending && stopMutation.variables === id) ||
    (deleteMutation.isPending && deleteMutation.variables === id)

  const handleStart = (id: string) => {
    startMutation.mutate(id, {
      onError: (error) => toast.error(`Error starting project: ${errorMessage(error)}`),
    })
  }

  const handleStop = (id: string) => {
    stopMutation.mutate(id, {
      onError: (error) => toast.error(`Error stopping project: ${errorMessage(error)}`),
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteProjectId) return

    deleteMutation.mutate(deleteProjectId, {
      onSuccess: () => setDeleteProjectId(null),
      onError: (error) => toast.error(`Error deleting project: ${errorMessage(error)}`),
    })
  }

  if (projectsQuery.isPending && !projectsQuery.data) {
    return <ProjectsSkeleton isPhone={isPhone} />
  }

  if (projectsQuery.isError && !projectsQuery.data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load projects"
        description={errorMessage(projectsQuery.error)}
        action={
          <Button type="button" onClick={() => void projectsQuery.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Retry
          </Button>
        }
      />
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Terminal}
        title="No projects found"
        description="Create a project to start managing its pipeline from Pi Manager."
        action={
          <Button type="button" onClick={onCreateProject}>
            Create project
          </Button>
        }
      />
    )
  }

  if (visibleProjects.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matching projects"
        description={`No projects match "${searchQuery}". Try a different search term.`}
        action={
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Clear search
          </Button>
        }
      />
    )
  }

  return (
    <section aria-labelledby="projects-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="projects-heading"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          All projects
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {searchQuery.trim() ? `${visibleProjects.length}/${projects.length}` : projects.length}
          </span>
        </h2>
      </div>

      {projectsQuery.isError && projectsQuery.data ? (
        <StaleBanner
          updatedAt={projectsQuery.dataUpdatedAt}
          onRetry={() => void projectsQuery.refetch()}
          retrying={projectsQuery.isFetching}
        />
      ) : null}

      {isPhone ? (
        <div className="grid gap-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              host={host}
              pending={isRowPending(project.id)}
              onStart={handleStart}
              onStop={handleStop}
              onViewLogs={setLogProjectId}
              onDelete={setDeleteProjectId}
            />
          ))}
        </div>
      ) : (
        <ProjectsTable
          projects={visibleProjects}
          host={host}
          isRowPending={isRowPending}
          onStart={handleStart}
          onStop={handleStop}
          onViewLogs={setLogProjectId}
          onDelete={setDeleteProjectId}
        />
      )}

      <LogDialog
        open={logProjectId !== null}
        onOpenChange={(open) => {
          if (!open) setLogProjectId(null)
        }}
        projectId={logProjectId}
      />

      <DeleteProjectDialog
        projectId={deleteProjectId}
        open={deleteProjectId !== null}
        pending={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteProjectId(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

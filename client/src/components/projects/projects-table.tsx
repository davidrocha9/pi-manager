import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Project } from "@/lib/api"

import { PortLinks } from "./project-links"
import { ProjectActions } from "./project-actions"
import { StatusBadge } from "./status-badge"

type ProjectsTableProps = {
  projects: Project[]
  host: string
  isRowPending: (id: string) => boolean
  onStart: (id: string) => void
  onStop: (id: string) => void
  onViewLogs: (id: string) => void
  onDelete: (id: string) => void
}

export function ProjectsTable({
  projects,
  host,
  isRowPending,
  onStart,
  onStop,
  onViewLogs,
  onDelete,
}: ProjectsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 text-[10px] tracking-[0.12em] uppercase">Name</TableHead>
            <TableHead className="px-4 text-[10px] tracking-[0.12em] uppercase">
              Description
            </TableHead>
            <TableHead className="px-4 text-[10px] tracking-[0.12em] uppercase">
              Directory
            </TableHead>
            <TableHead className="px-4 text-center text-[10px] tracking-[0.12em] uppercase">
              Status
            </TableHead>
            <TableHead className="px-4 text-[10px] tracking-[0.12em] uppercase">Ports</TableHead>
            <TableHead className="px-4 text-right text-[10px] tracking-[0.12em] uppercase">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow
              key={project.id}
              data-testid={`project-row-${project.id}`}
              className="hover:bg-muted/30"
            >
              <TableCell className="px-4 py-3 font-semibold text-foreground">
                {project.id}
              </TableCell>
              <TableCell className="max-w-[22rem] px-4 py-3">
                <span className="line-clamp-2 text-muted-foreground">
                  {project.description || "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[16rem] px-4 py-3">
                <span
                  className="block truncate font-mono text-xs text-muted-foreground"
                  title={project.path}
                >
                  {project.path || "—"}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <StatusBadge project={project} />
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <PortLinks ports={project.ports} host={host} />
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <div className="flex justify-end">
                  <ProjectActions
                    project={project}
                    pending={isRowPending(project.id)}
                    onStart={onStart}
                    onStop={onStop}
                    onViewLogs={onViewLogs}
                    onDelete={onDelete}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

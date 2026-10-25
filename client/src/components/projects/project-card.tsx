import { Activity, Command, Play } from "lucide-react"
import type { ReactNode } from "react"

import type { Project } from "@/lib/api"
import { cn } from "@/lib/utils"

import { PortLinks } from "./project-links"
import { ProjectActions } from "./project-actions"
import { StatusBadge } from "./status-badge"

type ProjectCardProps = {
  project: Project
  host: string
  pending: boolean
  onStart: (id: string) => void
  onStop: (id: string) => void
  onViewLogs: (id: string) => void
  onDelete: (id: string) => void
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Activity
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 pt-0.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  )
}

export function ProjectCard({
  project,
  host,
  pending,
  onStart,
  onStop,
  onViewLogs,
  onDelete,
}: ProjectCardProps) {
  return (
    <article
      data-testid={`project-card-${project.id}`}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
    >
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
              <Command className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold leading-tight text-foreground">{project.id}</h3>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Project
              </p>
            </div>
          </div>
          <StatusBadge project={project} className="shrink-0" />
        </div>

        <p
          className={cn(
            "mb-4 line-clamp-2 min-h-10 text-sm text-muted-foreground",
            !project.description && "italic",
          )}
        >
          {project.description || "No description provided for this project."}
        </p>

        <div className="space-y-2.5 border-t border-border/70 pt-4">
          <DetailRow icon={Activity} label="Check">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {project.check_cmd || "none"}
            </code>
          </DetailRow>
          <DetailRow icon={Play} label="Path">
            <span className="block truncate font-mono text-[11px] text-muted-foreground">
              {project.path || "—"}
            </span>
          </DetailRow>
          <div className="flex items-start justify-between gap-4 text-xs">
            <span className="pt-0.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Ports
            </span>
            <PortLinks ports={project.ports} host={host} className="justify-end" />
          </div>
        </div>

        <div className="mt-4 border-t border-border/70 pt-4">
          <ProjectActions
            project={project}
            pending={pending}
            stacked
            onStart={onStart}
            onStop={onStop}
            onViewLogs={onViewLogs}
            onDelete={onDelete}
          />
        </div>
      </div>
    </article>
  )
}

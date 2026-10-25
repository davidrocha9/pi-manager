import { Play, Square, Terminal, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Project } from "@/lib/api"
import { deriveDisplayStatus, isRunning } from "@/lib/status"
import { cn } from "@/lib/utils"

type ProjectActionsProps = {
  project: Pick<Project, "id" | "status" | "progress">
  pending: boolean
  stacked?: boolean
  onStart: (id: string) => void
  onStop: (id: string) => void
  onViewLogs: (id: string) => void
  onDelete: (id: string) => void
}

export function ProjectActions({
  project,
  pending,
  stacked = false,
  onStart,
  onStop,
  onViewLogs,
  onDelete,
}: ProjectActionsProps) {
  const running = isRunning(deriveDisplayStatus(project))

  return (
    <div className={cn("flex items-center gap-2", stacked && "w-full")}>
      {running ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className={cn("gap-1.5", stacked && "flex-1")}
          onClick={() => onStop(project.id)}
          disabled={pending}
          aria-label={`Stop ${project.id}`}
        >
          <Square className="size-3.5" aria-hidden="true" />
          Stop
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className={cn("gap-1.5", stacked && "flex-1")}
          onClick={() => onStart(project.id)}
          disabled={pending}
          aria-label={`Start ${project.id}`}
        >
          <Play className="size-3.5" aria-hidden="true" />
          Start
        </Button>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("gap-1.5", stacked && "flex-1")}
        onClick={() => onViewLogs(project.id)}
        aria-label={`View logs for ${project.id}`}
      >
        <Terminal className="size-3.5" aria-hidden="true" />
        Logs
      </Button>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onDelete(project.id)}
        disabled={pending}
        aria-label={`Delete ${project.id}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}

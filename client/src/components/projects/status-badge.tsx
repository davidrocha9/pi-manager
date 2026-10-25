import { cn } from "@/lib/utils"
import { deriveDisplayStatus, statusLabel, statusTone } from "@/lib/status"
import type { Project } from "@/lib/api"

type StatusBadgeProps = {
  project: Pick<Project, "status" | "progress" | "current_step">
  className?: string
}

/**
 * The only place project status tones are applied. Badges, cards, and controls
 * all read from the same mapping (R12).
 */
export function StatusBadge({ project, className }: StatusBadgeProps) {
  const display = deriveDisplayStatus(project)
  const tone = statusTone(display)
  const showStep = display === "BOOTING"

  return (
    <span
      data-status={display}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
        tone.surface,
        tone.text,
        tone.border,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", tone.dot, tone.pulse && "animate-pulse")}
        aria-hidden="true"
      />
      <span className="flex flex-col leading-tight">
        <span>{statusLabel(display)}</span>
        {showStep ? (
          <span className="text-[9px] font-medium normal-case opacity-80">
            {project.current_step
              ? `${project.current_step} · ${project.progress}%`
              : `${project.progress}%`}
          </span>
        ) : null}
      </span>
    </span>
  )
}

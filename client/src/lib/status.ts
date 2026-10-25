import type { Project } from "@/lib/api"

export type DisplayStatus = "ACTIVE" | "BOOTING" | "FAILED" | "IDLE"

export type StatusTone = {
  dot: string
  surface: string
  text: string
  border: string
  pulse: boolean
}

const TONES: Record<DisplayStatus, StatusTone> = {
  ACTIVE: {
    dot: "bg-success",
    surface: "bg-success-surface",
    text: "text-success-foreground",
    border: "border-success/30",
    pulse: false,
  },
  BOOTING: {
    dot: "bg-warning",
    surface: "bg-warning-surface",
    text: "text-warning-foreground",
    border: "border-warning/30",
    pulse: true,
  },
  FAILED: {
    dot: "bg-danger",
    surface: "bg-danger-surface",
    text: "text-danger-foreground",
    border: "border-danger/30",
    pulse: false,
  },
  IDLE: {
    dot: "bg-muted-foreground/50",
    surface: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    pulse: false,
  },
}

/**
 * BOOTING at 100% is a finished boot, so the surface reads ACTIVE. Every
 * presentation consumes this one derivation (R12).
 */
export function deriveDisplayStatus(
  project: Pick<Project, "status" | "progress">,
): DisplayStatus {
  switch (project.status) {
    case "BOOTING":
      return project.progress === 100 ? "ACTIVE" : "BOOTING"
    case "ACTIVE":
      return "ACTIVE"
    case "FAILED":
      return "FAILED"
    default:
      return "IDLE"
  }
}

export function statusTone(status: DisplayStatus): StatusTone {
  return TONES[status]
}

export function statusLabel(status: DisplayStatus): string {
  return status
}

export function isRunning(status: DisplayStatus): boolean {
  return status === "ACTIVE" || status === "BOOTING"
}

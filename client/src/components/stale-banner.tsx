import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type StaleBannerProps = {
  updatedAt: number
  onRetry: () => void
  retrying?: boolean
  now?: number
}

/**
 * Shown when a poll fails but cached data exists: without it a dead
 * collector looks identical to a healthy one (keepPreviousData).
 */
export function StaleBanner({ updatedAt, onRetry, retrying = false, now = Date.now() }: StaleBannerProps) {
  const ageSeconds = Math.max(0, Math.round((now - updatedAt) / 1000))

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning-surface px-4 py-2.5"
    >
      <p className="flex items-center gap-2 text-sm text-warning-foreground">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        Showing data from {ageSeconds}s ago — the latest refresh failed.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="min-h-11 gap-1.5 sm:min-h-0"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}

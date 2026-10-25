import * as React from "react"

import { StaleBanner } from "@/components/stale-banner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePiHealth } from "@/hooks/use-pi-health"
import type { PiHealth, PiHistoryPoint } from "@/lib/api"
import {
  METRIC_IDS,
  METRICS,
  TIMEFRAME_IDS,
  TIMEFRAMES,
  type MetricId,
  type TimeframeId,
} from "@/lib/health"

const EMPTY_HISTORY: PiHistoryPoint[] = []

import { HealthChart } from "./health-chart"
import { MetricCards } from "./metric-cards"

function HostStrip({ health }: { health: PiHealth }) {
  const loads = [
    { label: "1m", value: health.load_avg_1 },
    { label: "5m", value: health.load_avg_5 },
    { label: "15m", value: health.load_avg_15 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-border bg-card px-4 py-3.5 sm:px-5">
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-tight">
            {health.hostname || "N/A"}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Live system metrics
          </span>
        </span>
      </span>

      <span className="hidden h-9 w-px bg-border sm:block" aria-hidden="true" />

      <span className="min-w-0">
        <span className="block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Uptime
        </span>
        <span className="block truncate text-sm font-semibold tabular-nums">
          {health.uptime || "N/A"}
        </span>
      </span>

      <span className="hidden h-9 w-px bg-border sm:block" aria-hidden="true" />

      <span>
        <span className="block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          Load average
        </span>
        <span className="flex items-baseline gap-3">
          {loads.map(({ label, value }) => (
            <span key={label} className="flex items-baseline gap-1">
              <span className="text-sm font-semibold tabular-nums">
                {value?.toFixed(2) ?? "0.00"}
              </span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </span>
          ))}
        </span>
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading Pi health">
      <div className="rounded-xl border border-border p-4">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRIC_IDS.map((key) => (
          <div key={key} className="min-h-[104px] rounded-xl border border-border p-3.5">
            <Skeleton className="mb-2 h-4 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4">
        <Skeleton className="h-full min-h-60" />
      </div>
    </div>
  )
}

export function PiHealthView() {
  const [metric, setMetric] = React.useState<MetricId>("cpu")
  const [timeframe, setTimeframe] = React.useState<TimeframeId>("hour")
  const piHealth = usePiHealth()
  const health = piHealth.data

  if (piHealth.isPending && !health) {
    return <LoadingSkeleton />
  }

  if (piHealth.isError && !health) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-surface p-6 text-center">
        <p className="font-medium text-danger-foreground">Failed to load Pi health data</p>
        <p className="mt-1 text-sm text-muted-foreground">{piHealth.error.message}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 min-h-11"
          onClick={() => void piHealth.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!health) return null

  const activeConfig = METRICS[metric]

  return (
    <div className="flex flex-col gap-4">
      {piHealth.isError && health ? (
        <StaleBanner
          updatedAt={piHealth.dataUpdatedAt}
          onRetry={() => void piHealth.refetch()}
          retrying={piHealth.isFetching}
        />
      ) : null}
      <HostStrip health={health} />
      <MetricCards health={health} selected={metric} onSelect={setMetric} />

      <Card className="flex min-w-0 flex-col overflow-hidden">
        <CardContent className="flex flex-col gap-2 p-4 sm:p-6">
          <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span
                className="size-3.5 shrink-0 rounded-[4px]"
                style={{ backgroundColor: activeConfig.color }}
                aria-hidden="true"
              />
              <h4 className="text-[15px] font-semibold tracking-tight">{activeConfig.label}</h4>
            </div>

            <Tabs
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as TimeframeId)}
            >
              <TabsList className="max-w-full overflow-x-auto">
                {TIMEFRAME_IDS.map((id) => (
                  <TabsTrigger key={id} value={id} className="min-h-11 sm:min-h-0">
                    {TIMEFRAMES[id].shortLabel}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <HealthChart history={health.history ?? EMPTY_HISTORY} metric={metric} timeframe={timeframe} />
        </CardContent>
      </Card>
    </div>
  )
}

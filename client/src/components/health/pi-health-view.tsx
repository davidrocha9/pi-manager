import * as React from "react"
import { Clock, Gauge, Server } from "lucide-react"

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

function IdentityCards({ health }: { health: PiHealth }) {
  const cards = [
    {
      icon: Server,
      label: "Hostname",
      value: health.hostname || "N/A",
    },
    {
      icon: Clock,
      label: "Uptime",
      value: health.uptime || "N/A",
    },
    {
      icon: Gauge,
      label: "Load Average",
      value: `${health.load_avg_1?.toFixed(2) ?? 0}, ${health.load_avg_5?.toFixed(2) ?? 0}, ${health.load_avg_15?.toFixed(2) ?? 0}`,
    },
  ]

  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(({ icon: Icon, label, value }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </span>
              <span className="block truncate text-lg font-bold tabular-nums">{value}</span>
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading Pi health">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {["hostname", "uptime", "load"].map((key) => (
          <div key={key} className="rounded-xl border border-border p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid grid-cols-2 gap-3 lg:flex lg:w-56 lg:flex-col">
          {METRIC_IDS.map((key) => (
            <div key={key} className="min-h-[110px] flex-1 rounded-xl border border-border p-4">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-xl border border-border p-4">
          <Skeleton className="h-full min-h-40" />
        </div>
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
      <IdentityCards health={health} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <MetricCards health={health} selected={metric} onSelect={setMetric} />

        <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
            <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: activeConfig.color }}
                  aria-hidden="true"
                />
                <h4 className="text-lg font-bold">{activeConfig.label}</h4>
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

            <div className="min-h-0 flex-1 rounded-lg border border-border/50 bg-muted/30 p-2 sm:p-4">
              <HealthChart history={health.history ?? EMPTY_HISTORY} metric={metric} timeframe={timeframe} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

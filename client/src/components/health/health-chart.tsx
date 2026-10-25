import * as React from "react"
import { Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { PiHistoryPoint } from "@/lib/api"
import {
  downsample,
  filterByTimeframe,
  formatXLabel,
  labelIndices,
  METRICS,
  toChartPoints,
  yDomain,
  type MetricId,
  type TimeframeId,
} from "@/lib/health"

type HealthChartProps = {
  history: PiHistoryPoint[]
  metric: MetricId
  timeframe: TimeframeId
  now?: number
}

export function HealthChart({ history, metric, timeframe, now = Date.now() }: HealthChartProps) {
  const config = METRICS[metric]
  const gradientId = React.useId().replace(/:/g, "")

  const series = React.useMemo(() => {
    const filtered = filterByTimeframe(history, timeframe, now)
    return downsample(toChartPoints(filtered, metric))
  }, [history, metric, timeframe, now])

  const data = React.useMemo(
    () =>
      series.map((point) => ({
        t: point.time.getTime(),
        value: point.value,
      })),
    [series],
  )

  const ticks = React.useMemo(
    () => labelIndices(series, timeframe).map((index) => data[index]?.t ?? 0),
    [series, timeframe, data],
  )

  const chartConfig = React.useMemo(
    () =>
      ({
        value: { label: config.label, color: config.color },
      }) satisfies ChartConfig,
    [config],
  )

  const summary = React.useMemo(() => {
    if (series.length === 0) return null
    const values = series.map((point) => point.value)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
      latestTime: series[series.length - 1].time,
    }
  }, [series])

  if (series.length === 0 || !summary) {
    return (
      <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 text-muted-foreground sm:min-h-[280px]">
        <Activity className="animate-pulse" size={24} aria-hidden="true" />
        <p className="text-[10px] font-bold tracking-widest uppercase">
          No data for this timeframe
        </p>
      </div>
    )
  }

  const ariaLabel =
    `${config.label} chart, latest ${summary.latest.toFixed(1)}${config.unit}, ` +
    `ranging from ${summary.min.toFixed(1)}${config.unit} to ${summary.max.toFixed(1)}${config.unit}`

  return (
    <div>
      <ChartContainer
        config={chartConfig}
        role="img"
        aria-label={ariaLabel}
        className="h-[220px] w-full sm:min-h-[280px]"
      >
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={config.color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={(tick: number | string) =>
              formatXLabel(new Date(Number(tick)), timeframe)
            }
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            minTickGap={8}
          />
          <YAxis
            domain={yDomain(metric)}
            tickFormatter={(tick: number | string) => `${tick}${config.unit}`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={48}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label: unknown) =>
                  new Date(Number(label)).toLocaleString()
                }
                formatter={(value) => `${Number(value).toFixed(1)}${config.unit}`}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            name={config.label}
            stroke={config.color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ChartContainer>
      <p className="sr-only">
        {config.label}: latest {summary.latest.toFixed(1)}
        {config.unit} at {summary.latestTime.toLocaleString()}, minimum{" "}
        {summary.min.toFixed(1)}
        {config.unit}, maximum {summary.max.toFixed(1)}
        {config.unit}.
      </p>
    </div>
  )
}

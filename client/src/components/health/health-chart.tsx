import * as React from "react"
import { Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { EmptyState } from "@/components/empty-state"
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

const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 }
const AXIS_TICK = { fontSize: 10 }

type HealthChartProps = {
  history: PiHistoryPoint[]
  metric: MetricId
  timeframe: TimeframeId
  now?: number
}

export function HealthChart({ history, metric, timeframe, now: nowProp }: HealthChartProps) {
  const config = METRICS[metric]
  const gradientId = React.useId().replace(/:/g, "")

  // Pinned to the poll response: Date.now() in render would bust every memo below.
  const now = React.useMemo(
    () => nowProp ?? Date.now(),
    // `history` identity changes on each poll, which is exactly when `now` must advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowProp, history, timeframe],
  )

  const series = React.useMemo(() => {
    const filtered = filterByTimeframe(history, timeframe, now)
    return downsample(toChartPoints(filtered, metric))
  }, [history, metric, timeframe, now])

  const { data, min, max, latest, latestTime } = React.useMemo(() => {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    const data = series.map((point) => {
      if (point.value < min) min = point.value
      if (point.value > max) max = point.value
      return { t: point.time.getTime(), value: point.value }
    })
    const last = series[series.length - 1]
    return { data, min, max, latest: last?.value ?? 0, latestTime: last?.time }
  }, [series])

  const tickLabels = React.useMemo(() => {
    const labels = new Map<number, string>()
    for (const index of labelIndices(series, timeframe)) {
      const t = series[index]?.time.getTime()
      if (t !== undefined) labels.set(t, formatXLabel(new Date(t), timeframe))
    }
    return labels
  }, [series, timeframe])

  const ticks = React.useMemo(() => [...tickLabels.keys()], [tickLabels])

  const chartConfig = React.useMemo(
    () =>
      ({
        value: { label: config.label, color: config.color },
      }) satisfies ChartConfig,
    [config],
  )

  const domain = React.useMemo(() => yDomain(metric), [metric])

  const formatTick = React.useCallback(
    (tick: number | string) => tickLabels.get(Number(tick)) ?? "",
    [tickLabels],
  )
  const formatAxisValue = React.useCallback(
    (tick: number | string) => `${tick}${config.unit}`,
    [config.unit],
  )
  const formatTooltipLabel = React.useCallback(
    (label: unknown) => new Date(Number(label)).toLocaleString(),
    [],
  )
  const formatTooltipValue = React.useCallback(
    (value: number | string) => `${Number(value).toFixed(1)}${config.unit}`,
    [config.unit],
  )

  if (series.length === 0 || latestTime === undefined) {
    return (
      <EmptyState
        icon={Activity}
        title="No data for this timeframe"
        description={`No ${config.label.toLowerCase()} readings fall inside the selected window.`}
        className="h-[220px] border-0 bg-transparent sm:min-h-[280px]"
      />
    )
  }

  const ariaLabel =
    `${config.label} chart, latest ${latest.toFixed(1)}${config.unit}, ` +
    `ranging from ${min.toFixed(1)}${config.unit} to ${max.toFixed(1)}${config.unit}`

  return (
    <>
      <ChartContainer
        config={chartConfig}
        role="img"
        aria-label={ariaLabel}
        className="h-[220px] w-full sm:min-h-[280px]"
      >
        <AreaChart data={data} margin={CHART_MARGIN}>
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
            tickFormatter={formatTick}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            minTickGap={8}
          />
          <YAxis
            domain={domain}
            tickFormatter={formatAxisValue}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={48}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={formatTooltipLabel}
                formatter={(value) => formatTooltipValue(value as number | string)}
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
        {config.label}: latest {latest.toFixed(1)}
        {config.unit} at {latestTime.toLocaleString()}, minimum {min.toFixed(1)}
        {config.unit}, maximum {max.toFixed(1)}
        {config.unit}.
      </p>
    </>
  )
}

import type { PiHistoryPoint } from "@/lib/api"

export type MetricId = "cpu" | "memory" | "temperature" | "disk"
export type TimeframeId = "hour" | "day" | "month" | "all"

export type MetricConfig = {
  label: string
  shortLabel: string
  /** Key into PiHistoryPoint plus the live PiHealth reading. */
  key: "cpu_usage" | "memory_percent" | "temperature" | "disk_percent"
  color: string
  unit: string
  /** Pinned Y maximum so small readings do not fill the frame. */
  max: number
}

export const METRICS: Record<MetricId, MetricConfig> = {
  cpu: {
    label: "CPU Usage",
    shortLabel: "CPU",
    key: "cpu_usage",
    color: "var(--chart-1)",
    unit: "%",
    max: 100,
  },
  memory: {
    label: "Memory",
    shortLabel: "Memory",
    key: "memory_percent",
    color: "var(--chart-2)",
    unit: "%",
    max: 100,
  },
  temperature: {
    label: "Temperature",
    shortLabel: "Temp",
    key: "temperature",
    color: "var(--chart-3)",
    unit: "°C",
    max: 85,
  },
  disk: {
    label: "Disk Usage",
    shortLabel: "Disk",
    key: "disk_percent",
    color: "var(--chart-4)",
    unit: "%",
    max: 100,
  },
}

export const METRIC_IDS = Object.keys(METRICS) as MetricId[]

export type TimeframeConfig = {
  label: string
  shortLabel: string
  /** Window in milliseconds; `all` is unbounded. */
  durationMs: number
}

export const TIMEFRAMES: Record<TimeframeId, TimeframeConfig> = {
  hour: { label: "Last Hour", shortLabel: "Hour", durationMs: 60 * 60 * 1000 },
  day: { label: "Last Day", shortLabel: "Day", durationMs: 24 * 60 * 60 * 1000 },
  month: { label: "Last Month", shortLabel: "Month", durationMs: 30 * 24 * 60 * 60 * 1000 },
  all: { label: "All Time", shortLabel: "All", durationMs: Number.POSITIVE_INFINITY },
}

export const TIMEFRAME_IDS = Object.keys(TIMEFRAMES) as TimeframeId[]

export type ChartPoint = {
  time: Date
  value: number
}

/** Keeps points inside the window; boundary points are included. */
export function filterByTimeframe(
  history: PiHistoryPoint[],
  timeframe: TimeframeId,
  now: number,
): PiHistoryPoint[] {
  if (timeframe === "all") return history.slice()
  const startTime = now - TIMEFRAMES[timeframe].durationMs

  return history.filter((point) => new Date(point.time).getTime() >= startTime)
}

/** Attaches the selected metric's value to pre-filtered points. */
export function toChartPoints(history: PiHistoryPoint[], metric: MetricId): ChartPoint[] {
  const key = METRICS[metric].key
  return history.map((point) => ({
    time: new Date(point.time),
    value: point[key] ?? 0,
  }))
}

const DOWNSAMPLE_TARGET = 300

/**
 * Stride sampling that keeps the responsive chart cheap. It preserves the
 * first point, does not guarantee the last, and can land just above the
 * target when the length is not a multiple of the stride.
 */
export function downsample<T>(series: T[], target: number = DOWNSAMPLE_TARGET): T[] {
  if (series.length <= target) return series
  const step = Math.floor(series.length / target)
  if (step <= 1) return series
  return series.filter((_, index) => index % step === 0)
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Label keys per timeframe. A point earns a label when its key differs from
 * the previous labeled point's key; distinct prefixes keep the per-timeframe
 * rules from colliding.
 */
const LABEL_RULES: Record<TimeframeId, (date: Date) => string | null> = {
  hour: (date) => (date.getMinutes() % 5 === 0 ? `m:${date.getMinutes()}` : null),
  day: (date) => (date.getMinutes() === 0 ? `h:${date.getHours()}` : null),
  month: (date) =>
    date.getHours() === 0 && date.getMinutes() === 0 ? `d:${date.getDate()}` : null,
  all: (date) =>
    date.getDay() === 1 && date.getHours() === 0 && date.getMinutes() === 0
      ? `w:${Math.floor(date.getTime() / WEEK_MS)}`
      : null,
}

/**
 * Picks X-axis label positions following the per-timeframe density rules:
 * 5-minute marks for the hour, hourly marks for the day, midnights for the
 * month, Monday midnights for all time. Falls back to first/last when fewer
 * than two labels match.
 */
export function labelIndices(series: ChartPoint[], timeframe: TimeframeId): number[] {
  if (series.length < 2) return []
  const rule = LABEL_RULES[timeframe]
  const labels: number[] = []
  let lastKey: string | null = null

  series.forEach((point, index) => {
    const key = rule(point.time)
    if (key !== null && key !== lastKey) {
      lastKey = key
      labels.push(index)
    }
  })

  if (labels.length < 2) return [0, series.length - 1]
  return labels
}

export type TemperatureTone = "danger" | "warning" | "success"

export function temperatureTone(value: number): TemperatureTone {
  if (value >= 70) return "danger"
  if (value >= 50) return "warning"
  return "success"
}

/** Pinned Y domain for the chart: [0, metric max]. */
export function yDomain(metric: MetricId): [number, number] {
  return [0, METRICS[metric].max]
}

export function formatXLabel(date: Date, timeframe: TimeframeId): string {
  if (timeframe === "hour" || timeframe === "day") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

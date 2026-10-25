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

const TIMEFRAME_DURATIONS: Record<TimeframeId, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: Number.POSITIVE_INFINITY,
}

export const TIMEFRAMES: Record<TimeframeId, string> = {
  hour: "Last Hour",
  day: "Last Day",
  month: "Last Month",
  all: "All Time",
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
  const duration = TIMEFRAME_DURATIONS[timeframe]
  const startTime = duration === Number.POSITIVE_INFINITY ? 0 : now - duration

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
  return series.filter((_, index) => index % step === 0)
}

/**
 * Picks X-axis label positions following the per-timeframe density rules:
 * 5-minute marks for the hour, hourly marks for the day, midnights for the
 * month, Monday midnights for all time. Falls back to first/last when fewer
 * than two labels match.
 */
export function labelIndices(series: ChartPoint[], timeframe: TimeframeId): number[] {
  if (series.length < 2) return []
  const labels: number[] = []

  let lastMinute = -1
  let lastHour = -1
  let lastDay = -1
  let lastWeek = -1

  series.forEach((point, index) => {
    const date = point.time
    const minute = date.getMinutes()
    const hour = date.getHours()
    const day = date.getDate()
    const dayOfWeek = date.getDay()

    let push = false
    if (timeframe === "hour") {
      if (minute % 5 === 0 && minute !== lastMinute) {
        push = true
        lastMinute = minute
      }
    } else if (timeframe === "day") {
      if (minute === 0 && hour !== lastHour) {
        push = true
        lastHour = hour
      }
    } else if (timeframe === "month") {
      if (hour === 0 && minute === 0 && day !== lastDay) {
        push = true
        lastDay = day
      }
    } else {
      const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))
      if (dayOfWeek === 1 && hour === 0 && minute === 0 && week !== lastWeek) {
        push = true
        lastWeek = week
      }
    }

    if (push) labels.push(index)
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

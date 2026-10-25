import { describe, expect, it } from "vitest"

import type { PiHistoryPoint } from "@/lib/api"

import {
  downsample,
  filterByTimeframe,
  formatXLabel,
  labelIndices,
  temperatureTone,
  toChartPoints,
  yDomain,
  type ChartPoint,
} from "./health"

function point(time: Date, value = 10): PiHistoryPoint {
  return {
    time: time.toISOString(),
    cpu_usage: value,
    memory_percent: value,
    temperature: value,
    disk_percent: value,
  }
}

describe("filterByTimeframe", () => {
  it("excludes points older than the window but keeps boundary points", () => {
    const now = new Date(2026, 9, 25, 12, 0, 0).getTime()
    const history = [
      point(new Date(now - 61 * 60 * 1000)),
      point(new Date(now - 60 * 60 * 1000)),
      point(new Date(now - 30 * 60 * 1000)),
      point(new Date(now)),
    ]

    const filtered = filterByTimeframe(history, "hour", now)

    expect(filtered).toHaveLength(3)
    expect(filtered[0]).toBe(history[1])
  })

  it("returns everything undownsampled for the all timeframe", () => {
    const history = Array.from({ length: 500 }, (_, i) =>
      point(new Date(2026, 0, 1 + Math.floor(i / 24), i % 24)),
    )

    expect(filterByTimeframe(history, "all", Date.now())).toHaveLength(500)
  })
})

describe("toChartPoints", () => {
  it("binds the selected metric key", () => {
    const history = [
      { ...point(new Date(2026, 9, 25, 12, 0)), cpu_usage: 42, temperature: 55 },
    ]

    expect(toChartPoints(history, "cpu")[0].value).toBe(42)
    expect(toChartPoints(history, "temperature")[0].value).toBe(55)
  })
})

describe("downsample", () => {
  it("reduces a 1,200-point series to at or below 300 and preserves the first point", () => {
    const series = Array.from({ length: 1200 }, (_, i) => i)

    const sampled = downsample(series)

    expect(sampled.length).toBeLessThanOrEqual(300)
    expect(sampled[0]).toBe(0)
  })

  it("leaves short series untouched", () => {
    expect(downsample([1, 2, 3])).toEqual([1, 2, 3])
  })

  it("samples on a fixed stride", () => {
    const series = Array.from({ length: 1000 }, (_, i) => i)

    const sampled = downsample(series)

    expect(sampled[0]).toBe(0)
    for (let i = 1; i < sampled.length; i += 1) {
      expect(sampled[i] - sampled[i - 1]).toBe(3)
    }
  })

  it("returns the series as-is when no reduction is possible", () => {
    const series = Array.from({ length: 301 }, (_, i) => i)

    expect(downsample(series)).toHaveLength(301)
  })
})

describe("labelIndices", () => {
  function chartSeries(minutes: number[], base = new Date(2026, 9, 25, 10, 0)): ChartPoint[] {
    return minutes.map((m) => ({
      time: new Date(base.getTime() + m * 60 * 1000),
      value: 10,
    }))
  }

  it("yields 5-minute marks for the hour timeframe", () => {
    const series = chartSeries(Array.from({ length: 60 }, (_, i) => i))

    expect(labelIndices(series, "hour")).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  })

  it("yields hourly marks for the day timeframe", () => {
    const base = new Date(2026, 5, 15, 0, 0)
    const series = Array.from({ length: 25 }, (_, h) => ({
      time: new Date(base.getTime() + h * 60 * 60 * 1000),
      value: 10,
    }))

    expect(labelIndices(series, "day")).toHaveLength(25)
    expect(labelIndices(series, "day")[0]).toBe(0)
  })

  it("yields daily midnights for the month timeframe", () => {
    const base = new Date(2026, 5, 1, 0, 0)
    const series = Array.from({ length: 30 }, (_, d) => ({
      time: new Date(base.getTime() + d * 24 * 60 * 60 * 1000),
      value: 10,
    }))

    expect(labelIndices(series, "month")).toHaveLength(30)
  })

  it("yields Monday midnights for the all timeframe", () => {
    // 2026-06-01 is a Monday; weekly Monday-midnight points.
    const base = new Date(2026, 5, 1, 0, 0)
    const series = Array.from({ length: 5 }, (_, w) => ({
      time: new Date(base.getTime() + w * 7 * 24 * 60 * 60 * 1000),
      value: 10,
    }))

    expect(labelIndices(series, "all")).toEqual([0, 1, 2, 3, 4])
  })

  it("falls back to first and last when fewer than two labels match", () => {
    const series = chartSeries([1, 2])

    expect(labelIndices(series, "hour")).toEqual([0, 1])
  })

  it("returns no labels for a single point", () => {
    expect(labelIndices(chartSeries([0]), "hour")).toEqual([])
  })
})

describe("temperatureTone", () => {
  it("returns danger at 70+, warning at 50-69.9, and success below 50", () => {
    expect(temperatureTone(70)).toBe("danger")
    expect(temperatureTone(85)).toBe("danger")
    expect(temperatureTone(50)).toBe("warning")
    expect(temperatureTone(69.9)).toBe("warning")
    expect(temperatureTone(49.9)).toBe("success")
  })
})

describe("yDomain", () => {
  it("pins temperature at 85 and every other metric at 100", () => {
    expect(yDomain("temperature")).toEqual([0, 85])
    expect(yDomain("cpu")).toEqual([0, 100])
    expect(yDomain("memory")).toEqual([0, 100])
    expect(yDomain("disk")).toEqual([0, 100])
  })
})

describe("formatXLabel", () => {
  it("formats hour and day as times and month as dates", () => {
    const date = new Date(2026, 9, 25, 14, 5)
    expect(formatXLabel(date, "hour")).toMatch(/14/)
    expect(formatXLabel(date, "day")).toMatch(/14/)
    expect(formatXLabel(date, "month")).toMatch(/Oct/)
  })
})

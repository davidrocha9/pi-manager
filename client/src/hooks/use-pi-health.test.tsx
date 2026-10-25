import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getPiHealth } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { usePiHealth } from "./use-pi-health"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, getPiHealth: vi.fn() }
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("usePiHealth", () => {
  it("polls at five seconds and stops when the consumer unmounts", async () => {
    vi.useFakeTimers()
    vi.mocked(getPiHealth).mockResolvedValue({
      cpu_usage: 10,
      memory_total: 8000,
      memory_used: 4000,
      memory_percent: 50,
      temperature: 45,
      disk_total: 100,
      disk_used: 40,
      disk_percent: 40,
      load_avg_1: 0.5,
      load_avg_5: 0.4,
      load_avg_15: 0.3,
      uptime: "3 days",
      history: [],
    })
    const client = createTestQueryClient()

    const { unmount } = renderHook(() => usePiHealth(), {
      wrapper: queryWrapper(client),
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getPiHealth).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100)
    })
    expect(getPiHealth).toHaveBeenCalledTimes(2)

    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })
    expect(getPiHealth).toHaveBeenCalledTimes(2)
  })
})

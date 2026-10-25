import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getHealth } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { useHealth } from "./use-health"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, getHealth: vi.fn() }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("useHealth", () => {
  it("exposes tailscale_name from the /health response", async () => {
    vi.mocked(getHealth).mockResolvedValue({
      ok: true,
      last_check: "2026-10-25T10:00:00Z",
      tailscale_name: "pi.tailnet.ts.net",
    })
    const client = createTestQueryClient()

    const { result } = renderHook(() => useHealth(), {
      wrapper: queryWrapper(client),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(result.current.data?.tailscale_name).toBe("pi.tailnet.ts.net")
  })

  it("polls at two seconds and stops when the consumer unmounts", async () => {
    vi.useFakeTimers()
    vi.mocked(getHealth).mockResolvedValue({
      ok: true,
      last_check: "2026-10-25T10:00:00Z",
      tailscale_name: "pi-box",
    })
    const client = createTestQueryClient()

    const { unmount } = renderHook(() => useHealth(), {
      wrapper: queryWrapper(client),
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getHealth).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100)
    })
    expect(getHealth).toHaveBeenCalledTimes(2)

    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000)
    })
    expect(getHealth).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })
})

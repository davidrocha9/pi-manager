import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { piHealthQueryKey } from "@/hooks/use-pi-health"
import { getPiHealth, type PiHealth, type PiHistoryPoint } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { PiHealthView } from "./pi-health-view"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, getPiHealth: vi.fn() }
})

function historyPoint(minutesAgo: number, value: number): PiHistoryPoint {
  return {
    time: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
    cpu_usage: value,
    memory_percent: value + 1,
    temperature: 40 + value / 10,
    disk_percent: value + 2,
  }
}

function makeHealth(overrides: Partial<PiHealth> = {}): PiHealth {
  return {
    hostname: "pi-box",
    cpu_usage: 12.5,
    memory_total: 8000,
    memory_used: 4000,
    memory_percent: 50,
    temperature: 45.2,
    disk_total: 100,
    disk_used: 40,
    disk_percent: 40,
    load_avg_1: 0.5,
    load_avg_5: 0.4,
    load_avg_15: 0.3,
    uptime: "3 days",
    history: Array.from({ length: 25 }, (_, i) => historyPoint((24 - i) * 5, 10 + i)),
    ...overrides,
  }
}

function renderView(health?: PiHealth, reject?: Error) {
  const client = createTestQueryClient()
  if (health) client.setQueryData<PiHealth>(piHealthQueryKey, health)
  if (reject) {
    vi.mocked(getPiHealth).mockRejectedValue(reject)
  } else {
    vi.mocked(getPiHealth).mockResolvedValue(health ?? makeHealth())
  }

  render(<PiHealthView />, { wrapper: queryWrapper(client) })
  return client
}

beforeEach(() => {
  vi.mocked(getPiHealth).mockResolvedValue(makeHealth())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("PiHealthView", () => {
  it("renders the host strip with identity, uptime, and per-window load", async () => {
    renderView(makeHealth())

    expect(await screen.findByText("pi-box")).toBeInTheDocument()
    expect(screen.getByText("Live system metrics")).toBeInTheDocument()
    expect(screen.getByText("3 days")).toBeInTheDocument()
    expect(screen.getByText("0.50")).toBeInTheDocument()
    expect(screen.getByText("0.40")).toBeInTheDocument()
    expect(screen.getByText("0.30")).toBeInTheDocument()
    expect(screen.getByText("1m")).toBeInTheDocument()
    expect(screen.getByText("5m")).toBeInTheDocument()
    expect(screen.getByText("15m")).toBeInTheDocument()
  })

  it("switching metric changes the chart binding without a refetch", async () => {
    const user = userEvent.setup()
    renderView(makeHealth())

    const chart = await screen.findByRole("img", { name: /CPU Usage chart/ })
    expect(chart).toHaveAccessibleName(expect.stringContaining("34.0%"))

    await user.click(screen.getByRole("button", { name: /Temp45\.2°C/ }))

    expect(await screen.findByRole("img", { name: /Temperature chart/ })).toHaveAccessibleName(
      expect.stringContaining("43.4°C"),
    )
    expect(getPiHealth).toHaveBeenCalledTimes(1)
  })

  it("updates the hidden summary when the metric changes", async () => {
    const user = userEvent.setup()
    renderView(makeHealth())

    await screen.findByRole("img", { name: /CPU Usage chart/ })
    await user.click(screen.getByRole("button", { name: /Disk/ }))

    const chart = await screen.findByRole("img", { name: /Disk Usage chart/ })
    expect(chart).toHaveAccessibleName(expect.stringContaining("Disk Usage"))
  })

  it("shows a visible min/latest/max summary for the active metric", async () => {
    renderView(makeHealth())

    const summary = await screen.findByTestId("chart-summary")
    for (const label of ["Min", "Latest", "Max"]) {
      expect(within(summary).getByText(label)).toBeInTheDocument()
    }
    // Latest and Max coincide on rising fixture data.
    expect(within(summary).getAllByText("34.0%")).toHaveLength(2)
  })

  it("renders the empty state instead of an axis with no series", async () => {
    renderView(makeHealth({ history: [] }))

    expect(await screen.findByText("No data for this timeframe")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("renders the error state with a working retry when the request fails", async () => {
    const user = userEvent.setup()
    renderView(undefined, new Error("collector offline"))

    expect(await screen.findByText("Failed to load Pi health data")).toBeInTheDocument()
    expect(screen.getByText("collector offline")).toBeInTheDocument()
    expect(screen.queryByText("No data for this timeframe")).not.toBeInTheDocument()

    vi.mocked(getPiHealth).mockResolvedValue(makeHealth())
    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText("pi-box")).toBeInTheDocument()
    await waitFor(() => expect(getPiHealth).toHaveBeenCalledTimes(2))
  })

  it("shows a stale banner with a working retry when refresh fails after success", async () => {
    const user = userEvent.setup()
    renderView(makeHealth(), new Error("collector hiccup"))

    expect(await screen.findByRole("status")).toHaveTextContent(/Showing data from \d+s ago/)
    expect(screen.queryByText("Failed to load Pi health data")).not.toBeInTheDocument()

    const fresh = makeHealth({ hostname: "pi-box-2" })
    vi.mocked(getPiHealth).mockResolvedValue(fresh)
    await user.click(screen.getByRole("button", { name: "Retry" }))

    expect(await screen.findByText("pi-box-2")).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })
  })

  it("shows skeletons while the first request is pending", () => {
    vi.mocked(getPiHealth).mockImplementation(() => new Promise(() => {}))
    const client = createTestQueryClient()
    render(<PiHealthView />, { wrapper: queryWrapper(client) })

    expect(screen.getByLabelText("Loading Pi health")).toBeInTheDocument()
  })
})

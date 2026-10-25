import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { StaleBanner } from "./stale-banner"

describe("StaleBanner", () => {
  it("reports the data age and retries on demand", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<StaleBanner updatedAt={1_000} now={61_000} onRetry={onRetry} />)

    expect(screen.getByRole("status")).toHaveTextContent("Showing data from 60s ago")
    await user.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("disables retry while a refetch is in flight", () => {
    render(<StaleBanner updatedAt={1_000} now={2_000} onRetry={vi.fn()} retrying />)

    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled()
  })

  it("never reports a negative age", () => {
    render(<StaleBanner updatedAt={5_000} now={1_000} onRetry={vi.fn()} />)

    expect(screen.getByRole("status")).toHaveTextContent("Showing data from 0s ago")
  })
})

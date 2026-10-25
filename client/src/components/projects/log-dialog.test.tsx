import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { projectsQueryKey } from "@/hooks/use-projects"
import type { Project } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { LogDialog } from "./log-dialog"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, getProjects: vi.fn() }
})

import { getProjects } from "@/lib/api"

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "demo",
    description: "Demo",
    check_cmd: "",
    pipeline: [],
    path: "/home/pi/demo",
    status: "ACTIVE",
    last_log: "",
    current_step: "",
    progress: 0,
    ports: [],
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("LogDialog", () => {
  it("shows fallback text when the project has no log", async () => {
    const project = makeProject()
    vi.mocked(getProjects).mockResolvedValue([project])
    const client = createTestQueryClient()
    client.setQueryData<Project[]>(projectsQueryKey, [project])

    render(
      <LogDialog open onOpenChange={vi.fn()} projectId="demo" />,
      { wrapper: queryWrapper(client) },
    )

    expect(await screen.findByText("No logs available yet.")).toBeInTheDocument()
  })

  it("tracks new output from the polling query while open", async () => {
    const project = makeProject({ last_log: "step 1" })
    vi.mocked(getProjects).mockResolvedValue([project])
    const client = createTestQueryClient()
    client.setQueryData<Project[]>(projectsQueryKey, [project])

    render(
      <LogDialog open onOpenChange={vi.fn()} projectId="demo" />,
      { wrapper: queryWrapper(client) },
    )

    expect(await screen.findByText("step 1")).toBeInTheDocument()

    act(() => {
      client.setQueryData<Project[]>(projectsQueryKey, [
        { ...project, last_log: "step 1\nstep 2" },
      ])
    })

    expect(await screen.findByText(/step 2/)).toBeInTheDocument()
  })

  it("does not yank a reader who scrolled away, and offers jump to latest", async () => {
    const project = makeProject({ last_log: "line 1" })
    vi.mocked(getProjects).mockResolvedValue([project])
    const client = createTestQueryClient()
    client.setQueryData<Project[]>(projectsQueryKey, [project])
    const user = userEvent.setup()

    render(
      <LogDialog open onOpenChange={vi.fn()} projectId="demo" />,
      { wrapper: queryWrapper(client) },
    )

    const scroller = await screen.findByTestId("log-scroll")
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 800 })
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 300 })

    scroller.scrollTop = 100
    fireEvent.scroll(scroller)

    act(() => {
      client.setQueryData<Project[]>(projectsQueryKey, [
        { ...project, last_log: "line 1\nline 2" },
      ])
    })

    expect(await screen.findByText(/line 2/)).toBeInTheDocument()
    expect(scroller.scrollTop).toBe(100)

    await user.click(screen.getByRole("button", { name: "Jump to latest" }))
    expect(scroller.scrollTop).toBe(800)
  })
})

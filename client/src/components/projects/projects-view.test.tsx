import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { healthQueryKey } from "@/hooks/use-health"
import { projectsQueryKey } from "@/hooks/use-projects"
import type { HealthResponse, Project } from "@/lib/api"
import { installMatchMedia, type MatchMediaController } from "@/test/match-media"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { ProjectsView } from "./projects-view"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    getProjects: vi.fn(),
    getHealth: vi.fn(),
    startProject: vi.fn(),
    stopProject: vi.fn(),
    deleteProject: vi.fn(),
  }
})

import { deleteProject, getHealth, getProjects, startProject, stopProject } from "@/lib/api"

const health: HealthResponse = {
  ok: true,
  last_check: "2026-10-25T10:00:00Z",
  tailscale_name: "pi-box",
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "demo",
    description: "Demo project",
    check_cmd: "curl localhost",
    pipeline: [],
    path: "/home/pi/demo",
    status: "ACTIVE",
    last_log: "",
    current_step: "",
    progress: 0,
    ports: ["3000"],
    ...overrides,
  }
}

let media: MatchMediaController | undefined

beforeEach(() => {
  media = installMatchMedia({ width: 1280 })
  vi.mocked(getProjects).mockResolvedValue([])
  vi.mocked(getHealth).mockResolvedValue(health)
  vi.mocked(startProject).mockResolvedValue({ status: "BOOTING" })
  vi.mocked(stopProject).mockResolvedValue({ status: "IDLE" })
  vi.mocked(deleteProject).mockResolvedValue("deleted")
})

afterEach(() => {
  media?.restore()
  media = undefined
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

type RenderOptions = {
  projects?: Project[]
  searchQuery?: string
  seed?: boolean
  reject?: Error
}

function renderView({
  projects = [makeProject()],
  searchQuery = "",
  seed = true,
  reject,
}: RenderOptions = {}) {
  const client = createTestQueryClient()
  if (seed) {
    client.setQueryData<Project[]>(projectsQueryKey, projects)
    client.setQueryData<HealthResponse>(healthQueryKey, health)
  }
  if (reject) {
    vi.mocked(getProjects).mockRejectedValue(reject)
  } else {
    vi.mocked(getProjects).mockResolvedValue(projects)
  }

  const onClearSearch = vi.fn()
  const onCreateProject = vi.fn()

  const result = render(
    <ProjectsView
      searchQuery={searchQuery}
      onClearSearch={onClearSearch}
      onCreateProject={onCreateProject}
    />,
    { wrapper: queryWrapper(client) },
  )

  return { ...result, client, onClearSearch, onCreateProject }
}

describe("ProjectsView states", () => {
  it("renders a failed query as an error with a working retry, never as empty", async () => {
    const user = userEvent.setup()
    renderView({ seed: false, reject: new Error("network down") })

    expect(await screen.findByText("Could not load projects")).toBeInTheDocument()
    expect(screen.getByText("network down")).toBeInTheDocument()
    expect(screen.queryByText("No projects found")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Retry" }))

    await waitFor(() => expect(getProjects).toHaveBeenCalledTimes(2))
  })

  it("shows the empty state with a create action when there are no projects", async () => {
    const user = userEvent.setup()
    const { onCreateProject } = renderView({ projects: [] })

    expect(screen.getByText("No projects found")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Create project" }))
    expect(onCreateProject).toHaveBeenCalledTimes(1)
  })

  it("shows the no-match state for a search and clears it", async () => {
    const user = userEvent.setup()
    const { onClearSearch } = renderView({ searchQuery: "nothing-matches" })

    expect(screen.getByText("No matching projects")).toBeInTheDocument()
    expect(screen.getByText(/nothing-matches/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Clear search" }))
    expect(onClearSearch).toHaveBeenCalledTimes(1)
  })

  it("filters by a status value", () => {
    renderView({
      projects: [
        makeProject({ id: "runner", status: "ACTIVE" }),
        makeProject({ id: "booter", status: "BOOTING", progress: 40 }),
      ],
      searchQuery: "booting",
    })

    expect(screen.getByTestId("project-row-booter")).toBeInTheDocument()
    expect(screen.queryByTestId("project-row-runner")).not.toBeInTheDocument()
  })
})

describe("ProjectsView data presentation", () => {
  it("renders BOOTING step and progress in the table", () => {
    renderView({
      projects: [
        makeProject({ id: "booter", status: "BOOTING", progress: 42, current_step: "Installing" }),
      ],
    })

    const row = screen.getByTestId("project-row-booter")
    expect(within(row).getByText("BOOTING")).toBeInTheDocument()
    expect(within(row).getByText("Installing · 42%")).toBeInTheDocument()
  })

  it("renders BOOTING step and progress in the mobile card", () => {
    media?.restore()
    media = installMatchMedia({ width: 360 })
    renderView({
      projects: [
        makeProject({ id: "booter", status: "BOOTING", progress: 42, current_step: "Installing" }),
      ],
    })

    const card = screen.getByTestId("project-card-booter")
    expect(within(card).getByText("BOOTING")).toBeInTheDocument()
    expect(within(card).getByText("Installing · 42%")).toBeInTheDocument()
  })

  it("renders one port link per port using the health host", () => {
    renderView({
      projects: [makeProject({ ports: ["3000", "5173"] })],
    })

    expect(screen.getByText("3000").closest("a")).toHaveAttribute(
      "href",
      "http://pi-box:3000",
    )
    expect(screen.getByText("5173").closest("a")).toHaveAttribute(
      "href",
      "http://pi-box:5173",
    )
  })

  it("renders a placeholder when there are no ports", () => {
    renderView({ projects: [makeProject({ ports: [] })] })

    expect(screen.getByText("None")).toBeInTheDocument()
  })
})

describe("ProjectsView actions", () => {
  it("optimistically shows BOOTING and disables only the pending row", async () => {
    let resolveStart: ((value: { status: string }) => void) | undefined
    vi.mocked(startProject).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve
        }),
    )
    const user = userEvent.setup()

    renderView({
      projects: [
        makeProject({ id: "alpha", status: "IDLE" }),
        makeProject({ id: "beta", status: "IDLE" }),
      ],
    })

    const alpha = screen.getByTestId("project-row-alpha")
    const beta = screen.getByTestId("project-row-beta")

    await user.click(within(alpha).getByRole("button", { name: "Start alpha" }))

    expect(await within(alpha).findByText("BOOTING")).toBeInTheDocument()
    expect(within(alpha).getByRole("button", { name: "Stop alpha" })).toBeDisabled()
    expect(within(beta).getByRole("button", { name: "Start beta" })).toBeEnabled()

    await act(async () => {
      resolveStart?.({ status: "BOOTING" })
    })
  })

  it("restores the previous badge and raises a toast when start fails", async () => {
    vi.mocked(startProject).mockRejectedValue(new Error("boom"))
    const errorSpy = vi.spyOn(toast, "error")
    const user = userEvent.setup()

    renderView({ projects: [makeProject({ id: "alpha", status: "IDLE" })] })

    const row = screen.getByTestId("project-row-alpha")
    await user.click(within(row).getByRole("button", { name: "Start alpha" }))

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Error starting project: boom")
    })
    expect(await within(row).findByText("IDLE")).toBeInTheDocument()
  })

  it("asks before deleting and only deletes on confirm", async () => {
    const user = userEvent.setup()
    renderView({ projects: [makeProject({ id: "alpha" })] })

    const row = screen.getByTestId("project-row-alpha")
    await user.click(within(row).getByRole("button", { name: "Delete alpha" }))

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(deleteProject).not.toHaveBeenCalled()

    await user.click(within(row).getByRole("button", { name: "Delete alpha" }))
    await user.click(await screen.findByRole("button", { name: "Delete project" }))

    expect(vi.mocked(deleteProject).mock.calls[0][0]).toBe("alpha")
  })
})

describe("ProjectsView responsive presentation", () => {
  it("renders cards and no table on a phone viewport", () => {
    media?.restore()
    media = installMatchMedia({ width: 360 })
    renderView()

    expect(screen.getByTestId("project-card-demo")).toBeInTheDocument()
    expect(document.querySelector("table")).toBeNull()
  })

  it("renders a table at desktop width", () => {
    renderView()

    expect(screen.getByTestId("project-row-demo")).toBeInTheDocument()
    expect(document.querySelector("table")).not.toBeNull()
  })
})

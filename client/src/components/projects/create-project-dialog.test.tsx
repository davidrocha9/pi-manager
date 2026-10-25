import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, describe, expect, it, vi } from "vitest"

import { projectsQueryKey } from "@/hooks/use-projects"
import { createProject, getFiles, type Project } from "@/lib/api"
import { createTestQueryClient, queryWrapper } from "@/test/query-wrapper"

import { CreateProjectDialog } from "./create-project-dialog"
import { parsePorts } from "./project-form"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    getFiles: vi.fn(),
    createProject: vi.fn(),
  }
})

const created: Project = {
  id: "demo",
  description: "Demo project",
  check_cmd: "",
  pipeline: [],
  path: "/home/pi/demo",
  status: "IDLE",
  last_log: "",
  current_step: "",
  progress: 0,
  ports: ["3000"],
}

afterEach(() => {
  vi.clearAllMocks()
})

function renderDialog(onOpenChange = vi.fn()) {
  const client = createTestQueryClient()
  render(<CreateProjectDialog open onOpenChange={onOpenChange} />, {
    wrapper: queryWrapper(client),
  })
  return { client, onOpenChange }
}

async function goToPipeline(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Project ID"), "demo")
  await user.click(screen.getByRole("button", { name: "Next: configure pipeline" }))
  expect(
    await screen.findByRole("heading", { name: "Configure pipeline" }),
  ).toBeInTheDocument()
}

describe("parsePorts", () => {
  it("splits comma-separated ports and drops empties", () => {
    expect(parsePorts("3000, 3001")).toEqual(["3000", "3001"])
    expect(parsePorts("")).toEqual([])
    expect(parsePorts("  , 3000 ,,")).toEqual(["3000"])
  })
})

describe("CreateProjectDialog details step", () => {
  it("disables Next with an empty id and enables it once typed", async () => {
    const user = userEvent.setup()
    renderDialog()

    const next = screen.getByRole("button", { name: "Next: configure pipeline" })
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText("Project ID"), "demo")
    expect(next).toBeEnabled()
  })

  it("opens the file browser and fills the chosen path", async () => {
    const user = userEvent.setup()
    vi.mocked(getFiles).mockResolvedValue({ current_path: "/home/pi", entries: [] })
    renderDialog()

    await user.click(screen.getByRole("button", { name: /browse/i }))

    expect(
      await screen.findByRole("heading", { name: "Select project directory" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Choose folder" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Path to app")).toHaveValue("/home/pi"),
    )
    expect(
      screen.queryByRole("heading", { name: "Select project directory" }),
    ).not.toBeInTheDocument()
  })

  it("returns from pipeline to details with values preserved", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Project ID"), "demo")
    await user.type(screen.getByLabelText("Description"), "Demo project")
    await user.click(screen.getByRole("button", { name: "Next: configure pipeline" }))
    await screen.findByRole("heading", { name: "Configure pipeline" })

    await user.click(screen.getByRole("button", { name: "Back" }))

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument()
    expect(screen.getByLabelText("Project ID")).toHaveValue("demo")
    expect(screen.getByLabelText("Description")).toHaveValue("Demo project")
  })
})

describe("CreateProjectDialog pipeline step", () => {
  it("disables save once every step is removed", async () => {
    const user = userEvent.setup()
    renderDialog()
    await goToPipeline(user)

    await user.click(screen.getByRole("button", { name: "Remove step 1" }))
    await user.click(screen.getByRole("button", { name: "Remove step 1" }))
    await user.click(screen.getByRole("button", { name: "Remove step 1" }))

    expect(
      await screen.findByText("Add at least one execution step before creating the project."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create project" })).toBeDisabled()
  })

  it("sends one merged payload, then closes, resets, and invalidates the projects query", async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockResolvedValue(created)
    const { client, onOpenChange } = renderDialog()
    client.setQueryData<Project[]>(projectsQueryKey, [])

    await user.type(screen.getByLabelText("Project ID"), "demo")
    await user.type(screen.getByLabelText("Description"), "Demo project")
    await user.type(screen.getByLabelText("Ports"), "3000, 3001")
    await user.type(screen.getByLabelText("Path to app"), "/home/pi/demo")
    await user.click(screen.getByRole("button", { name: "Next: configure pipeline" }))
    await screen.findByRole("heading", { name: "Configure pipeline" })

    await user.click(screen.getByRole("button", { name: "Create project" }))

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        id: "demo",
        description: "Demo project",
        path: "/home/pi/demo",
        ports: ["3000", "3001"],
        pipeline: [
          { name: "Install", cmd: "bun install" },
          { name: "Build", cmd: "bun run build" },
          { name: "Start", cmd: "bun run start" },
        ],
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(client.getQueryState(projectsQueryKey)?.isInvalidated).toBe(true)
  })

  it("keeps the dialog open with values intact and raises a toast when save fails", async () => {
    const user = userEvent.setup()
    vi.mocked(createProject).mockRejectedValue(new Error("boom"))
    const errorSpy = vi.spyOn(toast, "error")
    const { onOpenChange } = renderDialog()

    await user.type(screen.getByLabelText("Project ID"), "demo")
    await user.click(screen.getByRole("button", { name: "Next: configure pipeline" }))
    await screen.findByRole("heading", { name: "Configure pipeline" })

    await user.click(screen.getByRole("button", { name: "Create project" }))

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("boom")),
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(
      screen.getByRole("heading", { name: "Configure pipeline" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByLabelText("Project ID")).toHaveValue("demo")
  })
})

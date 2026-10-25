import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getFiles, type FsEntry, type FsListing } from "@/lib/api"

import { FileBrowser } from "./file-browser"
import { FileBrowserDialog } from "./file-browser-dialog"

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return { ...actual, getFiles: vi.fn() }
})

function entry(name: string, isDir: boolean, path = name): FsEntry {
  return { name, path, abs_path: `/home/pi/${path}`, is_dir: isDir }
}

function listing(currentPath: string, entries: FsEntry[]): FsListing {
  return { current_path: currentPath, entries }
}

const rootListing = listing("/home/pi", [
  entry("zeta", true),
  entry("b.txt", false),
  entry("App", true, "app"),
  entry("a.txt", false),
])

afterEach(() => {
  vi.clearAllMocks()
})

describe("FileBrowser", () => {
  it("renders directories before files, each group alphabetical", async () => {
    vi.mocked(getFiles).mockResolvedValue(rootListing)
    render(<FileBrowser onSelect={vi.fn()} />)

    await screen.findByText("App")
    const options = within(screen.getByRole("listbox")).getAllByRole("option")

    expect(options.map((option) => option.textContent)).toEqual([
      "App",
      "zeta",
      "a.txt",
      "b.txt",
    ])
  })

  it("filters entries case-insensitively and reports an empty result", async () => {
    vi.mocked(getFiles).mockResolvedValue(rootListing)
    const user = userEvent.setup()
    render(<FileBrowser onSelect={vi.fn()} />)

    await screen.findByText("App")
    const filter = screen.getByLabelText("Filter directories")

    await user.type(filter, "APP")
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option")).toHaveTextContent("App")

    await user.clear(filter)
    await user.type(filter, "zzz")
    expect(screen.getByText("No items found")).toBeInTheDocument()
  })

  it("walks up to the base directory and disables Up there", async () => {
    vi.mocked(getFiles).mockImplementation(async (path = "") => {
      if (path === "") return rootListing
      if (path === "App") return listing("/home/pi/App", [])
      return listing(`/home/pi/${path}`, [])
    })
    const user = userEvent.setup()
    render(<FileBrowser initialPath="/home/pi/App" onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByTitle("/home/pi/App")).toBeInTheDocument()
    })
    expect(getFiles).toHaveBeenCalledWith("App")

    const up = screen.getByRole("button", { name: "Go up one directory" })
    expect(up).toBeEnabled()

    await user.click(up)

    await waitFor(() => {
      expect(screen.getByTitle("/home/pi")).toBeInTheDocument()
    })
    expect(getFiles).toHaveBeenLastCalledWith("")
    expect(up).toBeDisabled()
  })

  it("shows the error state and retries the same path", async () => {
    vi.mocked(getFiles).mockRejectedValueOnce(new Error("permission denied"))
    vi.mocked(getFiles).mockResolvedValue(rootListing)
    const user = userEvent.setup()
    render(<FileBrowser onSelect={vi.fn()} />)

    expect(await screen.findByText("Could not list this directory")).toBeInTheDocument()
    expect(screen.getByText("permission denied")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Retry" }))

    await screen.findByText("App")
    expect(getFiles).toHaveBeenCalledTimes(2)
    expect(getFiles).toHaveBeenLastCalledWith("")
  })

  it("emits the current path from Choose folder", async () => {
    vi.mocked(getFiles).mockResolvedValue(rootListing)
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<FileBrowser onSelect={onSelect} />)

    await screen.findByText("App")
    await user.click(screen.getByRole("button", { name: "Choose folder" }))

    expect(onSelect).toHaveBeenCalledWith("/home/pi")
  })

  it("moves focus to the Up control after descending", async () => {
    vi.mocked(getFiles).mockImplementation(async (path = "") =>
      path === "" ? rootListing : listing("/home/pi/App", []),
    )
    const user = userEvent.setup()
    render(<FileBrowser onSelect={vi.fn()} />)

    await screen.findByText("App")
    await user.click(screen.getByRole("option", { name: "App" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Go up one directory" })).toHaveFocus()
    })
  })

  it("moves the active entry with arrow keys and opens it with Enter", async () => {
    vi.mocked(getFiles).mockImplementation(async (path = "") => {
      if (path === "") return rootListing
      return listing(`/home/pi/${path}`, [])
    })
    render(<FileBrowser onSelect={vi.fn()} />)

    await screen.findByText("App")
    const listbox = screen.getByRole("listbox")
    const [first, second] = within(listbox).getAllByRole("option")

    first.focus()
    fireEvent.keyDown(listbox, { key: "ArrowDown" })
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute("aria-selected", "true")

    fireEvent.keyDown(second, { key: "Enter" })
    await waitFor(() => {
      expect(getFiles).toHaveBeenLastCalledWith("zeta")
    })
  })
})

describe("FileBrowserDialog", () => {
  it("focuses the filter on open and closes after choosing", async () => {
    vi.mocked(getFiles).mockResolvedValue(rootListing)
    const onSelect = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    render(
      <FileBrowserDialog
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    )

    const filter = await screen.findByLabelText("Filter directories")
    expect(filter).toHaveFocus()

    await screen.findByText("App")
    await user.click(screen.getByRole("button", { name: "Choose folder" }))

    expect(onSelect).toHaveBeenCalledWith("/home/pi")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

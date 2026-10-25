import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PageHeader } from "@/components/layout/page-header"
import { installMatchMedia, type MatchMediaController } from "@/test/match-media"
import { ThemeProvider } from "@/components/theme-provider"

import { AppShell } from "./app-shell"
import type { TabId } from "./app-sidebar"

let media: MatchMediaController | undefined

afterEach(() => {
  media?.restore()
  media = undefined
})

type ShellProps = {
  activeTab?: TabId
  showSearch?: boolean
  searchQuery?: string
}

function renderShell({
  activeTab = "projects",
  showSearch = true,
  searchQuery = "",
}: ShellProps = {}) {
  const onTabChange = vi.fn()
  const onNewProject = vi.fn()
  const onSearchChange = vi.fn()

  render(
    <ThemeProvider>
      <AppShell
        activeTab={activeTab}
        onTabChange={onTabChange}
        onNewProject={onNewProject}
        showSearch={showSearch}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      >
        <p>Content</p>
      </AppShell>
    </ThemeProvider>,
  )

  return { onTabChange, onNewProject, onSearchChange }
}

describe("AppShell", () => {
  it("marks only the active tab with aria-current", () => {
    media = installMatchMedia({ width: 1280 })
    renderShell()

    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("button", { name: "Pi Health" })).not.toHaveAttribute(
      "aria-current",
    )
  })

  it("switches to a slide-in drawer below the navigation breakpoint", async () => {
    media = installMatchMedia({ width: 900 })
    const user = userEvent.setup()
    renderShell()

    expect(document.querySelector('[data-slot="sidebar"]')).toBeNull()

    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }))

    expect(await screen.findByRole("dialog", { name: "Sidebar" })).toBeInTheDocument()
  })

  it("renders the fixed rail at desktop width", () => {
    media = installMatchMedia({ width: 1280 })
    renderShell()

    expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull()
  })

  it("reports search changes", () => {
    media = installMatchMedia({ width: 1280 })
    const { onSearchChange } = renderShell()

    const input = screen.getByLabelText("Search projects")
    fireEvent.change(input, { target: { value: "pi" } })
    expect(onSearchChange).toHaveBeenCalledWith("pi")
  })

  it("hides the search input on the health tab", () => {
    media = installMatchMedia({ width: 1280 })
    renderShell({ activeTab: "system", showSearch: false })

    expect(screen.queryByLabelText("Search projects")).not.toBeInTheDocument()
  })

  it("calls the tab handler once per navigation click", async () => {
    media = installMatchMedia({ width: 1280 })
    const user = userEvent.setup()
    const { onTabChange } = renderShell()

    await user.click(screen.getByRole("button", { name: "Pi Health" }))

    expect(onTabChange).toHaveBeenCalledTimes(1)
    expect(onTabChange).toHaveBeenCalledWith("system")
  })

  it("exposes light, dark, and system in the theme menu", async () => {
    media = installMatchMedia({ width: 1280 })
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole("button", { name: /change theme/i }))

    expect(await screen.findByRole("menuitem", { name: "Light" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Dark" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "System" })).toBeInTheDocument()
  })

  it("gives every icon-only header control an accessible name", () => {
    media = installMatchMedia({ width: 360 })
    renderShell()

    for (const name of [/toggle sidebar/i, /change theme/i, /account/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument()
    }
  })
})

describe("PageHeader", () => {
  it("keeps both port pills visible at mobile width", () => {
    media = installMatchMedia({ width: 360 })
    render(
      <ThemeProvider>
        <PageHeader title="Dashboard" description="Manage projects." />
      </ThemeProvider>,
    )

    expect(screen.getByText(/Server: 2001/)).toBeInTheDocument()
    const clientPort = window.location.port || "80"
    expect(screen.getByText(new RegExp(`Client: ${clientPort}`))).toBeInTheDocument()
  })

  it("surfaces a health failure", () => {
    media = installMatchMedia({ width: 360 })
    render(
      <ThemeProvider>
        <PageHeader
          title="Dashboard"
          description="Manage projects."
          healthError="500 Internal Server Error"
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole("status")).toHaveTextContent(/health check failed/i)
    expect(screen.getByRole("status")).toHaveAttribute("title", "500 Internal Server Error")
  })
})

import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { installMatchMedia, type MatchMediaController } from "@/test/match-media"

import { ThemeProvider, THEME_STORAGE_KEY, useTheme } from "./theme-provider"

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

let media: MatchMediaController | undefined

afterEach(() => {
  media?.restore()
  media = undefined
  document.documentElement.classList.remove("dark")
  delete document.documentElement.dataset.reducedMotion
  document.documentElement.style.colorScheme = ""
})

describe("ThemeProvider", () => {
  it("applies a stored dark preference on mount", () => {
    media = installMatchMedia({ dark: false })
    localStorage.setItem(THEME_STORAGE_KEY, "dark")

    renderProvider()

    expect(document.documentElement).toHaveClass("dark")
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark")
  })

  it("persists an explicit toggle and recolors the root", async () => {
    media = installMatchMedia({ dark: true })
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    const user = userEvent.setup()

    renderProvider()
    expect(document.documentElement).toHaveClass("dark")

    await user.click(screen.getByRole("button", { name: "light" }))

    expect(document.documentElement).not.toHaveClass("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
    expect(screen.getByTestId("theme")).toHaveTextContent("light")
  })

  it("falls back to the OS preference when nothing is stored", () => {
    media = installMatchMedia({ dark: true })

    renderProvider()

    expect(screen.getByTestId("theme")).toHaveTextContent("system")
    expect(document.documentElement).toHaveClass("dark")
  })

  it("follows OS changes only while the preference is system", async () => {
    media = installMatchMedia({ dark: false })
    const user = userEvent.setup()

    renderProvider()
    expect(document.documentElement).not.toHaveClass("dark")

    media.setDark(true)
    await act(async () => {})
    expect(document.documentElement).toHaveClass("dark")

    await user.click(screen.getByRole("button", { name: "light" }))
    media.setDark(false)
    media.setDark(true)
    expect(document.documentElement).not.toHaveClass("dark")
  })

  it("publishes the reduced-motion preference on the root element", () => {
    media = installMatchMedia({ reducedMotion: true })

    renderProvider()

    expect(document.documentElement.dataset.reducedMotion).toBe("true")
  })

  it("marks reduced motion as false when the OS preference is absent", () => {
    media = installMatchMedia({ reducedMotion: false })

    renderProvider()

    expect(document.documentElement.dataset.reducedMotion).toBe("false")
  })
})

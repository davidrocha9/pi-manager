import * as React from "react"

import { Toaster } from "@/components/ui/sonner"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "theme"

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | null>(null)

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function readStoredTheme(storageKey: string): Theme | null {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(
    () => readStoredTheme(storageKey) ?? defaultTheme,
  )
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    systemPrefersDark() ? "dark" : "light",
  )

  // Follow the OS while (and only while) the preference is "system".
  React.useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light")
    handleChange()
    media.addEventListener?.("change", handleChange)
    return () => media.removeEventListener?.("change", handleChange)
  }, [theme])

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  // One testable signal for R14; CSS keys the global motion suppression off it.
  React.useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      root.dataset.reducedMotion = media.matches ? "true" : "false"
    }
    apply()
    media.addEventListener?.("change", apply)
    return () => media.removeEventListener?.("change", apply)
  }, [])

  const setTheme = React.useCallback(
    (next: Theme) => {
      try {
        window.localStorage.setItem(storageKey, next)
      } catch {
        // Storage can be unavailable in private modes; the in-memory choice still applies.
      }
      setThemeState(next)
    },
    [storageKey],
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
      <Toaster />
    </ThemeProviderContext.Provider>
  )
}

export function useTheme(): ThemeProviderState {
  const context = React.useContext(ThemeProviderContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

import { vi } from "vitest"

export type MediaOptions = {
  dark?: boolean
  reducedMotion?: boolean
  width?: number
  pointerCoarse?: boolean
}

type ChangeListener = () => void

export type MatchMediaController = {
  setWidth: (width: number) => void
  setDark: (dark: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  restore: () => void
}

/**
 * Installs a matchMedia implementation in jsdom that answers the queries the app
 * actually uses. Returns controls so a test can simulate a resize or an OS change.
 */
export function installMatchMedia(options: MediaOptions = {}): MatchMediaController {
  const state = {
    dark: options.dark ?? false,
    reducedMotion: options.reducedMotion ?? false,
    width: options.width ?? 1280,
    pointerCoarse: options.pointerCoarse ?? false,
  }
  const listeners = new Set<ChangeListener>()
  const original = window.matchMedia

  const evaluate = (query: string): boolean => {
    if (query.includes("prefers-color-scheme: dark")) return state.dark
    if (query.includes("prefers-color-scheme: light")) return !state.dark
    if (query.includes("prefers-reduced-motion")) return state.reducedMotion
    if (query.includes("pointer: coarse")) return state.pointerCoarse

    const min = query.match(/min-width:\s*([\d.]+)px/)
    if (min) return state.width >= Number(min[1])

    const max = query.match(/max-width:\s*([\d.]+)px/)
    if (max) return state.width <= Number(max[1])

    return false
  }

  const change = () => {
    for (const listener of listeners) listener()
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const media = {
      get matches() {
        return evaluate(query)
      },
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: ChangeListener) => {
        listeners.add(listener)
      },
      removeEventListener: (_event: string, listener: ChangeListener) => {
        listeners.delete(listener)
      },
      addListener: (listener: ChangeListener) => {
        listeners.add(listener)
      },
      removeListener: (listener: ChangeListener) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => false,
    }
    return media as unknown as MediaQueryList
  }) as unknown as typeof window.matchMedia

  return {
    setWidth: (width) => {
      state.width = width
      change()
    },
    setDark: (dark) => {
      state.dark = dark
      change()
    },
    setReducedMotion: (reduced) => {
      state.reducedMotion = reduced
      change()
    },
    restore: () => {
      listeners.clear()
      window.matchMedia = original
    },
  }
}

import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const NAV_BREAKPOINT = 1024

export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener?.("change", onStoreChange)
      return () => media.removeEventListener?.("change", onStoreChange)
    },
    [query],
  )

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** Projects presentation swap (table vs cards). */
export function useIsPhone(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

import { NAV_BREAKPOINT, useMediaQuery } from "@/hooks/use-media-query"

// The vendored sidebar switches to a Sheet below the nav breakpoint, which is
// higher than the 768px phone breakpoint so navigation and the projects table
// do not both reflow in the same narrow band.
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${NAV_BREAKPOINT - 1}px)`)
}

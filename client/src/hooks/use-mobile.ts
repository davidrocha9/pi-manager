import { useMediaQuery } from "@/hooks/use-media-query"

// The vendored sidebar switches to a Sheet below this breakpoint. It is 1024px so
// navigation and the projects table do not both reflow in the same narrow band.
const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

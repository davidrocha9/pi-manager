import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getPiHealth } from "@/lib/api"

export const piHealthQueryKey = ["pi-health"] as const

export function usePiHealth() {
  return useQuery({
    queryKey: piHealthQueryKey,
    queryFn: getPiHealth,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

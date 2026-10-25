import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getHealth } from "@/lib/api"

export const healthQueryKey = ["health"] as const

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: getHealth,
    refetchInterval: 2_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

import { QueryClientProvider } from "@tanstack/react-query"

import { createQueryClient } from "@/lib/query-client"

const queryClient = createQueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8 text-foreground">Pi Manager</div>
    </QueryClientProvider>
  )
}

import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"

type PortLinksProps = {
  ports: string[] | undefined
  host: string
  className?: string
}

export function PortLinks({ ports, host, className }: PortLinksProps) {
  if (!ports || ports.length === 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>None</span>
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {ports.map((port) => (
        <a
          key={port}
          href={`http://${host}:${port}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {port}
          <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Open port {port} on {host}</span>
        </a>
      ))}
    </div>
  )
}

import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"

type PortLinksProps = {
  ports: string[] | undefined
  host: string
  className?: string
}

const SAFE_PORT = /^\d{1,5}$/
const SAFE_HOST = /^[^/?#@:\s]+$/

function isSafePort(port: string): boolean {
  if (!SAFE_PORT.test(port)) return false
  const value = Number(port)
  return value >= 1 && value <= 65535
}

export function PortLinks({ ports, host, className }: PortLinksProps) {
  if (!ports || ports.length === 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>None</span>
  }

  // Port values are user input persisted by the server; only numeric ports
  // become links, so a crafted value can never reach the URL authority.
  // Anything else renders as inert text.
  const safeHost = SAFE_HOST.test(host) ? host : null

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {ports.map((port) =>
        isSafePort(port) && safeHost ? (
          <a
            key={port}
            href={`http://${safeHost}:${Number(port)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {port}
            <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Open port {port} on {safeHost}</span>
          </a>
        ) : (
          <span
            key={port}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {port}
          </span>
        ),
      )}
    </div>
  )
}

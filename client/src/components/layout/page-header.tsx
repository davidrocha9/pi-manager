import { AlertTriangle } from "lucide-react"

type PageHeaderProps = {
  title: string
  description: string
  healthError?: string | null
}

export function PageHeader({ title, description, healthError }: PageHeaderProps) {
  const clientPort = window.location.port || "80"

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-success-surface px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-success-foreground uppercase">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Server: 2001
          </span>
          {clientPort !== "2001" ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-foreground uppercase">
              <span className="size-1.5 rounded-full bg-foreground/50" aria-hidden="true" />
              Client: {clientPort}
            </span>
          ) : null}
          {healthError ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-danger-surface px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-danger-foreground uppercase"
              title={healthError}
              role="status"
            >
              <AlertTriangle className="size-3" aria-hidden="true" />
              Health check failed
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

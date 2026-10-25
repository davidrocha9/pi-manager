import { Terminal } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProjects } from "@/hooks/use-projects"
import { cn, mobileSheetClassName } from "@/lib/utils"

type LogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
}

const EMPTY_LOG = "No logs available yet."

export function LogDialog({ open, onOpenChange, projectId }: LogDialogProps) {
  const { data: projects } = useProjects()
  const project = projects?.find((candidate) => candidate.id === projectId)
  const log = project?.last_log || ""

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const pinnedRef = React.useRef(true)
  const previousLog = React.useRef(log)
  const [hasNewOutput, setHasNewOutput] = React.useState(false)

  const scrollToLatest = React.useCallback(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
    pinnedRef.current = true
    setHasNewOutput(false)
  }, [])

  React.useEffect(() => {
    if (!open) return
    pinnedRef.current = true
    setHasNewOutput(false)
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [open])

  React.useEffect(() => {
    if (previousLog.current === log) return
    previousLog.current = log
    if (pinnedRef.current) {
      scrollToLatest()
    } else {
      setHasNewOutput(true)
    }
  }, [log, scrollToLatest])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const atBottom = distanceFromBottom < 16
    pinnedRef.current = atBottom
    if (atBottom) setHasNewOutput(false)
  }

  const title = projectId ? `Execution log: ${projectId}` : "Execution log"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("flex h-[70svh] flex-col gap-3 sm:max-w-4xl", mobileSheetClassName)}
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Output from the project's last pipeline execution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-console">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[10px] font-semibold tracking-[0.14em] text-console-foreground/60 uppercase">
            <Terminal className="size-3.5" aria-hidden="true" />
            Output console
          </div>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            data-testid="log-scroll"
            className="min-h-0 flex-1 overflow-auto p-4"
          >
            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-console-foreground">
              {log || EMPTY_LOG}
            </pre>
          </div>
        </div>

        {hasNewOutput ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={scrollToLatest}
            className="self-center"
          >
            Jump to latest
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

import { ChevronLeft, File, Folder, Home, Search } from "lucide-react"
import * as React from "react"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getFiles, type FsEntry } from "@/lib/api"
import { cn, errorMessage } from "@/lib/utils"

type FileBrowserProps = {
  initialPath?: string
  onSelect: (path: string) => void
  onCancel?: () => void
}

function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) => {
    if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name)
    return a.is_dir ? -1 : 1
  })
}

/**
 * Translates a displayed absolute path into the server's base-relative query
 * path. The `/fs` endpoint joins its query param onto `--fs-base`, so an
 * absolute path cannot be sent back verbatim.
 */
function relativeToBase(target: string, base: string): string | null {
  if (target === base) return ""
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base
  if (trimmedBase === "") return target.replace(/^\//, "")
  if (target.startsWith(`${trimmedBase}/`)) return target.slice(trimmedBase.length + 1)
  return null
}

export function FileBrowser({ initialPath = "", onSelect, onCancel }: FileBrowserProps) {
  const [requestPath, setRequestPath] = React.useState("")
  const [currentPath, setCurrentPath] = React.useState(initialPath)
  const [entries, setEntries] = React.useState<FsEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [focusRequest, setFocusRequest] = React.useState<"up" | "filter" | null>(null)

  const filterRef = React.useRef<HTMLInputElement>(null)
  const upRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const loadPath = React.useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const listing = await getFiles(path)
      setRequestPath(path)
      setCurrentPath(listing.current_path)
      setEntries(sortEntries(listing.entries))
      setActiveIndex(0)
      return listing
    } catch (cause) {
      setError(errorMessage(cause))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const initialise = async () => {
      const start = initialPath.trim()
      if (!start) {
        await loadPath("")
        return
      }
      if (!start.startsWith("/")) {
        await loadPath(start)
        return
      }

      // Establish the server base first, then open the requested directory relative to it.
      try {
        const root = await getFiles("")
        if (cancelled) return
        const relative = relativeToBase(start, root.current_path)
        if (relative === null) {
          setRequestPath("")
          setCurrentPath(root.current_path)
          setEntries(sortEntries(root.entries))
          setLoading(false)
          return
        }
        await loadPath(relative)
      } catch (cause) {
        if (cancelled) return
        setError(errorMessage(cause))
        setLoading(false)
      }
    }

    void initialise()
    return () => {
      cancelled = true
    }
  }, [initialPath, loadPath])

  React.useEffect(() => {
    filterRef.current?.focus()
  }, [])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [filter])

  // Focus targets are applied after the re-render that enables/rebuilds them.
  React.useEffect(() => {
    if (!focusRequest) return
    if (focusRequest === "up") upRef.current?.focus()
    else filterRef.current?.focus()
    setFocusRequest(null)
  }, [focusRequest])

  const filteredEntries = React.useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return entries
    return entries.filter((entry) => entry.name.toLowerCase().includes(term))
  }, [entries, filter])

  const atBase = requestPath === ""

  const parentPath = requestPath
    .split("/")
    .filter(Boolean)
    .slice(0, -1)
    .join("/")

  const goUp = async () => {
    if (atBase) return
    const listing = await loadPath(parentPath)
    if (listing) setFocusRequest("up")
  }

  const goHome = async () => {
    const listing = await loadPath("")
    if (listing) setFocusRequest("filter")
  }

  const openEntry = async (entry: FsEntry) => {
    if (!entry.is_dir) return
    const listing = await loadPath(entry.path)
    if (listing) setFocusRequest("up")
  }

  const focusOption = (index: number) => {
    if (filteredEntries.length === 0) return
    const next = (index + filteredEntries.length) % filteredEntries.length
    setActiveIndex(next)
    const options = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')
    options?.[next]?.focus()
  }

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        focusOption(activeIndex + 1)
        break
      case "ArrowUp":
        event.preventDefault()
        focusOption(activeIndex - 1)
        break
      case "Home":
        event.preventDefault()
        focusOption(0)
        break
      case "End":
        event.preventDefault()
        focusOption(filteredEntries.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className="flex h-[min(70svh,32rem)] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card max-sm:h-full max-sm:rounded-none max-sm:border-0">
      <div className="space-y-2 border-b border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Button
            ref={upRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void goUp()}
            disabled={atBase || loading}
            aria-label="Go up one directory"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div
            className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
            title={currentPath || "/"}
            aria-live="polite"
          >
            {currentPath || "/"}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void goHome()}
            aria-label="Go to base directory"
          >
            <Home aria-hidden="true" />
          </Button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter directories…"
            aria-label="Filter directories"
            className="h-9 bg-background pl-9"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : error ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-destructive">Could not list this directory</p>
            <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadPath(requestPath)}
            >
              Retry
            </Button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Folder}
              title="No items found"
              description={
                filter ? `Nothing matches “${filter}”.` : "This directory has no folders to show."
              }
            />
          </div>
        ) : (
          <div
            ref={listRef}
            role="listbox"
            aria-label="Directory contents"
            className="p-1"
            onKeyDown={handleListKeyDown}
          >
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.path || entry.name}
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => void openEntry(entry)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    void openEntry(entry)
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors outline-none",
                  "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60",
                  index === activeIndex && "bg-accent/60",
                )}
              >
                {entry.is_dir ? (
                  <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <File className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="truncate font-medium">{entry.name}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 truncate text-[11px] text-muted-foreground">
          Selected:{" "}
          <span className="font-mono text-foreground">{currentPath || "/"}</span>
        </p>
        <div className="flex gap-2 max-sm:flex-col-reverse">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} className="max-sm:w-full">
              Cancel
            </Button>
          ) : null}
          <Button type="button" onClick={() => onSelect(currentPath)} className="max-sm:w-full">
            Choose folder
          </Button>
        </div>
      </div>
    </div>
  )
}

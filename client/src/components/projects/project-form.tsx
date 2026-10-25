import { ArrowRight, FolderSearch } from "lucide-react"
import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ProjectDetails = {
  id: string
  description: string
  ports: string
  path: string
}

type ProjectFormProps = {
  value: ProjectDetails
  busy: boolean
  onChange: (value: ProjectDetails) => void
  onBrowse: () => void
  onNext: () => void
}

export function parsePorts(value: string): string[] {
  return value
    .split(",")
    .map((port) => port.trim())
    .filter((port) => port !== "")
}

export function ProjectForm({ value, busy, onChange, onBrowse, onNext }: ProjectFormProps) {
  const update = (patch: Partial<ProjectDetails>) => onChange({ ...value, ...patch })
  const canContinue = value.id.trim().length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canContinue) return
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project-id">Project ID</Label>
          <Input
            id="project-id"
            value={value.id}
            onChange={(event) => update({ id: event.target.value })}
            placeholder="e.g. my-awesome-app"
            autoComplete="off"
            aria-required="true"
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-description">Description</Label>
          <Input
            id="project-description"
            value={value.description}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="What does this project do?"
            autoComplete="off"
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-ports">Ports</Label>
          <Input
            id="project-ports"
            value={value.ports}
            onChange={(event) => update({ ports: event.target.value })}
            placeholder="e.g. 3000, 3001"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby="project-ports-hint"
            className="h-9"
          />
          <p id="project-ports-hint" className="text-xs text-muted-foreground">
            Optional, comma separated. Leave empty when the project opens no ports.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-path">Path to app</Label>
          <div className="flex gap-2">
            <Input
              id="project-path"
              value={value.path}
              onChange={(event) => update({ path: event.target.value })}
              placeholder="e.g. /home/pi/Projects/app"
              autoComplete="off"
              className="h-9 flex-1 font-mono"
            />
            <Button type="button" variant="outline" onClick={onBrowse} disabled={busy}>
              <FolderSearch className="size-4" aria-hidden="true" />
              Browse
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={!canContinue || busy} className="gap-2 max-sm:w-full">
          Next: configure pipeline
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  )
}

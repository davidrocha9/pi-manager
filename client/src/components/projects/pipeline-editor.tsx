import { ArrowLeft, Play, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PipelineStep } from "@/lib/api"

export const DEFAULT_PIPELINE: PipelineStep[] = [
  { name: "Install", cmd: "bun install" },
  { name: "Build", cmd: "bun run build" },
  { name: "Start", cmd: "bun run start" },
]

type PipelineEditorProps = {
  pipeline: PipelineStep[]
  busy: boolean
  onChange: (pipeline: PipelineStep[]) => void
  onBack: () => void
  onSave: () => void
}

export function PipelineEditor({
  pipeline,
  busy,
  onChange,
  onBack,
  onSave,
}: PipelineEditorProps) {
  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    onChange(pipeline.map((step, current) => (current === index ? { ...step, ...patch } : step)))
  }

  const removeStep = (index: number) => {
    onChange(pipeline.filter((_, current) => current !== index))
  }

  const addStep = () => {
    onChange([...pipeline, { name: "New step", cmd: "" }])
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Execution steps</h3>
          <p className="text-xs text-muted-foreground">
            Define the sequence of commands to run your project.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          Add step
        </Button>
      </div>

      {pipeline.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Add at least one execution step before creating the project.
        </p>
      ) : (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {pipeline.map((step, index) => (
            <div
              key={index}
              className="relative rounded-lg border border-border bg-muted/30 p-3"
              data-testid={`pipeline-step-${index}`}
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1 sm:col-span-1">
                  <Label htmlFor={`step-name-${index}`} className="text-[10px] uppercase">
                    Name
                  </Label>
                  <Input
                    id={`step-name-${index}`}
                    value={step.name}
                    onChange={(event) => updateStep(index, { name: event.target.value })}
                    placeholder="e.g. Build"
                    className="h-9 bg-background font-medium"
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label htmlFor={`step-cmd-${index}`} className="text-[10px] uppercase">
                    Command
                  </Label>
                  <Input
                    id={`step-cmd-${index}`}
                    value={step.cmd}
                    onChange={(event) => updateStep(index, { cmd: event.target.value })}
                    placeholder="e.g. bun run build"
                    className="h-9 bg-background font-mono text-xs"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeStep(index)}
                className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
                aria-label={`Remove step ${index + 1}`}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} disabled={busy} className="gap-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={busy || pipeline.length === 0}
          className="gap-2"
        >
          <Play className="size-4" aria-hidden="true" />
          Create project
        </Button>
      </div>
    </div>
  )
}

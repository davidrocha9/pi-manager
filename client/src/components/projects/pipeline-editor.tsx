import { ArrowLeft, Play, Plus, X } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PipelineStep } from "@/lib/api"
import { cn } from "@/lib/utils"

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
        <EmptyState
          title="No execution steps"
          description="Add at least one execution step before creating the project."
          className="py-6"
        />
      ) : (
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {pipeline.map((step, index) => (
            <div
              key={index}
              className="relative rounded-lg border border-border bg-muted/30 p-3"
              data-testid={`pipeline-step-${index}`}
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <StepField
                  id={`step-name-${index}`}
                  label="Name"
                  value={step.name}
                  onChange={(value) => updateStep(index, { name: value })}
                  placeholder="e.g. Build"
                  inputClassName="font-medium"
                />
                <StepField
                  id={`step-cmd-${index}`}
                  label="Command"
                  value={step.cmd}
                  onChange={(value) => updateStep(index, { cmd: value })}
                  placeholder="e.g. bun run build"
                  wrapperClassName="sm:col-span-3"
                  inputClassName="font-mono text-xs"
                />
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

function StepField({
  id,
  label,
  value,
  onChange,
  placeholder,
  wrapperClassName,
  inputClassName,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  wrapperClassName?: string
  inputClassName?: string
}) {
  return (
    <div className={cn("space-y-1", wrapperClassName)}>
      <Label htmlFor={id} className="text-[10px] uppercase">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("h-9 bg-background", inputClassName)}
      />
    </div>
  )
}

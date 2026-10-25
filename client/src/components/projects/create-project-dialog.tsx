import { useState } from "react"
import { toast } from "sonner"

import { FileBrowserDialog } from "@/components/files/file-browser-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCreateProject } from "@/hooks/use-projects"
import type { PipelineStep } from "@/lib/api"
import { cn, mobileSheetClassName } from "@/lib/utils"

import { DEFAULT_PIPELINE, PipelineEditor } from "./pipeline-editor"
import { parsePorts, ProjectForm, type ProjectDetails } from "./project-form"

type CreateProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = "details" | "pipeline"

const EMPTY_DETAILS: ProjectDetails = {
  id: "",
  description: "",
  ports: "",
  path: "",
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.1em] uppercase">
      <span
        aria-current={step === "details" ? "step" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
          step === "details"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border text-muted-foreground",
        )}
      >
        <span className="grid size-4 place-items-center rounded-full bg-background/70 text-[9px]">
          1
        </span>
        Details
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span
        aria-current={step === "pipeline" ? "step" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
          step === "pipeline"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border text-muted-foreground",
        )}
      >
        <span className="grid size-4 place-items-center rounded-full bg-background/70 text-[9px]">
          2
        </span>
        Pipeline
      </span>
    </div>
  )
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [step, setStep] = useState<Step>("details")
  const [details, setDetails] = useState<ProjectDetails>(EMPTY_DETAILS)
  const [pipeline, setPipeline] = useState<PipelineStep[]>(DEFAULT_PIPELINE)
  const [browseOpen, setBrowseOpen] = useState(false)
  const createProject = useCreateProject()

  const reset = () => {
    setStep("details")
    setDetails(EMPTY_DETAILS)
    setPipeline(DEFAULT_PIPELINE)
    setBrowseOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Cancel keeps what was typed; only a successful create resets it (R5).
    if (!nextOpen) {
      setStep("details")
      setBrowseOpen(false)
    }
    onOpenChange(nextOpen)
  }

  const handleSave = () => {
    createProject.mutate(
      {
        id: details.id.trim(),
        description: details.description.trim(),
        path: details.path.trim(),
        ports: parsePorts(details.ports),
        pipeline,
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(`Error creating project: ${errorMessage(error)}`)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn("flex max-h-[85svh] flex-col sm:max-w-2xl", mobileSheetClassName)}
        >
          <DialogHeader>
            <DialogTitle>{step === "details" ? "New project" : "Configure pipeline"}</DialogTitle>
            <DialogDescription>
              {step === "details"
                ? "Name the project, point it at a directory, and list any ports it opens."
                : "Review the commands Pi Manager runs to boot this project."}
            </DialogDescription>
          </DialogHeader>

          <StepIndicator step={step} />

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {step === "details" ? (
              <ProjectForm
                value={details}
                busy={createProject.isPending}
                onChange={setDetails}
                onBrowse={() => setBrowseOpen(true)}
                onNext={() => setStep("pipeline")}
              />
            ) : (
              <PipelineEditor
                pipeline={pipeline}
                busy={createProject.isPending}
                onChange={setPipeline}
                onBack={() => setStep("details")}
                onSave={handleSave}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FileBrowserDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        initialPath={details.path}
        onSelect={(path) => setDetails((current) => ({ ...current, path }))}
      />
    </>
  )
}

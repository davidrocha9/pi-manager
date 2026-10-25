import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn, mobileSheetClassName } from "@/lib/utils"

import { FileBrowser } from "./file-browser"

type FileBrowserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPath?: string
  onSelect: (path: string) => void
}

export function FileBrowserDialog({
  open,
  onOpenChange,
  initialPath,
  onSelect,
}: FileBrowserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-2xl", mobileSheetClassName)}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select project directory</DialogTitle>
          <DialogDescription className="sr-only">
            Browse directories on the server and choose one for the project.
          </DialogDescription>
        </DialogHeader>
        <FileBrowser
          initialPath={initialPath}
          onCancel={() => onOpenChange(false)}
          onSelect={(path) => {
            onSelect(path)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

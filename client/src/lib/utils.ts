import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Dialogs become near-full-height sheets below 640px (R17).
 * Applied on top of the vendored dialog's centered positioning.
 */
export const mobileSheetClassName =
  "max-sm:top-0 max-sm:left-0 max-sm:h-svh max-sm:max-h-svh max-sm:w-full max-sm:max-w-none max-sm:-translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:ring-0 max-sm:p-5"

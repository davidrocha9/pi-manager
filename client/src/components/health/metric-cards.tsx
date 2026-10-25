import { Cpu, HardDrive, MemoryStick, Thermometer } from "lucide-react"

import type { PiHealth } from "@/lib/api"
import {
  METRIC_IDS,
  METRICS,
  temperatureTone,
  type MetricId,
  type TemperatureTone,
} from "@/lib/health"
import { cn } from "@/lib/utils"

const METRIC_ICONS = {
  cpu: Cpu,
  memory: MemoryStick,
  temperature: Thermometer,
  disk: HardDrive,
} as const

const TONE_CLASSES: Record<TemperatureTone, { text: string; bar: string }> = {
  danger: { text: "text-danger", bar: "bg-danger" },
  warning: { text: "text-warning", bar: "bg-warning" },
  success: { text: "text-success", bar: "bg-success" },
}

type MetricCardsProps = {
  health: PiHealth
  selected: MetricId
  onSelect: (metric: MetricId) => void
}

export function MetricCards({ health, selected, onSelect }: MetricCardsProps) {
  return (
    <div
      role="group"
      aria-label="Health metrics"
      className="grid shrink-0 grid-cols-2 gap-3 lg:flex lg:w-56 lg:flex-col"
    >
      {METRIC_IDS.map((id) => {
        const config = METRICS[id]
        const Icon = METRIC_ICONS[id]
        const value = health[config.key] ?? 0
        const tone = id === "temperature" ? temperatureTone(value) : null
        const toneClasses = tone ? TONE_CLASSES[tone] : null
        const fillPercent = Math.min(
          id === "temperature" ? (value / config.max) * 100 : value,
          100,
        )
        const isActive = id === selected

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={isActive}
            className={cn(
              "min-h-[110px] flex-1 rounded-xl border-2 p-4 text-left shadow-sm transition-all",
              "hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
              isActive ? "border-primary ring-2 ring-primary/20" : "border-border",
            )}
          >
            <span className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                {config.shortLabel}
              </span>
            </span>
            <span
              className={cn(
                "text-2xl font-black tabular-nums",
                toneClasses ? toneClasses.text : "text-foreground",
              )}
            >
              {value.toFixed(1)}
              {config.unit}
            </span>
            <span
              className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <span
              className={cn("block h-full rounded-full transition-all", toneClasses?.bar)}
              style={{ backgroundColor: tone ? undefined : config.color, width: `${fillPercent}%` }}
            />
            </span>
          </button>
        )
      })}
    </div>
  )
}

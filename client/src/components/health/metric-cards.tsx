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

const TONE_TEXT: Record<TemperatureTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
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
      className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {METRIC_IDS.map((id) => {
        const config = METRICS[id]
        const Icon = METRIC_ICONS[id]
        const value = health[config.key] ?? 0
        const tone = id === "temperature" ? temperatureTone(value) : null
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
            style={
              isActive
                ? {
                    borderColor: `color-mix(in oklab, ${config.color} 45%, transparent)`,
                    backgroundColor: `color-mix(in oklab, ${config.color} 9%, transparent)`,
                  }
                : undefined
            }
            className={cn(
              "flex min-h-[104px] flex-1 flex-col justify-between gap-2 rounded-xl border p-3.5 text-left transition-all duration-200 outline-none",
              "hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/60",
              isActive
                ? "border-transparent shadow-md"
                : "border-border bg-card hover:border-muted-foreground/25",
            )}
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-wider uppercase">
                {config.shortLabel}
              </span>
            </span>
            <span className="flex items-baseline">
              <span
                className={cn(
                  "text-[26px] leading-none font-semibold tracking-tight tabular-nums",
                  tone ? TONE_TEXT[tone] : "text-foreground",
                )}
              >
                {value.toFixed(1)}
              </span>
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {config.unit}
              </span>
            </span>
            <span
              className="block h-1 w-full overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ backgroundColor: tone ? `var(--${tone})` : config.color, width: `${fillPercent}%` }}
              />
            </span>
          </button>
        )
      })}
    </div>
  )
}

import { Check, Monitor, Moon, Search, Sun } from "lucide-react"

import { useTheme, type Theme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

type AppHeaderProps = {
  showSearch: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function AppHeader({ showSearch, searchQuery, onSearchChange }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-4 lg:h-16 lg:px-6">
      <SidebarTrigger className="-ml-1 size-9 shrink-0" />

      {showSearch ? (
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects by name, description, path…"
            aria-label="Search projects"
            className="h-9 bg-muted/40 pl-9"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label={`Theme: ${theme}. Change theme`}
            >
              <Sun className="size-4 dark:hidden" aria-hidden="true" />
              <Moon className="hidden size-4 dark:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setTheme(option.value)}
                  className="gap-2"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{option.label}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      theme === option.value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Account: Admin User, System Manager"
        >
          <span
            className="grid size-7 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground"
            aria-hidden="true"
          >
            AD
          </span>
        </Button>

        <div className="hidden min-w-0 border-l border-border pl-3 text-right sm:block">
          <p className="truncate text-xs leading-none font-semibold">Admin User</p>
          <p className="mt-1 truncate text-[10px] leading-none text-muted-foreground">
            System Manager
          </p>
        </div>
      </div>
    </header>
  )
}

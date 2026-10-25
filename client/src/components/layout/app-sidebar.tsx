import { Activity, ExternalLink, PlusCircle, Terminal } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export type TabId = "projects" | "system"

export const NAV_TABS: { id: TabId; name: string; icon: typeof Terminal }[] = [
  { id: "projects", name: "Dashboard", icon: Terminal },
  { id: "system", name: "Pi Health", icon: Activity },
]

type AppSidebarProps = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onNewProject: () => void
}

export function AppSidebar({ activeTab, onTabChange, onNewProject }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar()

  const selectTab = (tab: TabId) => {
    onTabChange(tab)
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Terminal className="size-4" aria-hidden="true" />
          </div>
          <div className="grid min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">Pi Manager</span>
            <span className="truncate text-[10px] font-medium tracking-[0.14em] text-sidebar-foreground/50 uppercase">
              Control plane
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <SidebarMenuItem key={tab.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={tab.name}
                      className="pointer-coarse:min-h-11"
                    >
                      <button
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => selectTab(tab.id)}
                      >
                        <Icon aria-hidden="true" />
                        <span>{tab.name}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Add project"
              className="pointer-coarse:min-h-11 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <button type="button" onClick={onNewProject}>
                <PlusCircle aria-hidden="true" />
                <span>Add project</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="GitHub repository" className="pointer-coarse:min-h-11">
              <a
                href="https://github.com/davidrocha9/pi-manager"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden="true" />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

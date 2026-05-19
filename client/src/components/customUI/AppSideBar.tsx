import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"


export function AppSideBar() {
  const { state, isMobile } = useSidebar();
  return (
    <>
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    <SidebarTrigger variant="secondary" className={cn(
    "absolute top-4 z-50 transition-all bg-transparent rounded-full font-extrabold shadow-2xl hover:bg-[#cbf3ff] duration-200",
    state === "expanded" ? "left-60" : "left-10",
    isMobile && "relative left-0"
    )} />
    </>
  )
}
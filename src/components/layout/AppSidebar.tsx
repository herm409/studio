
"use client";
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, CalendarDays, Settings, Trophy, Bot, GanttChartSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, disabled: false }, 
  { href: "/gamification", label: "Gamification", icon: Trophy },
  { href: "/ai-tools", label: "AI Tools", icon: Bot, disabled: false }, 
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar(); // Get mobile state and setter

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-2 h-16">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden" onClick={handleLinkClick}>
          <GanttChartSquare className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold font-headline">FollowUp</span>
        </Link>
        <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full hidden">
           <Link href="/dashboard" onClick={handleLinkClick}>
             <GanttChartSquare className="h-7 w-7 text-primary" />
           </Link>
        </div>
        <div className="md:hidden"> 
           <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={item.label}
                disabled={item.disabled} 
                aria-disabled={item.disabled}
                className={cn(item.disabled && "cursor-not-allowed opacity-50")}
              >
                <Link href={item.disabled ? "#" : item.href} onClick={handleLinkClick}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="mt-auto p-2">
        {/* Can add user profile or quick actions here */}
      </SidebarFooter>
    </Sidebar>
  );
}


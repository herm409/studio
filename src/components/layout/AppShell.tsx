"use client";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

const getPageTitle = (pathname: string): string => {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/prospects/add")) return "Add New Prospect";
  if (pathname.startsWith("/prospects/")) return "Prospect Details";
  if (pathname.startsWith("/prospects")) return "Prospects";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/gamification")) return "Gamification";
  if (pathname.startsWith("/ai-tools")) return "AI Tools";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Follow-Up Flow";
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}

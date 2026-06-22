import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export function AppShell() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) ensureSeed(user.id).catch(() => undefined);
  }, [user]);

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b border-border surface-1 px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

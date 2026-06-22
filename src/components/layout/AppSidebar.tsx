import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, MessageSquare, Workflow, Zap, Tags, Users, MessagesSquare,
  QrCode, Settings, BookOpen, Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { url: "/", icon: LayoutDashboard, title: "Painel" },
      { url: "/inbox", icon: MessageSquare, title: "Inbox" },
      { url: "/contacts", icon: Users, title: "Contatos" },
    ],
  },
  {
    label: "Automação",
    items: [
      { url: "/flows", icon: Workflow, title: "Fluxos" },
      { url: "/automation/keywords", icon: Zap, title: "Palavras-chave" },
      { url: "/automation/sequences", icon: Sparkles, title: "Sequências" },
      { url: "/automation/webhooks", icon: MessagesSquare, title: "Webhooks" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { url: "/quick-replies", icon: MessagesSquare, title: "Respostas rápidas" },
      { url: "/tags", icon: Tags, title: "Etiquetas" },
      { url: "/connections", icon: QrCode, title: "Conexões" },
      { url: "/settings", icon: Settings, title: "Configurações" },
      { url: "/dev-notes", icon: BookOpen, title: "Dev Notes" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        {!collapsed ? <BrandMark /> : <BrandMark size={28} />}
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

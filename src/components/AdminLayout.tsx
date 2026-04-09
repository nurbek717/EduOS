import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  School,
  Users,
  Ticket,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import HeaderActions from "@/components/dashboard/HeaderActions";
import { useTranslation } from "react-i18next";

type AdminSection = "overview" | "schools" | "users" | "subscriptions" | "exams";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  currentSection?: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
  searchItems?: Array<{ id: string; title: string; subtitle?: string; section: AdminSection }>;
  headerNotifications?: Array<{ id: string; text: string; at: string; section: AdminSection }>;
  subscriptionInfo?: {
    planName: string;
    startDate?: string | null;
    endDate?: string | null;
    contractNumber?: string | null;
    status?: "active" | "expired";
    daysLeft?: number | null;
  };
}

const AdminLayout = ({
  children,
  title,
  subtitle,
  currentSection = "schools",
  onSectionChange,
  searchItems,
  headerNotifications,
  subscriptionInfo,
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("layout");
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;

  const navItems: { label: string; section: AdminSection; icon: typeof LayoutDashboard }[] = [
    { label: t("admin.nav.overview"), section: "overview", icon: LayoutDashboard },
    { label: t("admin.nav.schools"), section: "schools", icon: School },
    { label: t("admin.nav.users"), section: "users", icon: Users },
    { label: t("admin.nav.subscriptions"), section: "subscriptions", icon: Ticket },
    { label: t("admin.nav.exams"), section: "exams", icon: FileCheck },
  ];

  const sectionLabels: Record<AdminSection, string> = {
    overview: t("admin.nav.overview"),
    schools: t("admin.nav.schools"),
    users: t("admin.nav.users"),
    subscriptions: t("admin.nav.subscriptions"),
    exams: t("admin.nav.exams"),
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <School className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {t("admin.badge")}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {t("admin.panel")}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <SidebarGroupLabel>{t("common.sections")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.section === currentSection;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center"
                        onClick={() => onSectionChange?.(item.section)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {currentUser?.name ? getInitials(currentUser.name) : "SA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-sidebar-foreground">
                  {currentUser?.name || t("admin.fallbackName")}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-1 flex-col overflow-auto">
          <div className="flex h-[71px] shrink-0 items-center justify-between gap-2 border-b bg-background px-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 overflow-hidden">
              <SidebarTrigger className="h-8 w-8 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700" />
              <ChevronRight className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">
                {sectionLabels[currentSection]}
              </span>
            </div>
            <HeaderActions
              navItems={navItems}
              currentSection={currentSection}
              onSectionChange={onSectionChange}
              profileTargetSection="users"
              settingsTargetSection="users"
              currentUserName={currentUser?.name}
              currentUserPhotoUrl={currentUser?.photoUrl}
              initialsFallback={currentUser?.name ? getInitials(currentUser.name) : "SA"}
              notificationStorageKey="dashboard:admin:notifications"
              notifications={headerNotifications}
              searchItems={searchItems}
              onLogout={handleLogout}
              showTravelNavigation={false}
              compactHeader
              subscriptionLabel={
                typeof subscriptionInfo?.daysLeft === "number"
                  ? `${subscriptionInfo.daysLeft} kun qoldi`
                  : "15 kun qoldi"
              }
              subscriptionInfo={subscriptionInfo}
            />
          </div>
          <div className="flex-1 overflow-auto p-6">
          {(title || subtitle) && (
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title || t("admin.layoutTitle")}
              </h1>
              {subtitle && (
                <p className="mt-1 text-muted-foreground">{subtitle}</p>
              )}
              <div className="mt-3 h-1 w-12 rounded-full bg-primary" />
            </div>
          )}
          {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;

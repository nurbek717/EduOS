import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ChevronRight,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  Clock,
  FileText,
  FileCheck,
  UserCircle,
  ScanFace,
  MessageCircle,
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

type TeacherSection = "overview" | "students" | "classes" | "grades" | "homework" | "exams" | "schedule" | "faceAttendance" | "profile" | "support";

interface TeacherLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  currentSection?: TeacherSection;
  onSectionChange?: (section: TeacherSection) => void;
  searchItems?: Array<{ id: string; title: string; subtitle?: string; section: TeacherSection }>;
  headerNotifications?: Array<{ id: string; text: string; at: string; section: TeacherSection }>;
}

const TeacherLayout = ({
  children,
  title,
  subtitle,
  currentSection = "overview",
  onSectionChange,
  searchItems,
  headerNotifications,
}: TeacherLayoutProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("layout");
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;

  const navItems: { label: string; section: TeacherSection; icon: typeof LayoutDashboard }[] = [
    { label: t("teacher.nav.overview"), section: "overview", icon: LayoutDashboard },
    { label: t("teacher.nav.students"), section: "students", icon: Users as typeof LayoutDashboard },
    { label: t("teacher.nav.classes"), section: "classes", icon: BookOpen as typeof LayoutDashboard },
    { label: t("teacher.nav.grades"), section: "grades", icon: ClipboardList as typeof LayoutDashboard },
    { label: t("teacher.nav.homework"), section: "homework", icon: FileText as typeof LayoutDashboard },
    { label: t("teacher.nav.exams"), section: "exams", icon: FileCheck as typeof LayoutDashboard },
    { label: t("teacher.nav.schedule"), section: "schedule", icon: Clock as typeof LayoutDashboard },
    { label: t("teacher.nav.faceAttendance"), section: "faceAttendance", icon: ScanFace as typeof LayoutDashboard },
    { label: t("teacher.nav.support"), section: "support", icon: MessageCircle as typeof LayoutDashboard },
    { label: t("teacher.nav.profile"), section: "profile", icon: UserCircle as typeof LayoutDashboard },
  ];

  const sectionLabels: Record<TeacherSection, string> = {
    overview: t("teacher.nav.overview"),
    students: t("teacher.nav.students"),
    classes: t("teacher.nav.classes"),
    grades: t("teacher.nav.grades"),
    homework: t("teacher.nav.homework"),
    exams: t("teacher.nav.exams"),
    schedule: t("teacher.nav.schedule"),
    faceAttendance: t("teacher.nav.faceAttendance"),
    support: t("teacher.nav.support"),
    profile: t("teacher.nav.profile"),
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r [&_[data-sidebar=sidebar]]:bg-[#1d61a5]">
        <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold text-white">
                {t("teacher.badge")}
              </span>
              <span className="truncate text-xs text-white">
                {t("teacher.panel")}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <SidebarGroupLabel className="text-white">{t("common.sections")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.section === currentSection;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={isActive}
                        className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center text-white hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-accent"
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
              <Avatar className="h-8 w-8 bg-white/10 ring-1 ring-white/25">
                {currentUser?.photoUrl ? (
                  <AvatarImage src={currentUser.photoUrl} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-white/15 text-white text-xs">
                  {currentUser?.name ? getInitials(currentUser.name) : "TR"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-white">
                  {currentUser?.name || t("teacher.fallbackName")}
                </span>
                <span className="truncate text-xs text-white/70">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-1 flex-col overflow-auto">
          <div className="flex h-[71px] shrink-0 items-center justify-between gap-4 border-b bg-background px-6 text-sm text-muted-foreground">
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
              profileTargetSection="profile"
              settingsTargetSection="profile"
              currentUserName={currentUser?.name}
              currentUserPhotoUrl={currentUser?.photoUrl}
              initialsFallback={currentUser?.name ? getInitials(currentUser.name) : "TR"}
              notificationStorageKey="dashboard:teacher:notifications"
              notifications={headerNotifications}
              searchItems={searchItems}
              onLogout={handleLogout}
            />
          </div>
          <div className="flex-1 overflow-auto p-6">
            {(title || subtitle) && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title || t("teacher.layoutTitle")}
                </h1>
                {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
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

export default TeacherLayout;


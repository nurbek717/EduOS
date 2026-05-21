import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ChevronRight, ChevronDown, BookOpen, GraduationCap, UserCircle, Wallet, CalendarDays, FileText, Settings, MessageCircle, Send, PhoneCall } from "lucide-react";
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
import { useSchoolSubscriptionHeader } from "@/hooks/useSchoolSubscriptionHeader";
import { hasPlanFeature } from "@/lib/school-plan-features";
import { useTranslation } from "react-i18next";
import { normalizeUserRole } from "@/lib/auth";

type DirectorSection = "dashboard" | "students" | "teachers" | "school_admins" | "classes" | "schedule" | "payments" | "exams" | "settings" | "support";

interface DirectorLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  currentSection?: DirectorSection;
  onSectionChange?: (section: DirectorSection) => void;
  currentStudentsView?: "base" | "list" | "attach";
  onStudentsViewChange?: (view: "base" | "list" | "attach") => void;
  searchItems?: Array<{ id: string; title: string; subtitle?: string; section: DirectorSection }>;
  headerNotifications?: Array<{ id: string; text: string; at: string; section: DirectorSection }>;
  subscriptionInfo?: {
    planName: string;
    startDate?: string | null;
    endDate?: string | null;
    contractNumber?: string | null;
    status?: "active" | "expired";
    daysLeft?: number | null;
  };
}

const DirectorLayout = ({
  children,
  title,
  subtitle,
  currentSection = "dashboard",
  onSectionChange,
  currentStudentsView = "base",
  onStudentsViewChange,
  searchItems,
  headerNotifications,
  subscriptionInfo,
}: DirectorLayoutProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation("layout");
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const normalizedRole = normalizeUserRole(currentUser?.role);
  const isSchoolAdmin = normalizedRole === "school_admin";
  const dashboardHomePath = isSchoolAdmin ? "/school-admin/dashboard" : "/director/dashboard";
  const dashboardLabel = isSchoolAdmin ? t("schoolAdmin.fallbackName") : t("director.fallbackName");
  const dashboardLabelUpper = isSchoolAdmin ? t("schoolAdmin.badge") : t("director.badge");
  const subscriptionStorageKey = `dashboard:${isSchoolAdmin ? "school_admin" : "director"}:subscriptionInfo`;

  const cachedSubscriptionInfo = (() => {
    if (typeof window === "undefined") return undefined;
    const raw = localStorage.getItem(subscriptionStorageKey);
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as DirectorLayoutProps["subscriptionInfo"];
      if (!parsed || typeof parsed !== "object") return undefined;
      if (typeof parsed.planName !== "string") return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  })();

  const {
    subscriptionInfo: fetchedSubscriptionInfo,
    subscriptionLabel: fetchedSubscriptionLabel,
    planContext: fetchedPlanContext,
  } = useSchoolSubscriptionHeader();

  const effectiveSubscriptionInfo = subscriptionInfo ?? cachedSubscriptionInfo ?? fetchedSubscriptionInfo;
  const [studentsDropdownOpen, setStudentsDropdownOpen] = useState(false);
  const navItems: { label: string; section: DirectorSection; icon: typeof LayoutDashboard }[] = [
    { label: t("director.nav.dashboard"), section: "dashboard", icon: LayoutDashboard },
    { label: t("director.nav.students"), section: "students", icon: Users },
    { label: t("director.nav.teachers"), section: "teachers", icon: GraduationCap },
    { label: t("director.nav.classes"), section: "classes", icon: BookOpen },
    { label: t("director.nav.schedule"), section: "schedule", icon: CalendarDays },
    { label: t("director.nav.payments"), section: "payments", icon: Wallet },
    { label: t("director.nav.exams"), section: "exams", icon: FileText },
    { label: t("director.nav.support"), section: "support", icon: MessageCircle },
    { label: t("director.nav.settings"), section: "settings", icon: Settings },
  ];

  if (!isSchoolAdmin) {
    navItems.splice(3, 0, { label: t("director.nav.schoolAdmins"), section: "school_admins", icon: UserCircle });
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.section === "payments") {
      return hasPlanFeature(fetchedPlanContext, "finance");
    }
    return true;
  });

  const sectionLabels: Record<DirectorSection, string> = {
    dashboard: t("director.nav.dashboard"),
    students: t("director.nav.students"),
    teachers: t("director.nav.teachers"),
    school_admins: t("director.nav.schoolAdmins"),
    classes: t("director.nav.classes"),
    schedule: t("director.nav.schedule"),
    payments: t("director.nav.payments"),
    exams: t("director.nav.exams"),
    support: t("director.nav.support"),
    settings: t("director.nav.settings"),
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

  useEffect(() => {
    if (!isSchoolAdmin) return;
    if (currentSection === "students") setStudentsDropdownOpen(true);
  }, [currentSection, isSchoolAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!effectiveSubscriptionInfo) return;
    try {
      localStorage.setItem(subscriptionStorageKey, JSON.stringify(effectiveSubscriptionInfo));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [effectiveSubscriptionInfo, subscriptionStorageKey]);

  const resolvedSubscriptionInfo = (() => {
    if (!effectiveSubscriptionInfo) return undefined;

    const safeParse = (value?: string | null) => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const endDate = safeParse(effectiveSubscriptionInfo.endDate);
    const startDate = safeParse(effectiveSubscriptionInfo.startDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const computedDaysLeft = (() => {
      if (typeof effectiveSubscriptionInfo.daysLeft === "number") return effectiveSubscriptionInfo.daysLeft;
      if (!endDate) return null;
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    })();

    const computedStatus: "active" | "expired" = (() => {
      if (effectiveSubscriptionInfo.status === "expired") return "expired";
      if (effectiveSubscriptionInfo.status === "active") return "active";
      if (typeof computedDaysLeft === "number") return computedDaysLeft < 0 ? "expired" : "active";
      if (endDate) return endDate.getTime() < today.getTime() ? "expired" : "active";
      if (startDate && startDate.getTime() > today.getTime()) return "active";
      return "active";
    })();

    return {
      ...effectiveSubscriptionInfo,
      status: computedStatus,
      daysLeft: typeof computedDaysLeft === "number" ? computedDaysLeft : effectiveSubscriptionInfo.daysLeft ?? null,
    };
  })();

  const subscriptionExpired = resolvedSubscriptionInfo?.status === "expired";
  const notifyBlocked = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("subscription:blocked"));
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
                {dashboardLabelUpper}
              </span>
              <span className="truncate text-xs text-white">
                {t("director.panel")}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="group-data-[collapsible=icon]:px-1">
            <SidebarGroupLabel className="text-white">{t("common.sections")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map((item) => {
                  const isActive = item.section === currentSection;
                  const isStudentsItem = isSchoolAdmin && item.section === "students";
                  return (
                    <SidebarMenuItem key={item.label}>
                      {isStudentsItem ? (
                        <div className="group-data-[collapsible=icon]:hidden">
                          <SidebarMenuButton
                            isActive={isActive}
                            className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center text-white hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-accent"
                            onClick={() => {
                              if (subscriptionExpired) notifyBlocked();
                              onSectionChange?.("students");
                              setStudentsDropdownOpen((prev) => !prev);
                            }}
                          >
                            <Users className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${studentsDropdownOpen ? "rotate-180" : ""}`} />
                          </SidebarMenuButton>

                          {studentsDropdownOpen && (
                            <div className="mt-1 space-y-1 pl-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (subscriptionExpired) notifyBlocked();
                                  onSectionChange?.("students");
                                  onStudentsViewChange?.("base");
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 ${
                                  currentStudentsView === "base" ? "bg-white/10 text-amber-200" : ""
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex h-2 w-2 items-center justify-center rounded-full border ${
                                    currentStudentsView === "base" ? "border-amber-500" : "border-white/40"
                                  }`}
                                >
                                  <span
                                    className={`h-1 w-1 rounded-full ${
                                      currentStudentsView === "base" ? "bg-amber-500" : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                O&apos;quvchilar bazasi
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (subscriptionExpired) notifyBlocked();
                                  onSectionChange?.("students");
                                  onStudentsViewChange?.("list");
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 ${
                                  currentStudentsView === "list" ? "bg-white/10 text-amber-200" : ""
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex h-2 w-2 items-center justify-center rounded-full border ${
                                    currentStudentsView === "list" ? "border-amber-500" : "border-white/40"
                                  }`}
                                >
                                  <span
                                    className={`h-1 w-1 rounded-full ${
                                      currentStudentsView === "list" ? "bg-amber-500" : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                {t("director.studentsList")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (subscriptionExpired) notifyBlocked();
                                  onSectionChange?.("students");
                                  onStudentsViewChange?.("attach");
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 ${
                                  currentStudentsView === "attach" ? "bg-white/10 text-amber-200" : ""
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`inline-flex h-2 w-2 items-center justify-center rounded-full border ${
                                    currentStudentsView === "attach" ? "border-amber-500" : "border-white/40"
                                  }`}
                                >
                                  <span
                                    className={`h-1 w-1 rounded-full ${
                                      currentStudentsView === "attach" ? "bg-amber-500" : "bg-transparent"
                                    }`}
                                  />
                                </span>
                                {t("director.attachStudent")}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <SidebarMenuButton
                          isActive={isActive}
                          className="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center text-white hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-accent"
                          onClick={() => {
                            if (subscriptionExpired) notifyBlocked();
                            onSectionChange?.(item.section);
                          }}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
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
                  {currentUser?.name ? getInitials(currentUser.name) : isSchoolAdmin ? "SA" : "DR"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium text-white">
                  {currentUser?.name || dashboardLabel}
                </span>
                <span className="truncate text-xs text-white/90">
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
              navItems={visibleNavItems}
              currentSection={currentSection}
              onSectionChange={onSectionChange}
              profileTargetSection="settings"
              settingsTargetSection="settings"
              currentUserName={currentUser?.name}
              currentUserPhotoUrl={currentUser?.photoUrl}
              initialsFallback={currentUser?.name ? getInitials(currentUser.name) : isSchoolAdmin ? "SA" : "DR"}
              notificationStorageKey={`dashboard:${isSchoolAdmin ? "school_admin" : "director"}:notifications`}
              notifications={headerNotifications}
              searchItems={searchItems}
              onLogout={handleLogout}
              compactHeader
              subscriptionLabel={
                subscriptionInfo
                  ? resolvedSubscriptionInfo?.status === "expired"
                    ? t("subscription.expired", { defaultValue: "Muddat tugagan" })
                    : typeof resolvedSubscriptionInfo?.daysLeft === "number"
                      ? t("director.subscriptionDaysLeft", { count: Math.max(0, resolvedSubscriptionInfo.daysLeft) })
                      : t("subscription.active", { defaultValue: "Faol" })
                  : fetchedSubscriptionLabel
              }
              subscriptionInfo={resolvedSubscriptionInfo}
            />
          </div>
          <div className="flex-1 overflow-auto p-6">
            {(title || subtitle) && (
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title || (isSchoolAdmin ? t("schoolAdmin.layoutTitle") : t("director.layoutTitle"))}
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


{/* Support icons */}
        <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden font-sans md:block">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="support-fab-group support-phone-idle group relative">
              <a
                href="tel:+998931330120"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange-200 bg-white shadow-lg"
                aria-label={t("director.support.callAria")}
              >
                <span className="support-phone-shell inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
                  <PhoneCall className="support-phone-icon h-5 w-5" />
                </span>
              </a>

              <div className="pointer-events-none absolute bottom-[calc(100%+10px)] right-0 w-[320px] rounded-[26px] border border-orange-200 bg-white p-5 opacity-0 shadow-2xl transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="flex items-start gap-3">
                  <div className="support-phone-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                    <PhoneCall className="support-phone-icon h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-sans text-base font-bold text-slate-800">{t("director.support.title")}</h3>
                    <p className="text-sm leading-snug text-slate-600">{t("director.support.callDescription")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="support-fab-group group relative">
              <a
                href="https://t.me/codo_kaze"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange-200 bg-white shadow-lg"
                aria-label={t("director.support.telegramAria")}
              >
                <span className="support-phone-shell inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Send className="h-5 w-5" />
                </span>
              </a>

              <div className="pointer-events-none absolute bottom-[calc(100%+10px)] right-0 w-[320px] rounded-[26px] border border-orange-200 bg-white p-5 opacity-0 shadow-2xl transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="flex items-start gap-3">
                  <div className="support-phone-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-sans text-base font-bold text-slate-800">{t("director.support.title")}</h3>
                    <p className="text-sm leading-snug text-slate-600">{t("director.support.telegramDescription")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DirectorLayout;


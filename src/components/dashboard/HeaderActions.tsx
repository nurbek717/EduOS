import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, LogOut, Monitor, Moon, Search, Settings, Sun, User, MapPin, Heart, Plane, Clock3, ChevronDown, Scan, UserCircle, Tag, CalendarDays, Hash, ShieldCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppLanguage } from "@/context/LanguageContext";
import { APP_LANGUAGES } from "@/lib/translations";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderNavItem<T extends string> = {
  label: string;
  section: T;
};

type NotificationItem = {
  id: string;
  text: string;
  at: string;
  section: string;
};

type ExternalNotification<T extends string> = {
  id: string;
  text: string;
  at: string;
  section: T;
};

const EMPTY_EXTERNAL_NOTIFICATIONS: ExternalNotification<never>[] = [];

type SubscriptionInfo = {
  planName: string;
  startDate?: string | null;
  endDate?: string | null;
  contractNumber?: string | null;
  status?: "active" | "expired";
  daysLeft?: number | null;
};

type SubscriptionListItem = SubscriptionInfo & {
  schoolId?: string | null;
};

interface HeaderActionsProps<T extends string> {
  navItems: HeaderNavItem<T>[];
  currentSection: T;
  onSectionChange?: (section: T) => void;
  currentUserName?: string;
  currentUserPhotoUrl?: string | null;
  initialsFallback: string;
  notificationStorageKey: string;
  notifications?: Array<{
    id: string;
    text: string;
    at: string;
    section: T;
  }>;
  searchItems?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    section: T;
  }>;
  onLogout?: () => void;
  locationLabel?: string;
  showTravelNavigation?: boolean;
  profileTargetSection?: T;
  settingsTargetSection?: T;
  compactHeader?: boolean;
  subscriptionLabel?: string;
  subscriptionInfo?: SubscriptionInfo;
  subscriptionItems?: SubscriptionListItem[];
}

const nowLabel = (locale: string) =>
  new Date().toLocaleString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

const HeaderActions = <T extends string>({
  navItems,
  currentSection,
  onSectionChange,
  currentUserName,
  currentUserPhotoUrl,
  initialsFallback,
  notificationStorageKey,
  notifications,
  searchItems = [],
  onLogout,
  locationLabel = "Tashkent, Uzbekistan",
  showTravelNavigation = true,
  profileTargetSection,
  settingsTargetSection,
  compactHeader = false,
  subscriptionLabel = "15 kun qoldi",
  subscriptionInfo,
  subscriptionItems = [],
}: HeaderActionsProps<T>) => {
  const [query, setQuery] = useState("");
  const [localNotifications, setLocalNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotifiedSectionRef = useRef<T | null>(null);
  const externalNotifications =
    (notifications as ExternalNotification<T>[] | undefined)
    ?? (EMPTY_EXTERNAL_NOTIFICATIONS as unknown as ExternalNotification<T>[]);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    return "system";
  });
  const { language, setLanguage } = useAppLanguage();
  const { t } = useTranslation("common");
  const hasExternalNotifications = externalNotifications.length > 0;


  const normalizedQuery = query.trim().toLowerCase();
  const filteredNavItems = useMemo(() => {
    if (!normalizedQuery) return [];
    return navItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery)).slice(0, 6);
  }, [navItems, normalizedQuery]);
  const filteredDataItems = useMemo(() => {
    if (!normalizedQuery) return [];
    return searchItems
      .filter((item) => {
        const haystack = `${item.title} ${item.subtitle || ""} ${item.id}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [searchItems, normalizedQuery]);

  useEffect(() => {
    if (hasExternalNotifications) {
      const rawRead = localStorage.getItem(`${notificationStorageKey}:readIds`);
      let readIds: string[] = [];

      if (rawRead) {
        try {
          const parsed = JSON.parse(rawRead);
          if (Array.isArray(parsed)) {
            readIds = parsed.filter((value): value is string => typeof value === "string");
          }
        } catch {
          readIds = [];
        }
      }

      const unread = externalNotifications.filter((item) => !readIds.includes(item.id)).length;
      setUnreadCount(unread);
      return;
    }

    const raw = localStorage.getItem(notificationStorageKey);
    const rawUnread = localStorage.getItem(`${notificationStorageKey}:unread`);
    if (raw) {
      try {
        setLocalNotifications(JSON.parse(raw));
      } catch {
        setLocalNotifications([]);
      }
    } else {
      setLocalNotifications([]);
    }
    setUnreadCount(rawUnread ? Number(rawUnread) || 0 : 0);
  }, [externalNotifications, hasExternalNotifications, notificationStorageKey]);

  useEffect(() => {
    if (hasExternalNotifications) return;

    const current = navItems.find((item) => item.section === currentSection);
    if (!current) return;
    if (lastNotifiedSectionRef.current === current.section) return;

    lastNotifiedSectionRef.current = current.section;

    const item: NotificationItem = {
      id: `${Date.now()}-${current.section}`,
      text: t("notifications.sectionOpened", { section: current.label }),
      at:
        nowLabel(
          typeof document !== "undefined" && document.documentElement.lang ? document.documentElement.lang : "uz-UZ",
        ) || "",
      section: current.section,
    };
    setLocalNotifications((prev) => {
      const next = [item, ...prev].slice(0, 8);
      localStorage.setItem(notificationStorageKey, JSON.stringify(next));
      return next;
    });
    setUnreadCount((prev) => {
      const next = prev + 1;
      localStorage.setItem(`${notificationStorageKey}:unread`, String(next));
      return next;
    });
  }, [currentSection, hasExternalNotifications, navItems, notificationStorageKey, t]);

  const applyTheme = (mode: "light" | "dark" | "system") => {
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : false;
    const isDark = mode === "dark" ? true : mode === "light" ? false : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  };

  useEffect(() => {
    applyTheme(themeMode);
    localStorage.setItem("theme", themeMode);

    if (themeMode !== "system" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [themeMode]);

  const markAllRead = (open: boolean) => {
    if (!open) return;

    if (hasExternalNotifications) {
      const allIds = externalNotifications.map((item) => item.id);
      localStorage.setItem(`${notificationStorageKey}:readIds`, JSON.stringify(allIds));
      setUnreadCount(0);
      return;
    }

    setUnreadCount(0);
    localStorage.setItem(`${notificationStorageKey}:unread`, "0");
  };

  const jumpToSection = (section: T) => {
    onSectionChange?.(section);
    setQuery("");
  };

  const initials =
    currentUserName
      ?.split(" ")
      .map((v) => v[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || initialsFallback;

  const displayedNotifications = hasExternalNotifications ? externalNotifications : localNotifications;
  const languageFlag = language === "ru" ? "🇷🇺" : language === "en" ? "🇺🇸" : "🇺🇿";
  const languageOptions: Array<{ code: (typeof APP_LANGUAGES)[number]; label: string; flag: string }> = [
    { code: "uz", label: "Uzbek", flag: "🇺🇿" },
    { code: "ru", label: "Russian", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇺🇸" },
  ];
  const resolvedSubscription: SubscriptionInfo = subscriptionInfo || {
    planName: "Obuna",
    startDate: null,
    endDate: null,
    contractNumber: "-",
    status: "active",
    daysLeft: null,
  };
  const hasSubscriptionList = subscriptionItems.length > 0;
  const expiredSubscriptions = subscriptionItems.filter((item) => item.status === "expired").length;
  const isSubscriptionExpired = hasSubscriptionList ? expiredSubscriptions > 0 : resolvedSubscription.status === "expired";

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("uz-UZ");
  };

  const handleToggleFullscreen = async () => {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore fullscreen errors (browser restrictions, etc.)
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
      {!compactHeader && (
      <div className="relative hidden md:block">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (filteredDataItems.length > 0) {
              jumpToSection(filteredDataItems[0].section);
              return;
            }
            if (filteredNavItems.length > 0) {
              jumpToSection(filteredNavItems[0].section);
            }
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-[300px] rounded-lg border border-slate-200 bg-slate-50 pl-8 text-sm font-medium text-slate-600 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </form>
        {normalizedQuery && (
          <div className="absolute right-0 top-11 z-50 w-[300px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {filteredDataItems.length > 0 && (
              <>
                {filteredDataItems.map((item) => (
                  <button
                    key={`data-${item.id}-${item.section}`}
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => jumpToSection(item.section)}
                  >
                    <span className="text-sm text-slate-800">{item.title}</span>
                    <span className="text-xs text-slate-500">
                      ID: {item.id}
                      {item.subtitle ? ` • ${item.subtitle}` : ""}
                    </span>
                  </button>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {filteredNavItems.length > 0 ? (
              filteredNavItems.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => jumpToSection(item.section)}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-slate-400">Enter</span>
                </button>
              ))
            ) : filteredDataItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">{t("search.notFound")}</div>
            ) : null}
          </div>
        )}
      </div>
      )}

      {compactHeader && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`hidden h-8 min-w-[168px] items-center justify-between gap-2 rounded-[5px] border px-2.5 text-sm font-semibold md:inline-flex ${
                  isSubscriptionExpired
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-[#c7ddd5] bg-[#eef6f3] text-amber-700"
                }`}
              >
                <Clock3 className={`h-4 w-4 ${isSubscriptionExpired ? "text-rose-600" : "text-amber-600"}`} />
                <span className="whitespace-nowrap leading-none">{subscriptionLabel}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className={`relative border-none rounded-none bg-white p-0 overflow-hidden ${
                hasSubscriptionList
                  ? "!w-[520px] !px-3.5 !py-2.5"
                  : "!min-w-400 !w-400 !h-[199px] !px-3.5 !py-2.5"
              }`}
            >
              <div className="absolute -top-[7px] right-7 h-3.5 w-3.5 rotate-45 border-l border-t border-slate-200 bg-white" />
              {hasSubscriptionList ? (
                <div className="relative max-h-[420px] w-full overflow-auto bg-white border border-1">
                  <div className="sticky top-0 z-10 grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr] gap-2 border-b bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                    <span>Maktab</span>
                    <span>Boshlanish</span>
                    <span>Tugash</span>
                    <span>Qoldi</span>
                    <span className="text-right">Holati</span>
                  </div>
                  {subscriptionItems.map((item) => (
                    <div
                      key={`${item.schoolId || item.planName}-${item.endDate || ""}`}
                      className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr] items-center gap-2 border-b px-3 py-2 text-xs last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{item.planName || "-"}</div>
                        <div className="truncate text-[10px] text-slate-500">{item.contractNumber || "-"}</div>
                      </div>
                      <span className="font-medium text-slate-700">{formatDate(item.startDate)}</span>
                      <span className="font-medium text-slate-700">{formatDate(item.endDate)}</span>
                      <span className="font-semibold text-slate-900">
                        {item.status === "expired"
                          ? "Tugagan"
                          : typeof item.daysLeft === "number"
                            ? `${Math.max(0, item.daysLeft)} kun`
                            : "-"}
                      </span>
                      <span className={`justify-self-end rounded-full px-3 py-1 font-semibold ${
                        item.status === "expired" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {item.status === "expired" ? "Nofaol" : "Faol"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative h-[179px] w-[311px] overflow-auto  bg-white border border-1">
                  <div
                    style={{ height: "273px", width: "37.59px" }}
                    className="pointer-events-none absolute right-1 top-8 h-[273px] w-[37.59px] rounded-md"
                  />
                  <div className="grid grid-cols-[1fr_auto] items-center border-b px-2 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><Tag className="h-4 w-4 text-teal-600" /> Joriy tarif</div>
                    <div className="font-semibold text-slate-900">{resolvedSubscription.planName || "-"}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center border-b px-2 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><CalendarDays className="h-4 w-4 text-teal-600" /> Boshlanish sanasi</div>
                    <div className="font-semibold text-slate-900">{formatDate(resolvedSubscription.startDate)}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center border-b px-2 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><CalendarDays className="h-4 w-4 text-teal-600" /> Tugash sanasi</div>
                    <div className="font-semibold text-slate-900">{formatDate(resolvedSubscription.endDate)}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center border-b px-2 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><Hash className="h-4 w-4 text-teal-600" /> Shartnoma raqami</div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <span>{resolvedSubscription.contractNumber || "-"}</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600"
                        onClick={() => {
                          const value = resolvedSubscription.contractNumber || "";
                          if (value && typeof navigator !== "undefined" && navigator.clipboard) {
                            void navigator.clipboard.writeText(value);
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center px-2 py-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600"><ShieldCheck className="h-4 w-4 text-teal-600" /> Holati</div>
                    <div className={`rounded-full px-3 py-1 font-semibold ${resolvedSubscription.status === "expired" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {resolvedSubscription.status === "expired" ? "Nofaol" : "Faol"}
                    </div>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu onOpenChange={markAllRead}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-[5px] bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {displayedNotifications.length > 0 ? (
                displayedNotifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="flex cursor-pointer flex-col items-start gap-1 py-2"
                    onClick={() => jumpToSection(item.section as T)}
                  >
                    <span className="text-sm text-slate-800">{item.text}</span>
                    <span className="text-xs text-slate-500">{item.at}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-3 text-sm text-slate-500">{t("notifications.empty")}</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100 text-base"
                title={t("preferences.language")}
                aria-label={t("preferences.language")}
              >
                <span>{languageFlag}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  onSelect={() => setLanguage(option.code)}
                  className="flex cursor-pointer items-center gap-3 py-2 text-base text-slate-700 hover:bg-transparent focus:bg-transparent data-[highlighted]:bg-transparent hover:text-[#F47C20] focus:text-[#F47C20] data-[highlighted]:text-[#F47C20]"
                >
                  <span className="text-2xl leading-none">{option.flag}</span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => void handleToggleFullscreen()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100"
            title="Fullscreen"
            aria-label="Fullscreen"
          >
            <Scan className="h-4 w-4 text-slate-700" />
          </button>
        </>
      )}

      {!compactHeader && (
      <DropdownMenu onOpenChange={markAllRead}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-full"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {displayedNotifications.length > 0 ? (
            displayedNotifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="flex cursor-pointer flex-col items-start gap-1 py-2"
                onClick={() => jumpToSection(item.section as T)}
              >
                <span className="text-sm text-slate-800">{item.text}</span>
                <span className="text-xs text-slate-500">{item.at}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-slate-500">{t("notifications.empty")}</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compactHeader ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100"
              aria-label={t("account.profile")}
              title={t("account.profile")}
            >
              {currentUserPhotoUrl ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUserPhotoUrl || undefined} alt={currentUserName || "User"} />
                  <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserCircle className="h-6 w-6 text-slate-600" />
              )}
            </button>
          ) : (
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={currentUserPhotoUrl || undefined} alt={currentUserName || "User"} />
              <AvatarFallback className="bg-slate-200 text-xs font-semibold text-slate-600">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[300px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-4">
              {currentUserPhotoUrl ? (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentUserPhotoUrl || undefined} alt={currentUserName || "User"} />
                  <AvatarFallback className="bg-slate-200 text-xl font-semibold text-slate-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserCircle className="h-12 w-12 text-slate-500" />
              )}
              <div className="min-w-0">
                <div
                  className="truncate text-[14px] font-semibold leading-none text-slate-800"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {currentUserName || t("user.fallback")}
                </div>
                <div
                  className="mt-1 truncate text-[14px] text-slate-600"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {locationLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2 text-base text-slate-700 hover:bg-orange-50 hover:text-[#F47C20] focus:bg-orange-50 focus:text-[#F47C20] data-[highlighted]:bg-orange-50 data-[highlighted]:text-[#F47C20]"
            onSelect={() => {
              if (profileTargetSection) {
                jumpToSection(profileTargetSection);
              }
            }}
          >
            <User className="mr-2 h-4 w-4" />
            {t("account.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer !mt-0 rounded-lg px-3 py-2 text-base text-slate-700 hover:bg-orange-50 hover:text-[#F47C20] focus:bg-orange-50 focus:text-[#F47C20] data-[highlighted]:bg-orange-50 data-[highlighted]:text-[#F47C20]"
            onSelect={() => {
              if (settingsTargetSection) {
                jumpToSection(settingsTargetSection);
              }
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t("account.settings")}
          </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="mt-1" />

          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-3 text-base text-red-600 hover:bg-orange-50 hover:text-red-700 focus:bg-orange-50 focus:text-red-700 data-[highlighted]:bg-orange-50 data-[highlighted]:text-red-700"
            onSelect={(e) => {
              e.preventDefault();
              onLogout?.();
            }}
            disabled={!onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("auth.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </>
  );
};

export default HeaderActions;

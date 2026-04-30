import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { dashboardPathByRole, getStoredAuth, normalizeUserRole } from "@/lib/auth";

type SubscriptionStatus = {
  startAt?: string | null;
  endAt?: string | null;
  daysLeft?: number | null;
  isExpired?: boolean;
};

type Props = {
  children: ReactNode;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const buildDashboardHomePath = (role: ReturnType<typeof normalizeUserRole>) => dashboardPathByRole(role);

const getCachedExpiredFlag = (role: ReturnType<typeof normalizeUserRole>) => {
  if (typeof window === "undefined") return null;
  if (!role) return null;
  const key = `dashboard:${role}:subscriptionInfo`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { endDate?: string | null; status?: "active" | "expired" };
    if (parsed?.status === "expired") return true;
    if (parsed?.endDate) return new Date(parsed.endDate).getTime() < Date.now();
    return null;
  } catch {
    return null;
  }
};

export default function SubscriptionGuard({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const lastShownAtRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  const { token, user } = getStoredAuth();
  const normalizedRole = useMemo(() => normalizeUserRole(user?.role), [user?.role]);
  const homePath = useMemo(() => buildDashboardHomePath(normalizedRole), [normalizedRole]);

  const [expired, setExpired] = useState<boolean>(() => {
    const cached = getCachedExpiredFlag(normalizedRole);
    return cached === true;
  });
  const [bannerOpen, setBannerOpen] = useState(false);

  const showExpiredBanner = () => {
    const now = Date.now();
    if (now - lastShownAtRef.current < 1500) return;
    lastShownAtRef.current = now;
    setBannerOpen(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setBannerOpen(false), 5000);
  };

  const fetchStatus = async () => {
    if (!token) return;
    if (!normalizedRole || normalizedRole === "super_admin") return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/subscription/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { subscription?: SubscriptionStatus | null };
      const isExpired = Boolean(data?.subscription?.isExpired);
      setExpired(isExpired);
    } catch {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    void fetchStatus();
    const interval = window.setInterval(() => {
      void fetchStatus();
    }, 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, normalizedRole]);

  const shouldApplyGuard = normalizedRole === "director" || normalizedRole === "school_admin";
  // super_admin must never be blocked
  const shouldApplyGuardAllRoles = Boolean(normalizedRole) && normalizedRole !== "super_admin";
  const isOnHome = location.pathname === homePath;
  const shouldBlockRender = shouldApplyGuardAllRoles && expired && !isOnHome;

  useLayoutEffect(() => {
    if (!shouldApplyGuardAllRoles) return;
    if (!expired) return;

    if (!isOnHome) {
      showExpiredBanner();
      navigate(homePath, { replace: true });
      return;
    }
  }, [expired, homePath, isOnHome, navigate, shouldApplyGuardAllRoles]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onBlocked = () => showExpiredBanner();
    window.addEventListener("subscription:blocked", onBlocked as EventListener);
    return () => window.removeEventListener("subscription:blocked", onBlocked as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {shouldBlockRender ? null : children}

      {bannerOpen && (
        <div className="fixed right-4 top-4 z-[9999] w-[min(365px,calc(100vw-32px))]">
          <div className="relative min-h-[136px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Yopish"
              onClick={() => setBannerOpen(false)}
            >
              <X size={23.23} className="h-[23.23px] w-[23.23px]" />
            </button>

            <div className="flex items-start gap-4 p-5">
              <div className="flex h-[23.23px] w-[23.23px] shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <X size={14} className="h-[14px] w-[14px]" />
              </div>
              <div className="min-w-0 space-y-2 pr-10">
                <div className="text-lg font-extrabold text-slate-900">Muddat tugagan</div>
                <div className="text-[13px] leading-relaxed text-slate-600">
                  Tarif davringiz yakunlangan. Tizimdan to&apos;liq foydalanishni davom ettirish uchun to&apos;lovni amalga oshiring.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


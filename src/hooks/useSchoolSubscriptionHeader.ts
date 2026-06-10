import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStoredAuth, normalizeUserRole } from "@/lib/auth";
import {
  buildSubscriptionHeaderInfo,
  type SchoolSubscriptionApi,
  type SubscriptionHeaderInfo,
} from "@/lib/school-subscription";
import { buildSchoolPlanContext, type SchoolPlanContext } from "@/lib/school-plan-features";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const SCHOOL_ROLES = new Set(["director", "school_admin", "teacher", "student", "parent"]);

export function useSchoolSubscriptionHeader() {
  const { t } = useTranslation("common");
  const { token, user } = getStoredAuth();
  const role = normalizeUserRole(user?.role);
  const schoolId = user?.schoolId ? String(user.schoolId) : null;
  const storageKey = role ? `dashboard:${role}:subscriptionInfo` : null;

  const [subscription, setSubscription] = useState<SchoolSubscriptionApi | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token || !role || !SCHOOL_ROLES.has(role)) {
      setLoaded(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/director/subscription/status`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { subscription?: SchoolSubscriptionApi | null };
        if (!cancelled) {
          setSubscription(data.subscription ?? null);
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    void load();
    const intervalId = window.setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, role]);

  const subscriptionInfo = useMemo(
    () => buildSubscriptionHeaderInfo(subscription, { schoolId }),
    [subscription, schoolId],
  );

  useEffect(() => {
    if (!storageKey || !subscriptionInfo) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(subscriptionInfo));
    } catch {
      // ignore quota / private mode
    }
  }, [storageKey, subscriptionInfo]);

  const subscriptionLabel = useMemo(() => {
    if (!subscriptionInfo) {
      return loaded ? t("subscription.unassigned", { defaultValue: "Obuna belgilanmagan" }) : "…";
    }
    if (subscriptionInfo.status === "expired") {
      return t("subscription.expired", { defaultValue: "Muddat tugagan" });
    }
    if (typeof subscriptionInfo.daysLeft === "number") {
      return t("subscription.daysLeft", { count: Math.max(0, subscriptionInfo.daysLeft) });
    }
    return t("subscription.active", { defaultValue: "Faol" });
  }, [loaded, subscriptionInfo, t]);

  const planContext = useMemo(
    () => buildSchoolPlanContext(subscription),
    [subscription],
  );

  return {
    subscriptionInfo,
    subscriptionLabel,
    subscription,
    planContext,
    loaded,
  };
}

export type { SubscriptionHeaderInfo, SchoolPlanContext };

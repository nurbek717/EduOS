import type { PlanFeatures, PlanLimits } from "@/lib/school-plan-features";

export type SchoolSubscriptionApi = {
  startAt?: string | null;
  endAt?: string | null;
  daysLeft?: number | null;
  isExpired?: boolean;
  planName?: string | null;
  features?: Partial<PlanFeatures> | null;
  limits?: Partial<PlanLimits> | null;
};

export type SubscriptionHeaderInfo = {
  planName: string;
  startDate?: string | null;
  endDate?: string | null;
  contractNumber?: string | null;
  status?: "active" | "expired";
  daysLeft?: number | null;
};

/** Super admin biriktirgan tarif nomi; muddatdan "1 oylik" chiqarilmaydi. */
export function resolveSubscriptionPlanName(planName?: string | null): string {
  const trimmed = (planName || "").trim();
  return trimmed || "Obuna belgilanmagan";
}

export function buildDefaultContractNumber(schoolId?: string | null): string {
  if (schoolId && schoolId.length >= 6) {
    return `MYS-${schoolId.slice(-6).toUpperCase()}/26`;
  }
  return "MYS-133891/26";
}

export function buildSubscriptionHeaderInfo(
  subscription: SchoolSubscriptionApi | null | undefined,
  options?: { contractNumber?: string | null; schoolId?: string | null },
): SubscriptionHeaderInfo | undefined {
  if (!subscription) return undefined;

  const now = Date.now();
  const endMs = subscription.endAt ? new Date(subscription.endAt).getTime() : Number.NaN;
  const validEnd = Number.isFinite(endMs);
  const isExpired =
    Boolean(subscription.isExpired) || (validEnd && endMs < now);

  const daysLeft =
    typeof subscription.daysLeft === "number"
      ? subscription.daysLeft
      : validEnd
        ? Math.ceil((endMs - now) / (1000 * 60 * 60 * 24))
        : null;

  const storedContract =
    typeof window !== "undefined" ? localStorage.getItem("subscription_contract_number") : null;

  return {
    planName: resolveSubscriptionPlanName(subscription.planName),
    startDate: subscription.startAt ?? null,
    endDate: subscription.endAt ?? null,
    contractNumber:
      options?.contractNumber?.trim() ||
      storedContract?.trim() ||
      buildDefaultContractNumber(options?.schoolId),
    status: isExpired ? "expired" : "active",
    daysLeft,
  };
}

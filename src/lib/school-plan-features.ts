export type PlanFeatures = {
  analytics: boolean;
  ai: boolean;
  payment: boolean;
  attendanceReports: boolean;
  finance: boolean;
};

export type PlanLimits = {
  maxStudents: number;
  maxBranches: number;
  planName?: string;
};

export type SchoolPlanContext = {
  planName: string;
  features: PlanFeatures;
  limits: PlanLimits;
  isExpired: boolean;
};

const DEFAULT_FEATURES: PlanFeatures = {
  analytics: false,
  ai: false,
  payment: false,
  attendanceReports: true,
  finance: false,
};

const DEFAULT_LIMITS: PlanLimits = {
  maxStudents: 200,
  maxBranches: 1,
  planName: "Bepul",
};

export function normalizePlanFeatures(raw?: Partial<PlanFeatures> | null): PlanFeatures {
  return {
    analytics: Boolean(raw?.analytics),
    ai: Boolean(raw?.ai),
    payment: Boolean(raw?.payment),
    attendanceReports: raw?.attendanceReports !== false,
    finance: Boolean(raw?.finance),
  };
}

export function buildSchoolPlanContext(
  subscription?: {
    planName?: string | null;
    features?: Partial<PlanFeatures> | null;
    limits?: Partial<PlanLimits> | null;
    isExpired?: boolean;
  } | null,
  overview?: {
    planFeatures?: Partial<PlanFeatures> | null;
    planLimits?: Partial<PlanLimits> | null;
    subscription?: { planName?: string | null; isExpired?: boolean } | null;
  } | null,
): SchoolPlanContext {
  const features = normalizePlanFeatures(
    overview?.planFeatures ?? subscription?.features ?? DEFAULT_FEATURES,
  );
  const limits: PlanLimits = {
    maxStudents: overview?.planLimits?.maxStudents ?? subscription?.limits?.maxStudents ?? DEFAULT_LIMITS.maxStudents,
    maxBranches: overview?.planLimits?.maxBranches ?? subscription?.limits?.maxBranches ?? DEFAULT_LIMITS.maxBranches,
    planName:
      overview?.planLimits?.planName ??
      subscription?.limits?.planName ??
      subscription?.planName ??
      overview?.subscription?.planName ??
      DEFAULT_LIMITS.planName,
  };

  return {
    planName: limits.planName || "Obuna belgilanmagan",
    features,
    limits,
    isExpired: Boolean(overview?.subscription?.isExpired ?? subscription?.isExpired),
  };
}

export function hasPlanFeature(ctx: SchoolPlanContext, key: keyof PlanFeatures): boolean {
  return Boolean(ctx.features[key]);
}

export function comparePlanTier(planName: string): number {
  const order = ["Bepul", "Standard", "Pro", "Premium"];
  const idx = order.indexOf(planName);
  return idx === -1 ? 0 : idx;
}

export function requiredPlanLabelForFeature(feature: keyof PlanFeatures): string {
  if (feature === "finance" || feature === "analytics") return "Pro";
  if (feature === "ai") return "Premium";
  if (feature === "payment" || feature === "attendanceReports") return "Standard";
  return "Pro";
}

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanFeatures, SchoolPlanContext } from "@/lib/school-plan-features";
import { hasPlanFeature, requiredPlanLabelForFeature } from "@/lib/school-plan-features";
import PlanFeatureLockedOverlay from "./PlanFeatureLockedOverlay";

type Props = {
  plan: SchoolPlanContext;
  feature: keyof PlanFeatures;
  title: string;
  description: string;
  children: ReactNode;
  blurOnPlans?: string[];
};

const PlanFeatureGate = ({ plan, feature, title, description, children, blurOnPlans }: Props) => {
  if (hasPlanFeature(plan, feature)) {
    if (blurOnPlans && blurOnPlans.includes(plan.planName)) {
      return <PlanFeatureLockedOverlay locked>{children}</PlanFeatureLockedOverlay>;
    }
    return <>{children}</>;
  }

  const requiredPlan = requiredPlanLabelForFeature(feature);

  return (
    <Card className="border-amber-200 bg-amber-50/60">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base text-amber-950">{title}</CardTitle>
            <CardDescription className="text-amber-900/80">{description}</CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">
                Joriy tarif: {plan.planName}
              </Badge>
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                Kerak: {requiredPlan}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-amber-900/90">
        Bu funksiya faqat yuqoriroq tarifda ochiladi. Super admin maktab obunasini yangilashi kerak.
      </CardContent>
    </Card>
  );
};

export default PlanFeatureGate;

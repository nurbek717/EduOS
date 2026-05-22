import { ReactNode } from "react";
import { Lock } from "lucide-react";

type Props = {
  children: ReactNode;
  locked?: boolean;
};

const PlanFeatureLockedOverlay = ({ children, locked = false }: Props) => {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-blue-200/50">
          <Lock className="h-9 w-9 text-blue-400" />
        </div>
      </div>
    </div>
  );
};

export default PlanFeatureLockedOverlay;

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { Pie, PieChart } from "recharts";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type DashboardAlertRow = {
  level: "info" | "warning";
  message: string;
};

type PieRow = {
  browser: string;
  visitors: number;
  fill: string;
};

/** Ogohlantirish darajasi: info — ko‘k, warning — sariq/amber (`index.css` dagi chart tokenlar). */
function fillForAlertLevel(level: DashboardAlertRow["level"]): string {
  return level === "warning" ? "var(--chart-2)" : "var(--chart-1)";
}

export function DirectorDashboardAlertsPie({ alerts }: { alerts: DashboardAlertRow[] }) {
  const { t } = useTranslation("director-dashboard");

  const levelCounts = useMemo(() => {
    let info = 0;
    let warning = 0;
    for (const a of alerts) {
      if (a.level === "warning") warning += 1;
      else info += 1;
    }
    return { info, warning };
  }, [alerts]);

  /** Pie da faqat 2 ta dilim: barcha info bitta ko‘k, barcha warning bitta sariq. */
  const chartData = useMemo<PieRow[]>(() => {
    const rows: PieRow[] = [];
    if (levelCounts.info > 0) {
      rows.push({
        browser: "info",
        visitors: levelCounts.info,
        fill: "var(--chart-1)",
      });
    }
    if (levelCounts.warning > 0) {
      rows.push({
        browser: "warning",
        visitors: levelCounts.warning,
        fill: "var(--chart-2)",
      });
    }
    return rows;
  }, [levelCounts.info, levelCounts.warning]);

  const chartConfig = useMemo(
    () =>
      ({
        visitors: { label: t("alertsPieCountLabel") },
        info: { label: t("alertsLevelInfo"), color: "var(--chart-1)" },
        warning: { label: t("alertsLevelWarning"), color: "var(--chart-2)" },
      }) satisfies ChartConfig,
    [t],
  );

  return (
    <Card className="flex h-[400px] flex-col overflow-hidden">
      <CardHeader className="shrink-0 items-start space-y-0.5 px-4 pb-2 pt-3 text-left">
        <CardTitle className="text-left text-sm font-semibold leading-tight">{t("alertsTitle")}</CardTitle>
        <CardDescription className="line-clamp-2 text-left text-[11px] leading-snug">{t("alertsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 items-center justify-center bg-slate-50/40 px-3 pb-1 pt-0">
        {chartData.length > 0 ? (
          <div className="relative flex h-[220px] w-[220px] shrink-0 items-center justify-center motion-reduce:animate-none">
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
              aria-hidden
            >
              <span
                className="absolute aspect-square w-[72%] max-w-[220px] rounded-full border-2 border-[hsl(210_78%_55%/0.28)] animate-alerts-pie-ripple"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="absolute aspect-square w-[72%] max-w-[220px] rounded-full border-2 border-[hsl(38_92%_50%/0.3)] animate-alerts-pie-ripple"
                style={{ animationDelay: "0.92s" }}
              />
              <span
                className="absolute aspect-square w-[72%] max-w-[220px] rounded-full border-2 border-[hsl(210_78%_55%/0.2)] animate-alerts-pie-ripple"
                style={{ animationDelay: "1.84s" }}
              />
            </div>
            <ChartContainer
              config={chartConfig}
              className="relative z-10 aspect-square h-full w-full justify-center [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:!w-full"
            >
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="visitors"
                  nameKey="browser"
                  stroke="none"
                  strokeWidth={0}
                  label={false}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
          <p className="px-2 text-left text-xs text-muted-foreground">{t("alertsEmpty")}</p>
        )}
      </CardContent>
      <CardFooter className="shrink-0 flex-col gap-1.5 border-t border-border/60 bg-card px-4 py-2.5 text-xs">
        {alerts.length > 0 ? (
          <>
            <div className="flex items-center justify-start gap-1.5 font-medium leading-none">
              {t("alertsPieFooterSummary", { count: alerts.length })}
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            </div>
            <div className="flex max-h-[100px] flex-col gap-1.5 overflow-y-auto leading-snug text-muted-foreground">
              {alerts.map((alert, idx) => {
                const dot = fillForAlertLevel(alert.level);
                return (
                  <p
                    key={`${alert.level}-${idx}`}
                    className={`flex items-start gap-2 rounded-md border border-slate-200/90 bg-slate-50/80 px-2 py-1.5 text-left text-[11px] leading-snug text-foreground ${
                      alert.level === "warning" ? "font-medium" : ""
                    }`}
                  >
                    <span
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-300/80"
                      style={{ backgroundColor: dot }}
                      aria-hidden
                    />
                    <span>{alert.message}</span>
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-left leading-snug text-muted-foreground">{t("alertsEmpty")}</div>
        )}
      </CardFooter>
    </Card>
  );
}

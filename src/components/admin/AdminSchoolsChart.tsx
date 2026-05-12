import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type MonthPoint = {
  yearMonth: string;
  count: number;
};

type Props = {
  data: MonthPoint[];
  monthOffset: number;
  onChangeMonth: (direction: "prev" | "next") => void;
};

function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

/** Radar o‘qlarida oy nomlari doim o‘zbekcha (talab). */
const UZ_MONTH_SHORT: Record<number, string> = {
  1: "yan",
  2: "fev",
  3: "mart",
  4: "apr",
  5: "may",
  6: "iyun",
  7: "iyul",
  8: "avg",
  9: "sen",
  10: "okt",
  11: "noy",
  12: "dek",
};

function formatYearMonthFooter(ym: string, t: (key: string) => string): string | null {
  const parsed = parseYearMonth(ym);
  if (!parsed) return null;
  const monthName = t(`overview.chart.monthNamesFull.${parsed.month}`);
  return `${monthName} ${parsed.year}`;
}

const AdminSchoolsChart = ({ data, monthOffset, onChangeMonth }: Props) => {
  const { t } = useTranslation("admin-dashboard");

  const chartData = useMemo(() => {
    return data.map((row) => {
      const parsed = parseYearMonth(row.yearMonth);
      const monthLabel =
        parsed != null ? (UZ_MONTH_SHORT[parsed.month] ?? row.yearMonth) : row.yearMonth;
      return {
        ...row,
        monthLabel,
      };
    });
  }, [data]);

  const chartConfig = {
    count: {
      label: t("overview.chart.radarSeriesLabel"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const totalNew = useMemo(() => chartData.reduce((acc, row) => acc + row.count, 0), [chartData]);

  const dataMaxCount = useMemo(() => chartData.reduce((m, row) => Math.max(m, row.count), 0), [chartData]);
  const radiusDomainMax = Math.max(1, dataMaxCount);

  const RADIAL_RING_COUNT = 4;
  const radiusTicks = useMemo(
    () =>
      Array.from({ length: RADIAL_RING_COUNT }, (_, i) => ((i + 1) / RADIAL_RING_COUNT) * radiusDomainMax),
    [radiusDomainMax],
  );

  const hasRows = chartData.length > 0;

  const periodRangeLabel = useMemo(() => {
    if (!data.length) return null;
    const startYm = data[0].yearMonth;
    const endYm = data[data.length - 1].yearMonth;
    const a = formatYearMonthFooter(startYm, t);
    const b = formatYearMonthFooter(endYm, t);
    if (!a || !b) return null;
    return t("overview.chart.footerPeriodRange", { start: a, end: b });
  }, [data, t]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle>{t("overview.chart.title")}</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            type="button"
            title={t("overview.chart.prevPeriod")}
            onClick={() => onChangeMonth("prev")}
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            type="button"
            title={t("overview.chart.nextPeriod")}
            disabled={monthOffset === 0}
            onClick={() => onChangeMonth("next")}
          >
            ›
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {hasRows ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px] w-full">
            <RadarChart data={chartData}>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { monthLabel?: string } | undefined;
                      return row?.monthLabel ?? "";
                    }}
                  />
                }
              />
              <PolarAngleAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <PolarGrid className="stroke-border/50" gridType="polygon" radialLines />
              <PolarRadiusAxis
                angle={90}
                domain={[0, radiusDomainMax]}
                ticks={radiusTicks}
                tick={false}
              />
              <Radar
                name="count"
                dataKey="count"
                fill="var(--color-count)"
                fillOpacity={0.55}
                dot={{ r: 4, fillOpacity: 1 }}
              />
            </RadarChart>
          </ChartContainer>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">{t("overview.chart.empty")}</p>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {t("overview.chart.footerTotal", { count: totalNew })}
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        {periodRangeLabel ? (
          <div className="leading-snug text-muted-foreground">{periodRangeLabel}</div>
        ) : null}
      </CardFooter>
    </Card>
  );
};

export default AdminSchoolsChart;

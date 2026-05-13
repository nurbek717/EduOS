import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MonthRow = { yearMonth: string; count: number };

type TrendRange = "3" | "6" | "12";

type Props = {
  schoolsTrend12Months: MonthRow[];
  usersTrend12Months: MonthRow[];
};

function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

const AdminAttentionTrendChart = ({ schoolsTrend12Months, usersTrend12Months }: Props) => {
  const { t } = useTranslation("admin-dashboard");
  const chartId = useId().replace(/:/g, "");
  const fillSchoolsId = `fillSchools-${chartId}`;
  const fillUsersId = `fillUsers-${chartId}`;

  const [timeRange, setTimeRange] = useState<TrendRange>("6");

  const merged = useMemo(() => {
    const userByYm = Object.fromEntries(usersTrend12Months.map((r) => [r.yearMonth, r.count]));
    return schoolsTrend12Months.map((s) => ({
      yearMonth: s.yearMonth,
      schools: s.count,
      users: userByYm[s.yearMonth] ?? 0,
    }));
  }, [schoolsTrend12Months, usersTrend12Months]);

  const chartConfig = {
    schools: {
      label: t("overview.attention.trendChart.seriesSchools"),
      color: "var(--chart-1)",
    },
    users: {
      label: t("overview.attention.trendChart.seriesUsers"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const monthsToShow = timeRange === "3" ? 3 : timeRange === "6" ? 6 : 12;

  const filteredData = useMemo(() => {
    const n = Math.min(monthsToShow, merged.length);
    return n <= 0 ? [] : merged.slice(-n);
  }, [merged, monthsToShow]);

  const formatAxisTick = (ym: string) => {
    const p = parseYearMonth(ym);
    if (!p) return ym;
    const short = t(`overview.chart.monthNamesShort.${p.month}`);
    return `${short} ${p.year}`;
  };

  const formatTooltipLabel = (ym: string) => {
    const p = parseYearMonth(ym);
    if (!p) return ym;
    const full = t(`overview.chart.monthNamesFull.${p.month}`);
    return `${full} ${p.year}`;
  };

  const hasAnyPoint = merged.length > 0;

  if (!hasAnyPoint) {
    return (
      <Card className="pt-0">
        <CardHeader className="border-b py-5">
          <CardTitle>{t("overview.attention.trendChart.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-2 py-8 text-center text-sm text-muted-foreground sm:px-6">
          {t("overview.attention.trendChart.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-4 space-y-0 border-b py-5 sm:flex-row sm:items-center sm:gap-2">
        <div className="grid flex-1 gap-1">
          <CardTitle>{t("overview.attention.trendChart.title")}</CardTitle>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TrendRange)}>
          <SelectTrigger
            className="w-full rounded-lg sm:ml-auto sm:w-[180px]"
            aria-label={t("overview.attention.trendChart.ariaRange")}
          >
            <SelectValue placeholder={t("overview.attention.trendChart.range6")} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="3" className="rounded-lg">
              {t("overview.attention.trendChart.range3")}
            </SelectItem>
            <SelectItem value="6" className="rounded-lg">
              {t("overview.attention.trendChart.range6")}
            </SelectItem>
            <SelectItem value="12" className="rounded-lg">
              {t("overview.attention.trendChart.range12")}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart accessibilityLayer data={filteredData}>
            <defs>
              <linearGradient id={fillSchoolsId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-schools)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-schools)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id={fillUsersId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="yearMonth"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={filteredData.length > 8 ? 8 : 24}
              tickFormatter={formatAxisTick}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatTooltipLabel(String(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="schools"
              type="natural"
              fill={`url(#${fillSchoolsId})`}
              stroke="var(--color-schools)"
            />
            <Area
              dataKey="users"
              type="natural"
              fill={`url(#${fillUsersId})`}
              stroke="var(--color-users)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default AdminAttentionTrendChart;

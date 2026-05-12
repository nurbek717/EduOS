import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

export type AdmissionTimelinePoint = {
  date: string;
  admitted: number;
  departed: number;
};

export type AdmissionsChartTimeRange = "1m" | "3m" | "1y";

/** Grafikda ko‘rinadigan yig‘ma qator (hafta / oy / chorak). */
export type AdmissionsBucketRow = {
  period: string;
  admitted: number;
  departed: number;
};

function filterSeriesByRange(
  series: AdmissionTimelinePoint[],
  timeRange: AdmissionsChartTimeRange,
): AdmissionTimelinePoint[] {
  if (!series.length) return [];
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const endDateStr = sorted[sorted.length - 1]!.date;
  const end = new Date(`${endDateStr}T12:00:00.000Z`);
  const start = new Date(end.getTime());
  if (timeRange === "1m") {
    start.setUTCMonth(start.getUTCMonth() - 1);
  } else if (timeRange === "3m") {
    start.setUTCMonth(start.getUTCMonth() - 3);
  } else {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  }
  const startStr = start.toISOString().slice(0, 10);
  return sorted.filter((r) => r.date >= startStr && r.date <= endDateStr);
}

function sumChunk(rows: AdmissionTimelinePoint[]) {
  return rows.reduce(
    (acc, r) => {
      acc.admitted += r.admitted;
      acc.departed += r.departed;
      return acc;
    },
    { admitted: 0, departed: 0 },
  );
}

function formatWeekRangeLabel(startIso: string, endIso: string, locale: string) {
  const a = new Date(`${startIso}T12:00:00.000Z`);
  const b = new Date(`${endIso}T12:00:00.000Z`);
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${a.toLocaleDateString(locale, { ...o, year: "numeric" })} – ${b.toLocaleDateString(locale, { ...o, year: "numeric" })}`;
  }
  return `${a.toLocaleDateString(locale, o)} – ${b.toLocaleDateString(locale, o)}`;
}

function aggregateToBuckets(
  daily: AdmissionTimelinePoint[],
  timeRange: AdmissionsChartTimeRange,
  locale: string,
  quarterLabel: (year: number, quarter: number) => string,
): AdmissionsBucketRow[] {
  if (!daily.length) return [];

  if (timeRange === "1m") {
    const buckets: AdmissionsBucketRow[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      const { admitted, departed } = sumChunk(chunk);
      const startD = chunk[0]!.date;
      const endD = chunk[chunk.length - 1]!.date;
      buckets.push({
        period: formatWeekRangeLabel(startD, endD, locale),
        admitted,
        departed,
      });
    }
    return buckets;
  }

  if (timeRange === "3m") {
    const map = new Map<string, { admitted: number; departed: number }>();
    for (const row of daily) {
      const key = row.date.slice(0, 7);
      const cur = map.get(key) ?? { admitted: 0, departed: 0 };
      cur.admitted += row.admitted;
      cur.departed += row.departed;
      map.set(key, cur);
    }
    const keys = [...map.keys()].sort();
    return keys.map((key) => {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1, 1));
      const period = d.toLocaleDateString(locale, { month: "short", year: "numeric" });
      const v = map.get(key)!;
      return { period, admitted: v.admitted, departed: v.departed };
    });
  }

  const map = new Map<string, { admitted: number; departed: number; year: number; quarter: number }>();
  for (const row of daily) {
    const d = new Date(`${row.date}T12:00:00.000Z`);
    const year = d.getUTCFullYear();
    const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    const cur = map.get(key) ?? { admitted: 0, departed: 0, year, quarter };
    cur.admitted += row.admitted;
    cur.departed += row.departed;
    map.set(key, cur);
  }
  const keys = [...map.keys()].sort();
  return keys.map((key) => {
    const v = map.get(key)!;
    return {
      period: quarterLabel(v.year, v.quarter),
      admitted: v.admitted,
      departed: v.departed,
    };
  });
}

export type DirectorDashboardAreaChartProps = {
  series: AdmissionTimelinePoint[] | undefined;
};

export function DirectorDashboardAreaChart({ series }: DirectorDashboardAreaChartProps) {
  const { t, i18n } = useTranslation("director-dashboard");
  const [timeRange, setTimeRange] = React.useState<AdmissionsChartTimeRange>("3m");
  const gradientId = React.useId().replace(/:/g, "");

  const chartConfig = React.useMemo(
    () =>
      ({
        admitted: {
          label: t("admissionsChartAdmitted"),
          color: "var(--chart-1)",
        },
        departed: {
          label: t("admissionsChartDeparted"),
          color: "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [t],
  );

  const locale = i18n.language?.startsWith("ru")
    ? "ru-RU"
    : i18n.language?.startsWith("uz")
      ? "uz-UZ"
      : "en-US";

  const quarterLabel = React.useCallback(
    (year: number, quarter: number) => t("admissionsChartQuarterLabel", { year, quarter }),
    [t],
  );

  const filteredDaily = React.useMemo(
    () => filterSeriesByRange(series ?? [], timeRange),
    [series, timeRange],
  );

  const chartData = React.useMemo(
    () => aggregateToBuckets(filteredDaily, timeRange, locale, quarterLabel),
    [filteredDaily, timeRange, locale, quarterLabel],
  );

  const periodTotalAdmitted = React.useMemo(
    () => filteredDaily.reduce((s, r) => s + r.admitted, 0),
    [filteredDaily],
  );

  const periodTotalDeparted = React.useMemo(
    () => filteredDaily.reduce((s, r) => s + r.departed, 0),
    [filteredDaily],
  );

  const hasBackendSeries = Array.isArray(series) && series.length > 0;

  const fillDeparted = `fillDeparted-${gradientId}`;
  const fillAdmitted = `fillAdmitted-${gradientId}`;

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{t("admissionsChartTitle")}</CardTitle>
          <CardDescription>{t(`admissionsChartDescription_${timeRange}`)}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as AdmissionsChartTimeRange)}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label={t("admissionsChartRangeAria")}
          >
            <SelectValue placeholder={t("admissionsChartRange3Months")} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="1m" className="rounded-lg">
              {t("admissionsChartRange1Month")}
            </SelectItem>
            <SelectItem value="3m" className="rounded-lg">
              {t("admissionsChartRange3Months")}
            </SelectItem>
            <SelectItem value="1y" className="rounded-lg">
              {t("admissionsChartRange1Year")}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {!hasBackendSeries ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("admissionsChartNoData")}</p>
        ) : chartData.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("admissionsChartEmpty")}</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={fillAdmitted} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-admitted)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--color-admitted)" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id={fillDeparted} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-departed)" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="var(--color-departed)" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const s = String(value);
                  return s.length > 18 ? `${s.slice(0, 16)}…` : s;
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                tickMargin={4}
                allowDecimals={false}
                className="text-[10px] text-muted-foreground"
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => (typeof value === "string" ? value : String(value ?? ""))}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="admitted"
                type="natural"
                fill={`url(#${fillAdmitted})`}
                stroke="var(--color-admitted)"
                strokeWidth={2}
              />
              <Area
                dataKey="departed"
                type="natural"
                fill={`url(#${fillDeparted})`}
                stroke="var(--color-departed)"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: "var(--color-departed)",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
      {hasBackendSeries && chartData.length > 0 ? (
        <CardFooter className="flex flex-col gap-2 border-t px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="max-w-xl leading-snug">{t("admissionsChartFooterHint")}</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium text-foreground">
            <span>{t("admissionsChartPeriodAdmitted", { count: periodTotalAdmitted })}</span>
            <span>{t("admissionsChartPeriodDeparted", { count: periodTotalDeparted })}</span>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

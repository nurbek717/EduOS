import { useCallback, useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export type AttendanceStatPoint = {
  bucket: string;
  presentLate: number;
  absent: number;
};

type RangeKey = "1d" | "1w" | "1m";

type Props = {
  data: AttendanceStatPoint[];
  bucket: "hour" | "day";
  range: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  loading?: boolean;
  locale: string;
  /** i18n namespace (default: teacher-dashboard) */
  i18nNamespace?: string;
  /** Key prefix before .title, .description, etc. (default: overview.attendanceChart) */
  chartKeyPrefix?: string;
  /** Full i18n key for loading text (default: common.loading) */
  loadingTranslationKey?: string;
};

const TeacherAttendanceOverviewChart = ({
  data,
  bucket,
  range,
  onRangeChange,
  loading,
  locale,
  i18nNamespace = "teacher-dashboard",
  chartKeyPrefix = "overview.attendanceChart",
  loadingTranslationKey = "common.loading",
}: Props) => {
  const { t } = useTranslation(i18nNamespace);
  const k = (suffix: string) => `${chartKeyPrefix}.${suffix}`;
  const chartId = useId().replace(/:/g, "");
  const fillPresentId = `fillPresent-${chartId}`;
  const fillAbsentId = `fillAbsent-${chartId}`;

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        label: row.bucket,
      })),
    [data],
  );

  const chartConfig = {
    presentLate: {
      label: t(k("seriesPresent")),
      color: "var(--chart-1)",
    },
    absent: {
      label: t(k("seriesAbsent")),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const intlLocale = locale.replace(/_/g, "-");

  const formatTick = useCallback(
    (value: string) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;

      if (range === "1d" && bucket === "hour") {
        return new Intl.DateTimeFormat(intlLocale, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d);
      }

      if (range === "1w" && bucket === "day") {
        return new Intl.DateTimeFormat(intlLocale, {
          weekday: "short",
          day: "numeric",
          month: "long",
        }).format(d);
      }

      return new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "long",
      }).format(d);
    },
    [bucket, intlLocale, range],
  );

  const formatTooltipLabel = useCallback(
    (value: string) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;

      if (range === "1d" && bucket === "hour") {
        return new Intl.DateTimeFormat(intlLocale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d);
      }

      if (range === "1w" && bucket === "day") {
        return new Intl.DateTimeFormat(intlLocale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(d);
      }

      return new Intl.DateTimeFormat(intlLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    },
    [bucket, intlLocale, range],
  );

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-4 space-y-0 border-b py-5 sm:flex-row sm:items-center sm:gap-2">
        <div className="grid flex-1 gap-1">
          <CardTitle>{t(k("title"))}</CardTitle>
          <CardDescription>{t(k("description"))}</CardDescription>
        </div>
        <Select value={range} onValueChange={(v) => onRangeChange(v as RangeKey)}>
          <SelectTrigger className="w-full rounded-lg sm:ml-auto sm:w-[160px]" aria-label={t(k("ariaRange"))}>
            <SelectValue placeholder={t(k("range1w"))} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="1d" className="rounded-lg">
              {t(k("range1d"))}
            </SelectItem>
            <SelectItem value="1w" className="rounded-lg">
              {t(k("range1w"))}
            </SelectItem>
            <SelectItem value="1m" className="rounded-lg">
              {t(k("range1m"))}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">{t(loadingTranslationKey)}</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            {t(k("empty"))}
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart accessibilityLayer data={chartData}>
              <defs>
                <linearGradient id={fillPresentId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-presentLate)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-presentLate)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id={fillAbsentId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-absent)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-absent)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={chartData.length > 14 ? 4 : 24}
                tickFormatter={formatTick}
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
                dataKey="absent"
                type="natural"
                fill={`url(#${fillAbsentId})`}
                stroke="var(--color-absent)"
              />
              <Area
                dataKey="presentLate"
                type="natural"
                fill={`url(#${fillPresentId})`}
                stroke="var(--color-presentLate)"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherAttendanceOverviewChart;

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ChartPoint = {
  date: string;
  count: number;
};

type Props = {
  data: ChartPoint[];
  range?: {
    start: string;
    end: string;
  };
  weekOffset: number;
  onChangeWeek: (direction: "prev" | "next") => void;
};

const AdminSchoolsChart = ({ data, range, weekOffset, onChangeWeek }: Props) => {
  const { t } = useTranslation("admin-dashboard");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
        <div>
          <CardTitle>{t("overview.chart.title")}</CardTitle>
          <CardDescription>{t("overview.chart.description")}</CardDescription>
          {range && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("overview.chart.range")}: {range.start.slice(5)} — {range.end.slice(5)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            type="button"
            onClick={() => onChangeWeek("prev")}
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            type="button"
            disabled={weekOffset === 0}
            onClick={() => onChangeWeek("next")}
          >
            ›
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => value.slice(5)}
                fontSize={12}
              />
              <YAxis allowDecimals={false} fontSize={12} />
              <RechartsTooltip
                formatter={(value: number) => [t("overview.chart.tooltipCount", { count: value }), t("overview.chart.tooltipSchools")]}
                labelFormatter={(label) => t("overview.chart.tooltipDate", { date: label })}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("overview.chart.empty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSchoolsChart;

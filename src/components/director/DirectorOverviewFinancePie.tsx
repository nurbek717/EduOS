import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type DirectorOverviewFinancePieProps = {
  monthIncome: number;
  monthExpense: number;
  formatMoney: (value: number) => string;
  title: string;
  description: string;
  incomeLabel: string;
  expenseLabel: string;
  emptyMessage: string;
  netLabel: string;
  footerHint: string;
  onOpenPayments?: () => void;
  className?: string;
};

type PieRow = { type: "income" | "expense"; amount: number; fill: string };

export function DirectorOverviewFinancePie({
  monthIncome,
  monthExpense,
  formatMoney,
  title,
  description,
  incomeLabel,
  expenseLabel,
  emptyMessage,
  netLabel,
  footerHint,
  onOpenPayments,
  className,
}: DirectorOverviewFinancePieProps) {
  const chartConfig = useMemo(
    () =>
      ({
        amount: { label: "Summa" },
        income: { label: incomeLabel, color: "hsl(152 69% 31%)" },
        expense: { label: expenseLabel, color: "hsl(350 80% 52%)" },
      }) satisfies ChartConfig,
    [expenseLabel, incomeLabel],
  );

  const data = useMemo<PieRow[]>(() => {
    const rows: PieRow[] = [];
    if (monthIncome > 0) {
      rows.push({ type: "income", amount: monthIncome, fill: "var(--color-income)" });
    }
    if (monthExpense > 0) {
      rows.push({ type: "expense", amount: monthExpense, fill: "var(--color-expense)" });
    }
    return rows;
  }, [monthExpense, monthIncome]);

  const totalFlow = monthIncome + monthExpense;
  const net = monthIncome - monthExpense;

  return (
    <Card
      className={cn(
        "flex cursor-pointer flex-col bg-card text-card-foreground transition hover:ring-2 hover:ring-primary/30 lg:col-span-4",
        className,
      )}
      onClick={onOpenPayments}
    >
      <CardHeader className="items-start pb-2 text-left">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-left">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pb-2 pt-0">
        {data.length === 0 ? (
          <p className="py-4 text-left text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={cn(
              "mx-auto aspect-square w-full max-h-[250px] justify-center bg-transparent text-foreground",
              "[&_.recharts-responsive-container]:bg-transparent [&_.recharts-wrapper]:bg-transparent",
              "[&_.recharts-surface]:bg-transparent [&_svg]:bg-transparent [&_svg]:text-foreground",
            )}
          >
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }} style={{ backgroundColor: "transparent" }}>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="type"
                    formatter={(value, name) => (
                      <div className="flex w-full min-w-[10rem] items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {name === "income" ? incomeLabel : name === "expense" ? expenseLabel : String(name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatMoney(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie data={data} dataKey="amount" nameKey="type" strokeWidth={0} isAnimationActive />
            </PieChart>
          </ChartContainer>
        )}

        <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 text-left">
              <div className="text-xs text-muted-foreground">{incomeLabel}</div>
              <div className="truncate font-semibold tabular-nums">{formatMoney(monthIncome)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2">
            <TrendingDown className="h-4 w-4 shrink-0 text-rose-600" />
            <div className="min-w-0 text-left">
              <div className="text-xs text-muted-foreground">{expenseLabel}</div>
              <div className="truncate font-semibold tabular-nums">{formatMoney(monthExpense)}</div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 border-t pt-4 text-left text-sm">
        {totalFlow > 0 ? (
          <div
            className={cn(
              "flex items-center gap-2 font-medium",
              net >= 0 ? "text-emerald-700" : "text-rose-700",
            )}
          >
            {net >= 0 ? (
              <TrendingUp className="h-4 w-4 shrink-0" />
            ) : (
              <TrendingDown className="h-4 w-4 shrink-0" />
            )}
            <span>
              {netLabel}: {formatMoney(net)}
            </span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{footerHint}</p>
      </CardFooter>
    </Card>
  );
}

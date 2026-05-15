import { Fragment, useMemo, useRef } from "react";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/context/LanguageContext";

export type StudentPaymentGridMonth = {
  month: number;
  label: string;
  paid: number;
  due: number;
  status: "na" | "future" | "paid" | "partial" | "unpaid";
};

export type StudentPaymentGridRow = {
  id: string;
  name: string;
  className?: string | null;
  monthlyFee: number;
  months: StudentPaymentGridMonth[];
  yearTotalPaid: number;
  yearDebt: number;
};

export type StudentPaymentGrid = {
  year: number;
  monthLabels: string[];
  rows: StudentPaymentGridRow[];
};

type DirectorStudentPaymentGridProps = {
  grid: StudentPaymentGrid | null | undefined;
  loading?: boolean;
  viewYear: number;
  onViewYearChange: (year: number) => void;
  availableYears: number[];
  onExport?: () => void;
  exportDisabled?: boolean;
};

const STUDENT_COL_WIDTH_PX = 208;
const ROW_CLASS = "flex h-11 items-center border-b border-border/80 px-2 text-sm last:border-b-0";
const HEADER_ROW_CLASS = "flex h-10 items-center border-b bg-muted/40 px-2 text-xs font-medium text-muted-foreground";

const cellStatusClass: Record<StudentPaymentGridMonth["status"], string> = {
  na: "bg-muted/40 text-muted-foreground",
  future: "bg-slate-50 text-muted-foreground",
  paid: "bg-emerald-50 text-emerald-800",
  partial: "bg-amber-50 text-amber-900",
  unpaid: "bg-rose-50 text-rose-800",
};

const DirectorStudentPaymentGrid = ({
  grid,
  loading,
  viewYear,
  onViewYearChange,
  availableYears,
  onExport,
  exportDisabled,
}: DirectorStudentPaymentGridProps) => {
  const { t } = useTranslation("director-finance");
  const locale = useAppLocale();
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatMoney = (value: number) =>
    t("moneyFormat", { value: moneyFormatter.format(Math.round(value || 0)) });

  const formatCellAmount = (value: number) => {
    if (!value) return "—";
    if (value >= 1_000_000) {
      const compact = value / 1_000_000;
      const formatted = Number.isInteger(compact) ? String(compact) : compact.toFixed(1);
      return `${formatted}M`;
    }
    if (value >= 1_000) {
      const compact = value / 1_000;
      const formatted = Number.isInteger(compact) ? String(compact) : compact.toFixed(1);
      return `${formatted}K`;
    }
    return moneyFormatter.format(value);
  };

  const formatCompactAmount = (value: number) => {
    if (!value) return "0";
    if (value >= 1_000_000) {
      const compact = value / 1_000_000;
      const formatted = Number.isInteger(compact) ? String(compact) : compact.toFixed(1);
      return `${formatted}M`;
    }
    if (value >= 1_000) {
      const compact = value / 1_000;
      const formatted = Number.isInteger(compact) ? String(compact) : compact.toFixed(1);
      return `${formatted}K`;
    }
    return moneyFormatter.format(value);
  };

  const rows = grid?.rows || [];
  const monthLabels = grid?.monthLabels || [];
  const scrollGridTemplate = `minmax(4rem, 5.5rem) minmax(4rem, 5.5rem) repeat(${monthLabels.length}, minmax(2.75rem, 1fr)) minmax(4.25rem, 5.75rem) minmax(4.25rem, 5.75rem)`;
  const scrollBodyMaxHeight = "calc(min(70vh, 520px) - 2.5rem)";
  const studentScrollRef = useRef<HTMLDivElement>(null);
  const dataScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const syncVerticalScroll = (source: "student" | "data") => {
    if (isSyncingScrollRef.current) return;
    const studentEl = studentScrollRef.current;
    const dataEl = dataScrollRef.current;
    if (!studentEl || !dataEl) return;

    isSyncingScrollRef.current = true;
    if (source === "data") {
      studentEl.scrollTop = dataEl.scrollTop;
    } else {
      dataEl.scrollTop = studentEl.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("yearGrid.title")}</CardTitle>
          <CardDescription>{t("yearGrid.desc")}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onExport}
              disabled={exportDisabled}
              className="gap-2 border-transparent bg-emerald-600 text-[18px] text-white shadow-none hover:bg-emerald-700"
            >
              <Save className="h-6 w-6" />
              {t("exportExcel")}
            </Button>
          )}
          <label htmlFor="finance-grid-year" className="whitespace-nowrap text-sm text-muted-foreground">
            {t("yearGrid.yearLabel")}
          </label>
          <select
            id="finance-grid-year"
            value={viewYear}
            onChange={(e) => onViewYearChange(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="max-w-full overflow-hidden">
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cellStatusClass.paid)} />
            {t("yearGrid.legend.paid")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cellStatusClass.partial)} />
            {t("yearGrid.legend.partial")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cellStatusClass.unpaid)} />
            {t("yearGrid.legend.unpaid")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", cellStatusClass.na)} />
            {t("yearGrid.legend.na")}
          </span>
        </div>

        <div className="w-full max-w-full overflow-hidden rounded-md border bg-background">
          {loading && !grid ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {t("loadingFinanceData")}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {t("yearGrid.empty")}
            </div>
          ) : (
            <div className="flex max-h-[min(70vh,520px)] w-full min-w-0">
              <div
                className="z-10 shrink-0 border-r border-border bg-background shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]"
                style={{ width: STUDENT_COL_WIDTH_PX }}
              >
                <div className={cn(HEADER_ROW_CLASS, "sticky top-0 z-[2] bg-muted/95 backdrop-blur-sm")}>{t("yearGrid.student")}</div>
                <div
                  ref={studentScrollRef}
                  className="overflow-y-auto overflow-x-hidden"
                  style={{ maxHeight: scrollBodyMaxHeight }}
                  onScroll={() => syncVerticalScroll("student")}
                >
                  {rows.map((row) => (
                    <div key={row.id} className={cn(ROW_CLASS, "font-medium text-foreground")} title={row.name}>
                      <span className="truncate">{row.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                ref={dataScrollRef}
                className="min-w-0 flex-1 overflow-auto"
                onScroll={() => syncVerticalScroll("data")}
              >
                <div className="grid w-max min-w-full text-sm" style={{ gridTemplateColumns: scrollGridTemplate }}>
                  <div className={cn(HEADER_ROW_CLASS, "sticky top-0 z-[2] bg-muted/95 backdrop-blur-sm")}>
                    {t("yearGrid.class")}
                  </div>
                  <div className={cn(HEADER_ROW_CLASS, "sticky top-0 z-[2] bg-muted/95 backdrop-blur-sm")}>
                    {t("yearGrid.monthlyFee")}
                  </div>
                  {monthLabels.map((label) => (
                    <div
                      key={label}
                      className={cn(
                        HEADER_ROW_CLASS,
                        "sticky top-0 z-[2] justify-center bg-muted/95 text-center backdrop-blur-sm",
                      )}
                    >
                      {label}
                    </div>
                  ))}
                  <div className={cn(HEADER_ROW_CLASS, "sticky top-0 z-[2] justify-end bg-muted/95 backdrop-blur-sm")}>
                    {t("yearGrid.yearPaid")}
                  </div>
                  <div className={cn(HEADER_ROW_CLASS, "sticky top-0 z-[2] justify-end bg-muted/95 backdrop-blur-sm")}>
                    {t("yearGrid.yearDebt")}
                  </div>

                  {rows.map((row) => (
                    <Fragment key={row.id}>
                      <div className={cn(ROW_CLASS, "text-muted-foreground")}>
                        <span className="truncate">{row.className || "—"}</span>
                      </div>
                      <div className={cn(ROW_CLASS, "whitespace-nowrap tabular-nums")}>
                        {formatCellAmount(row.monthlyFee)}
                      </div>
                      {row.months.map((month) => (
                        <div key={`${row.id}-m-${month.month}`} className={cn(ROW_CLASS, "justify-center p-0")}>
                          <span
                            title={
                              month.paid > 0
                                ? formatMoney(month.paid)
                                : month.status === "unpaid" && month.due > 0
                                  ? t("yearGrid.cellDue", { amount: formatMoney(month.due) })
                                  : undefined
                            }
                            className={cn(
                              "inline-flex min-w-[2.5rem] justify-center rounded px-1 py-0.5 text-xs font-medium",
                              cellStatusClass[month.status],
                            )}
                          >
                            {formatCellAmount(month.paid)}
                          </span>
                        </div>
                      ))}
                      <div className={cn(ROW_CLASS, "justify-end px-1 font-medium tabular-nums whitespace-nowrap")}>
                        {formatCompactAmount(row.yearTotalPaid)}
                      </div>
                      <div className={cn(ROW_CLASS, "justify-end")}>
                        <Badge
                          variant={row.yearDebt > 0 ? "destructive" : "secondary"}
                          className="max-w-full truncate whitespace-nowrap px-2 font-normal"
                        >
                          {formatCompactAmount(row.yearDebt)}
                        </Badge>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default DirectorStudentPaymentGrid;

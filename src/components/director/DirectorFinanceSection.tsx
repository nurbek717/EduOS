import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BadgeDollarSign, CreditCard, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DirectorStudentPaymentGrid, { type StudentPaymentGrid } from "@/components/director/DirectorStudentPaymentGrid";
import { useToast } from "@/hooks/use-toast";
import { useAppLocale } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TABLE_PAGE_SIZE = 5;

type FinanceSummary = {
  monthIncome: number;
  monthExpense: number;
  yearIncome: number;
  yearExpense: number;
  studentPaidThisMonth: number;
  studentPaidThisYear: number;
  totalStudentDebt: number;
  salaryPaidThisMonth: number;
  salaryPendingThisMonth: number;
};

type FinanceChartPoint = {
  label: string;
  income: number;
  expense: number;
};

type StudentBalance = {
  id: string;
  userId?: string | null;
  name: string;
  email?: string;
  className?: string | null;
  monthlyFee: number;
  paidThisMonth: number;
  paidThisYear: number;
  yearDebt: number;
};

type StaffBalance = {
  userId: string;
  name: string;
  email: string;
  role: "director" | "school_admin" | "teacher";
  subjectName?: string | null;
  monthlySalary: number;
  paidThisMonth: number;
  paidThisYear: number;
  remainingThisMonth: number;
};

type RecentTransaction = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description?: string | null;
  occurredAt: string;
  billingMonth?: string | null;
  studentName?: string | null;
  staffName?: string | null;
};

type FinanceOverviewResponse = {
  summary: FinanceSummary;
  charts: {
    monthly: FinanceChartPoint[];
    yearly: FinanceChartPoint[];
  };
  studentBalances: StudentBalance[];
  staffBalances: StaffBalance[];
  recentTransactions: RecentTransaction[];
  categories: {
    income: string[];
    expense: string[];
  };
  currentYear: number;
  studentPaymentGrid?: StudentPaymentGrid;
};

const roleLabelKeys: Record<StaffBalance["role"], string> = {
  director: "roles.director",
  school_admin: "roles.schoolAdmin",
  teacher: "roles.teacher",
};

const categoryLabelKeys: Record<string, string> = {
  student_fee: "categories.student_fee",
  salary: "categories.salary",
  donation: "categories.donation",
  grant: "categories.grant",
  other_income: "categories.other_income",
  utilities: "categories.utilities",
  maintenance: "categories.maintenance",
  supplies: "categories.supplies",
  tax: "categories.tax",
  bonus: "categories.bonus",
  other_expense: "categories.other_expense",
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getCurrentBillingMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatBillingMonthLabel = (billingMonth: string, locale: string) => {
  const [year, month] = billingMonth.split("-").map(Number);
  if (!year || !month) return billingMonth;
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
};

type DirectorFinanceSectionProps = {
  onDataChanged?: () => Promise<void> | void;
};

const DirectorFinanceSection = ({ onDataChanged }: DirectorFinanceSectionProps) => {
  const { t } = useTranslation("director-finance");
  const { toast } = useToast();
  const locale = useAppLocale();
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatMoney = (value: number) => t("moneyFormat", { value: moneyFormatter.format(Math.round(value || 0)) });
  const roleLabels = useMemo(
    () => ({
      director: t(roleLabelKeys.director),
      school_admin: t(roleLabelKeys.school_admin),
      teacher: t(roleLabelKeys.teacher),
    }),
    [t],
  );
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const isSchoolAdmin = currentUser?.role === "school_admin";
  const canManageFinance = isSchoolAdmin;

  const [loading, setLoading] = useState(false);
  const [finance, setFinance] = useState<FinanceOverviewResponse | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [transactionCategory, setTransactionCategory] = useState("donation");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(getToday());
  const [transactionDescription, setTransactionDescription] = useState("");

  const [studentPaymentStudentId, setStudentPaymentStudentId] = useState("");
  const [studentPaymentAmount, setStudentPaymentAmount] = useState("");
  const [studentPaymentBillingMonth, setStudentPaymentBillingMonth] = useState(getCurrentBillingMonth);
  const [studentPaymentDate, setStudentPaymentDate] = useState(getToday());
  const [studentPaymentDescription, setStudentPaymentDescription] = useState("");

  const [salaryPaymentStaffId, setSalaryPaymentStaffId] = useState("");
  const [salaryPaymentAmount, setSalaryPaymentAmount] = useState("");
  const [salaryPaymentBillingMonth, setSalaryPaymentBillingMonth] = useState(getCurrentBillingMonth);
  const [salaryPaymentDate, setSalaryPaymentDate] = useState(getToday());
  const [salaryPaymentDescription, setSalaryPaymentDescription] = useState("");

  const [studentFeeDrafts, setStudentFeeDrafts] = useState<Record<string, string>>({});
  const [staffSalaryDrafts, setStaffSalaryDrafts] = useState<Record<string, string>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<null | "transaction" | "studentPayment" | "salaryPayment">(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [studentBalancesPage, setStudentBalancesPage] = useState(1);
  const [staffBalancesPage, setStaffBalancesPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);

  const availableCategories = useMemo(
    () => finance?.categories?.[transactionType] || (transactionType === "income" ? ["donation"] : ["utilities"]),
    [finance, transactionType],
  );

  const studentBalances = useMemo(() => finance?.studentBalances || [], [finance?.studentBalances]);
  const staffBalances = useMemo(() => finance?.staffBalances || [], [finance?.staffBalances]);
  const recentTransactions = useMemo(() => finance?.recentTransactions || [], [finance?.recentTransactions]);

  const studentBalancesTotalPages = Math.max(1, Math.ceil(studentBalances.length / TABLE_PAGE_SIZE));
  const staffBalancesTotalPages = Math.max(1, Math.ceil(staffBalances.length / TABLE_PAGE_SIZE));
  const transactionsTotalPages = Math.max(1, Math.ceil(recentTransactions.length / TABLE_PAGE_SIZE));

  const safeStudentBalancesPage = Math.min(studentBalancesPage, studentBalancesTotalPages);
  const safeStaffBalancesPage = Math.min(staffBalancesPage, staffBalancesTotalPages);
  const safeTransactionsPage = Math.min(transactionsPage, transactionsTotalPages);

  const studentBalancesStart = studentBalances.length === 0 ? 0 : (safeStudentBalancesPage - 1) * TABLE_PAGE_SIZE;
  const staffBalancesStart = staffBalances.length === 0 ? 0 : (safeStaffBalancesPage - 1) * TABLE_PAGE_SIZE;
  const transactionsStart = recentTransactions.length === 0 ? 0 : (safeTransactionsPage - 1) * TABLE_PAGE_SIZE;

  const studentBalancesEnd = Math.min(studentBalancesStart + TABLE_PAGE_SIZE, studentBalances.length);
  const staffBalancesEnd = Math.min(staffBalancesStart + TABLE_PAGE_SIZE, staffBalances.length);
  const transactionsEnd = Math.min(transactionsStart + TABLE_PAGE_SIZE, recentTransactions.length);

  const pagedStudentBalances = useMemo(
    () => studentBalances.slice(studentBalancesStart, studentBalancesEnd),
    [studentBalances, studentBalancesStart, studentBalancesEnd],
  );
  const pagedStaffBalances = useMemo(
    () => staffBalances.slice(staffBalancesStart, staffBalancesEnd),
    [staffBalances, staffBalancesStart, staffBalancesEnd],
  );
  const pagedTransactions = useMemo(
    () => recentTransactions.slice(transactionsStart, transactionsEnd),
    [recentTransactions, transactionsStart, transactionsEnd],
  );

  useEffect(() => {
    setStudentBalancesPage(1);
    setStaffBalancesPage(1);
    setTransactionsPage(1);
  }, [finance?.studentBalances?.length, finance?.staffBalances?.length, finance?.recentTransactions?.length]);

  const fetchFinanceOverview = async (year = viewYear) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/overview?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.financeLoad"));
      }
      setFinance(data);
      setStudentFeeDrafts(
        Object.fromEntries(data.studentBalances.map((student: StudentBalance) => [student.id, String(student.monthlyFee || 0)])),
      );
      setStaffSalaryDrafts(
        Object.fromEntries(data.staffBalances.map((staff: StaffBalance) => [staff.userId, String(staff.monthlySalary || 0)])),
      );
      if (!studentPaymentStudentId && data.studentBalances.length > 0) {
        setStudentPaymentStudentId(data.studentBalances[0].id);
      }
      if (!salaryPaymentStaffId && data.staffBalances.length > 0) {
        setSalaryPaymentStaffId(data.staffBalances[0].userId);
      }
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.financeLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceOverview(viewYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear]);

  useEffect(() => {
    if (availableCategories.length === 0) return;
    if (!availableCategories.includes(transactionCategory)) {
      setTransactionCategory(availableCategories[0]);
    }
  }, [availableCategories, transactionCategory]);

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting("transaction");
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: transactionType,
          category: transactionCategory,
          amount: Number(transactionAmount),
          occurredAt: transactionDate,
          description: transactionDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.transactionSave"));
      }

      setTransactionAmount("");
      setTransactionDescription("");
      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("savedTitle"), description: t("messages.transactionAdded") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.transactionSaveDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleStudentPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting("studentPayment");
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/student-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: studentPaymentStudentId,
          amount: Number(studentPaymentAmount),
          billingMonth: studentPaymentBillingMonth,
          occurredAt: studentPaymentDate,
          description: studentPaymentDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.studentPaymentSave"));
      }

      setStudentPaymentAmount("");
      setStudentPaymentDescription("");
      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("savedTitle"), description: t("messages.studentPaymentAdded") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.studentPaymentSaveDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleSalaryPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting("salaryPayment");
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/salary-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          staffUserId: salaryPaymentStaffId,
          amount: Number(salaryPaymentAmount),
          billingMonth: salaryPaymentBillingMonth,
          occurredAt: salaryPaymentDate,
          description: salaryPaymentDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.salaryPaymentSave"));
      }

      setSalaryPaymentAmount("");
      setSalaryPaymentDescription("");
      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("savedTitle"), description: t("messages.salaryPaymentAdded") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.salaryPaymentSaveDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const saveStudentMonthlyFee = async (studentId: string) => {
    if (!token) return;

    setSavingStudentId(studentId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/students/${studentId}/monthly-fee`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthlyFee: Number(studentFeeDrafts[studentId] || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.studentFeeUpdate"));
      }

      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("updatedTitle"), description: t("messages.studentFeeUpdated") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.studentFeeUpdateDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  const saveStaffMonthlySalary = async (staffUserId: string) => {
    if (!token) return;

    setSavingStaffId(staffUserId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/staff/${staffUserId}/monthly-salary`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthlySalary: Number(staffSalaryDrafts[staffUserId] || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.staffSalaryUpdate"));
      }

      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("updatedTitle"), description: t("messages.staffSalaryUpdated") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.staffSalaryUpdateDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingStaffId(null);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!token) return;

    setDeletingTransactionId(transactionId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/finance/transactions/${transactionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.transactionDelete"));
      }

      await fetchFinanceOverview();
      await onDataChanged?.();
      toast({ title: t("deletedTitle"), description: t("messages.transactionDeleted") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.transactionDeleteDesc"),
        variant: "destructive",
      });
    } finally {
      setDeletingTransactionId(null);
    }
  };

  const stats = finance?.summary;

  const handleExportExcel = () => {
    if (!finance || !stats) {
      toast({ title: t("errorTitle"), description: t("errors.financeLoad"), variant: "destructive" });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const nowLabel = new Date().toLocaleString(locale);
      const exportFilename = `finance-${viewYear}.xlsx`;

      const addSheet = (name: string, rows: Array<Array<string | number>>) => {
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      };

      const categoryLabel = (category?: string | null) => {
        if (!category) return t("categories.other");
        return t(categoryLabelKeys[category] || "categories.other");
      };

      const buildTransactionRows = (items: RecentTransaction[]) => {
        const rows: Array<Array<string | number>> = [
          [
            t("transactions.date"),
            t("transactions.billingMonth"),
            t("transactions.category"),
            t("transactions.subject"),
            t("transactions.note"),
            t("transactions.amount"),
          ],
        ];

        items.forEach((item) => {
          rows.push([
            item.occurredAt,
            item.billingMonth || "",
            categoryLabel(item.category),
            item.studentName || item.staffName || t("transactions.general"),
            item.description || "",
            item.amount,
          ]);
        });

        if (items.length > 0) {
          const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
          rows.push([]);
          rows.push([t("export.total"), "", "", "", "", total]);
        }

        return rows;
      };

      addSheet(t("export.sheets.summary"), [
        [t("export.generatedAt"), nowLabel],
        [t("yearGrid.yearLabel"), viewYear],
        [t("cards.monthIncome"), stats.monthIncome],
        [t("cards.monthExpense"), stats.monthExpense],
        [t("cards.yearIncome"), stats.yearIncome],
        [t("cards.yearExpense"), stats.yearExpense],
        [t("cards.studentDebt"), stats.totalStudentDebt],
        [t("cards.salaryPending"), stats.salaryPendingThisMonth],
      ]);

      const incomeTransactions = recentTransactions.filter((item) => item.type === "income");
      const expenseTransactions = recentTransactions.filter((item) => item.type === "expense");
      const studentTransactions = recentTransactions.filter((item) => item.category === "student_fee");
      const staffTransactions = recentTransactions.filter((item) => item.category === "salary");
      const otherTransactions = recentTransactions.filter(
        (item) => item.category !== "student_fee" && item.category !== "salary",
      );

      addSheet(t("export.sheets.income"), buildTransactionRows(incomeTransactions));
      addSheet(t("export.sheets.expense"), buildTransactionRows(expenseTransactions));
      addSheet(t("export.sheets.studentPayments"), buildTransactionRows(studentTransactions));
      addSheet(t("export.sheets.staffPayments"), buildTransactionRows(staffTransactions));
      addSheet(t("export.sheets.otherTransactions"), buildTransactionRows(otherTransactions));

      addSheet(t("export.sheets.studentBalances"), [
        [
          t("studentTable.student"),
          t("studentTable.class"),
          t("studentTable.monthlyFee"),
          t("studentTable.paidMonth"),
          t("studentTable.paidYear"),
          t("studentTable.debt"),
        ],
        ...studentBalances.map((student) => [
          student.name,
          student.className || "",
          student.monthlyFee,
          student.paidThisMonth,
          student.paidThisYear,
          student.yearDebt,
        ]),
      ]);

      addSheet(t("export.sheets.staffBalances"), [
        [
          t("staffTable.staff"),
          t("staffTable.role"),
          t("staffTable.monthlySalary"),
          t("staffTable.paidMonth"),
          t("staffTable.paidYear"),
          t("staffTable.remaining"),
        ],
        ...staffBalances.map((staff) => [
          staff.name,
          roleLabels[staff.role],
          staff.monthlySalary,
          staff.paidThisMonth,
          staff.paidThisYear,
          staff.remainingThisMonth,
        ]),
      ]);

      if (finance.studentPaymentGrid) {
        const grid = finance.studentPaymentGrid;
        addSheet(t("export.sheets.yearGrid"), [
          [
            t("yearGrid.student"),
            t("yearGrid.class"),
            t("yearGrid.monthlyFee"),
            ...grid.monthLabels,
            t("yearGrid.yearPaid"),
            t("yearGrid.yearDebt"),
          ],
          ...grid.rows.map((row) => [
            row.name,
            row.className || "",
            row.monthlyFee,
            ...row.months.map((month) => month.paid),
            row.yearTotalPaid,
            row.yearDebt,
          ]),
        ]);
      }

      addSheet(t("export.sheets.chartsMonthly"), [
        [t("charts.monthlyTitle")],
        ["", ""],
        [t("transactions.billingMonth"), t("income"), t("expense")],
        ...((finance.charts?.monthly || []).map((point) => [point.label, point.income, point.expense])),
      ]);

      addSheet(t("export.sheets.chartsYearly"), [
        [t("charts.yearlyTitle")],
        ["", ""],
        [t("yearGrid.yearLabel"), t("income"), t("expense")],
        ...((finance.charts?.yearly || []).map((point) => [point.label, point.income, point.expense])),
      ]);

      XLSX.writeFile(workbook, exportFilename);
      toast({ title: t("savedTitle"), description: t("messages.exported") });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.exportFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {canManageFinance
              ? t("subtitleManage")
              : t("subtitleView")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.monthIncome")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.monthIncome || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.monthExpense")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.monthExpense || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.yearIncome")}</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.yearIncome || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.yearExpense")}</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.yearExpense || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.studentDebt")}</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.totalStudentDebt || 0)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("cards.studentDebtDesc")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("cards.salaryPending")}</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats?.salaryPendingThisMonth || 0)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("cards.salaryPendingDesc")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("charts.monthlyTitle")}</CardTitle>
            <CardDescription>{t("charts.monthlyDesc", { year: finance?.currentYear || new Date().getFullYear() })}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance?.charts.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip formatter={(value: number) => formatMoney(value)} />
                <Bar dataKey="income" name={t("income")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t("expense")} fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("charts.yearlyTitle")}</CardTitle>
            <CardDescription>{t("charts.yearlyDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finance?.charts.yearly || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <RechartsTooltip formatter={(value: number) => formatMoney(value)} />
                <Bar dataKey="income" name={t("income")} fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t("expense")} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <DirectorStudentPaymentGrid
        grid={finance?.studentPaymentGrid}
        loading={loading}
        viewYear={viewYear}
        onViewYearChange={setViewYear}
        availableYears={availableYears}
        onExport={handleExportExcel}
        exportDisabled={loading || !finance}
      />

      {canManageFinance && (
        <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("forms.transaction.title")}</CardTitle>
            <CardDescription>{t("forms.transaction.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTransaction} className="space-y-3">
              <div className="space-y-2">
                <Label>{t("forms.type")}</Label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as "income" | "expense")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="income">{t("income")}</option>
                  <option value="expense">{t("expense")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("forms.category")}</Label>
                <select
                  value={transactionCategory}
                  onChange={(e) => setTransactionCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {t(categoryLabelKeys[category] || "categories.other")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("forms.amount")}</Label>
                <Input type="number" min="0" step="1000" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.date")}</Label>
                <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.note")}</Label>
                <Input value={transactionDescription} onChange={(e) => setTransactionDescription(e.target.value)} placeholder={t("forms.transactionNoteExample")} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting === "transaction"}>
                {submitting === "transaction" ? t("saving") : t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("forms.studentPayment.title")}</CardTitle>
            <CardDescription>{t("forms.studentPayment.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStudentPayment} className="space-y-3">
              <div className="space-y-2">
                <Label>{t("forms.student")}</Label>
                <select
                  value={studentPaymentStudentId}
                  onChange={(e) => setStudentPaymentStudentId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  {finance?.studentBalances.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} {student.className ? `- ${student.className}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("forms.amount")}</Label>
                <Input type="number" min="0" step="1000" value={studentPaymentAmount} onChange={(e) => setStudentPaymentAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.billingMonth")}</Label>
                <Input
                  type="month"
                  value={studentPaymentBillingMonth}
                  onChange={(e) => setStudentPaymentBillingMonth(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.paymentDate")}</Label>
                <Input type="date" value={studentPaymentDate} onChange={(e) => setStudentPaymentDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.note")}</Label>
                <Input value={studentPaymentDescription} onChange={(e) => setStudentPaymentDescription(e.target.value)} placeholder={t("forms.studentPaymentNoteExample")} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting === "studentPayment"}>
                {submitting === "studentPayment" ? t("saving") : t("forms.studentPayment.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("forms.salaryPayment.title")}</CardTitle>
            <CardDescription>{t("forms.salaryPayment.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalaryPayment} className="space-y-3">
              <div className="space-y-2">
                <Label>{t("forms.staff")}</Label>
                <select
                  value={salaryPaymentStaffId}
                  onChange={(e) => setSalaryPaymentStaffId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  {finance?.staffBalances.map((staff) => (
                    <option key={staff.userId} value={staff.userId}>
                      {staff.name} - {roleLabels[staff.role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("forms.amount")}</Label>
                <Input type="number" min="0" step="1000" value={salaryPaymentAmount} onChange={(e) => setSalaryPaymentAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.billingMonth")}</Label>
                <Input
                  type="month"
                  value={salaryPaymentBillingMonth}
                  onChange={(e) => setSalaryPaymentBillingMonth(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.paymentDate")}</Label>
                <Input type="date" value={salaryPaymentDate} onChange={(e) => setSalaryPaymentDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("forms.note")}</Label>
                <Input value={salaryPaymentDescription} onChange={(e) => setSalaryPaymentDescription(e.target.value)} placeholder={t("forms.salaryPaymentNoteExample")} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting === "salaryPayment"}>
                {submitting === "salaryPayment" ? t("saving") : t("forms.salaryPayment.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("studentTable.title")}</CardTitle>
          <CardDescription>
            {canManageFinance
              ? t("studentTable.descManage")
              : t("studentTable.descView")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("studentTable.student")}</TableHead>
                <TableHead>{t("studentTable.class")}</TableHead>
                <TableHead>{t("studentTable.monthlyFee")}</TableHead>
                <TableHead>{t("studentTable.paidMonth")}</TableHead>
                <TableHead>{t("studentTable.paidYear")}</TableHead>
                <TableHead>{t("studentTable.debt")}</TableHead>
                {canManageFinance && <TableHead className="w-[220px]">{t("update")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !finance ? (
                <TableRow>
                  <TableCell colSpan={canManageFinance ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">
                    {t("loadingFinanceData")}
                  </TableCell>
                </TableRow>
              ) : finance && finance.studentBalances.length > 0 ? (
                pagedStudentBalances.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.email || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{student.className || "—"}</TableCell>
                    <TableCell>{formatMoney(student.monthlyFee)}</TableCell>
                    <TableCell>{formatMoney(student.paidThisMonth)}</TableCell>
                    <TableCell>{formatMoney(student.paidThisYear)}</TableCell>
                    <TableCell>
                      <Badge variant={student.yearDebt > 0 ? "destructive" : "secondary"}>
                        {formatMoney(student.yearDebt)}
                      </Badge>
                    </TableCell>
                    {canManageFinance && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            value={studentFeeDrafts[student.id] ?? ""}
                            onChange={(e) => setStudentFeeDrafts((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveStudentMonthlyFee(student.id)}
                            disabled={savingStudentId === student.id}
                          >
                            {savingStudentId === student.id ? "..." : t("save")}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageFinance ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">
                    {t("studentTable.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!loading && studentBalances.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {studentBalancesStart + 1} - {studentBalancesEnd} / Jami: {studentBalances.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setStudentBalancesPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeStudentBalancesPage <= 1}
                >
                  ‹
                </Button>
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                  {safeStudentBalancesPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setStudentBalancesPage((prev) => Math.min(studentBalancesTotalPages, prev + 1))}
                  disabled={safeStudentBalancesPage >= studentBalancesTotalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("staffTable.title")}</CardTitle>
          <CardDescription>
            {canManageFinance
              ? t("staffTable.descManage")
              : t("staffTable.descView")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("staffTable.staff")}</TableHead>
                <TableHead>{t("staffTable.role")}</TableHead>
                <TableHead>{t("staffTable.monthlySalary")}</TableHead>
                <TableHead>{t("staffTable.paidMonth")}</TableHead>
                <TableHead>{t("staffTable.paidYear")}</TableHead>
                <TableHead>{t("staffTable.remaining")}</TableHead>
                {canManageFinance && <TableHead className="w-[220px]">{t("update")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !finance ? (
                <TableRow>
                  <TableCell colSpan={canManageFinance ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">
                    {t("loadingStaffData")}
                  </TableCell>
                </TableRow>
              ) : finance && finance.staffBalances.length > 0 ? (
                pagedStaffBalances.map((staff) => (
                  <TableRow key={staff.userId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{staff.name}</div>
                        <div className="text-xs text-muted-foreground">{staff.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{roleLabels[staff.role]}</div>
                        {staff.subjectName && <div className="text-xs text-muted-foreground">{staff.subjectName}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(staff.monthlySalary)}</TableCell>
                    <TableCell>{formatMoney(staff.paidThisMonth)}</TableCell>
                    <TableCell>{formatMoney(staff.paidThisYear)}</TableCell>
                    <TableCell>
                      <Badge variant={staff.remainingThisMonth > 0 ? "destructive" : "secondary"}>
                        {formatMoney(staff.remainingThisMonth)}
                      </Badge>
                    </TableCell>
                    {canManageFinance && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="1000"
                            value={staffSalaryDrafts[staff.userId] ?? ""}
                            onChange={(e) => setStaffSalaryDrafts((prev) => ({ ...prev, [staff.userId]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveStaffMonthlySalary(staff.userId)}
                            disabled={savingStaffId === staff.userId}
                          >
                            {savingStaffId === staff.userId ? "..." : t("save")}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageFinance ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">
                    {t("staffTable.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!loading && staffBalances.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {staffBalancesStart + 1} - {staffBalancesEnd} / Jami: {staffBalances.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setStaffBalancesPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeStaffBalancesPage <= 1}
                >
                  ‹
                </Button>
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                  {safeStaffBalancesPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setStaffBalancesPage((prev) => Math.min(staffBalancesTotalPages, prev + 1))}
                  disabled={safeStaffBalancesPage >= staffBalancesTotalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.title")}</CardTitle>
          <CardDescription>
            {canManageFinance
              ? t("transactions.descManage")
              : t("transactions.descView")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("transactions.date")}</TableHead>
                <TableHead>{t("transactions.billingMonth")}</TableHead>
                <TableHead>{t("transactions.type")}</TableHead>
                <TableHead>{t("transactions.category")}</TableHead>
                <TableHead>{t("transactions.note")}</TableHead>
                <TableHead>{t("transactions.subject")}</TableHead>
                <TableHead>{t("transactions.amount")}</TableHead>
                {canManageFinance && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {finance && finance.recentTransactions.length > 0 ? (
                pagedTransactions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.occurredAt).toLocaleDateString(locale)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.billingMonth
                        ? formatBillingMonthLabel(item.billingMonth, locale)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.type === "income" ? "secondary" : "destructive"}>
                        {item.type === "income" ? t("income") : t("expense")}
                      </Badge>
                    </TableCell>
                    <TableCell>{t(categoryLabelKeys[item.category] || "categories.other")}</TableCell>
                    <TableCell>{item.description || "—"}</TableCell>
                    <TableCell>{item.studentName || item.staffName || t("transactions.general")}</TableCell>
                    <TableCell className="font-medium">{formatMoney(item.amount)}</TableCell>
                    {canManageFinance && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={deletingTransactionId === item.id}
                          onClick={() => handleDeleteTransaction(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManageFinance ? 8 : 7} className="h-24 text-center text-sm text-muted-foreground">
                    {t("transactions.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {recentTransactions.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {transactionsStart + 1} - {transactionsEnd} / Jami: {recentTransactions.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeTransactionsPage <= 1}
                >
                  ‹
                </Button>
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                  {safeTransactionsPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setTransactionsPage((prev) => Math.min(transactionsTotalPages, prev + 1))}
                  disabled={safeTransactionsPage >= transactionsTotalPages}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectorFinanceSection;

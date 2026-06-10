import { useCallback, useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell,
} from "recharts";
import {
  ArrowLeft, Users, GraduationCap, BookOpen, Wallet, TrendingUp, TrendingDown,
  Activity, AlertTriangle, Info, Sparkles, Lock, BarChart3, ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { hasPlanFeature, type SchoolPlanContext } from "@/lib/school-plan-features";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

type OverviewKPIs = {
  totalStudents: number; activeStudents: number; totalTeachers: number;
  totalGroups: number; monthlyAttendancePercent: number; monthlyRevenue: number;
  newStudentsThisMonth: number;
};
type ChartPoint = { month: string; count?: number; amount?: number; percent?: number };
type OverviewData = { kpis: OverviewKPIs; charts: { studentGrowth: ChartPoint[]; revenueGrowth: ChartPoint[]; attendanceTrend: ChartPoint[] } };

type FinanceData = {
  revenue: { daily: number; weekly: number; monthly: number; annual: number };
  payments: { paidStudents: number; debtors: number; debtAmount: number };
  courseRevenue: { courseName: string; amount: number }[];
  topCourse: { courseName: string; amount: number } | null;
};

type StudentData = {
  stats: { total: number; active: number; new: number; graduated: number; dropped: number };
  attendance: { averagePercent: number; topGroups: { className: string; percent: number }[]; lowestGroups: { className: string; percent: number }[] };
  ageDistribution: { age: string; count: number }[];
  growthTrend: ChartPoint[];
};

type TeacherData = {
  stats: { total: number; active: number };
  workload: { teacherName: string; groupCount: number; studentCount: number; subject: string | null }[];
  topTeachers: { teacherName: string; groupCount: number; studentCount: number; subject: string | null }[];
  performanceSummary: { averageRating: number; totalGroups: number };
};

type PremiumInsights = { insights: string[] };
type PremiumForecast = { expectedNewStudents: number; expectedRevenue: number; expectedAttendancePercent: number };
type PremiumAlert = { type: "warning" | "danger" | "success"; message: string; metric: string; value: number };
type PremiumAlerts = { alerts: PremiumAlert[] };

type BranchDashboardTab = "overview" | "finance" | "students" | "teachers" | "premium";

type Props = {
  branchId: string;
  branchName: string;
  schoolPlan: SchoolPlanContext;
  onBack: () => void;
};

const KPI_CARD_CLASS = "rounded-xl border bg-card p-4 text-card-foreground shadow-sm";
const KPI_VALUE_CLASS = "text-2xl font-bold tracking-tight";
const KPI_LABEL_CLASS = "text-xs text-muted-foreground mt-1";

function KpiCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color?: string }) {
  return (
    <div className={KPI_CARD_CLASS}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color || "bg-primary/10"}`}>{icon}</div>
        <div>
          <p className={KPI_VALUE_CLASS}>{value}</p>
          <p className={KPI_LABEL_CLASS}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{children}</h3>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function PremiumLocked({ planName }: { planName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Sparkles className="h-12 w-12 text-muted-foreground/40" />
      </div>
      <h2 className="text-2xl font-bold mb-2">⭐ Premium Analytics</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Kengaytirilgan AI tahlil, prognozlar va smart ogohlantirishlarni olish uchun Premium tarifiga o'ting.
      </p>
      <Badge variant="outline" className="text-sm px-4 py-2 border-primary/30">
        <Lock className="h-4 w-4 mr-2" /> Premium tarifda mavjud
      </Badge>
    </div>
  );
}

export default function BranchDashboard({ branchId, branchName, schoolPlan, onBack }: Props) {
  const [tab, setTab] = useState<BranchDashboardTab>("overview");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [students, setStudents] = useState<StudentData | null>(null);
  const [teachers, setTeachers] = useState<TeacherData | null>(null);
  const [insights, setInsights] = useState<PremiumInsights | null>(null);
  const [forecast, setForecast] = useState<PremiumForecast | null>(null);
  const [alerts, setAlerts] = useState<PremiumAlerts | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchJson = useCallback(async (path: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("No auth token");
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Ma'lumot yuklanmadi");
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (tab === "overview") {
          const data = await fetchJson(`/api/director/branches/${branchId}/dashboard/overview`);
          if (!cancelled) setOverview(data);
        } else if (tab === "finance") {
          const data = await fetchJson(`/api/director/branches/${branchId}/dashboard/finance`);
          if (!cancelled) setFinance(data);
        } else if (tab === "students") {
          const data = await fetchJson(`/api/director/branches/${branchId}/dashboard/students`);
          if (!cancelled) setStudents(data);
        } else if (tab === "teachers") {
          const data = await fetchJson(`/api/director/branches/${branchId}/dashboard/teachers`);
          if (!cancelled) setTeachers(data);
        } else if (tab === "premium" && hasPlanFeature(schoolPlan, "ai")) {
          const [ins, fc, al] = await Promise.all([
            fetchJson(`/api/director/branches/${branchId}/dashboard/premium/insights`),
            fetchJson(`/api/director/branches/${branchId}/dashboard/premium/forecast`),
            fetchJson(`/api/director/branches/${branchId}/dashboard/premium/alerts`),
          ]);
          if (!cancelled) { setInsights(ins); setForecast(fc); setAlerts(al); }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tab, branchId, fetchJson, schoolPlan]);

  const tabs: { key: BranchDashboardTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "finance", label: "Finance" },
    { key: "students", label: "Students" },
    { key: "teachers", label: "Teachers" },
    { key: "premium", label: "Premium Analytics" },
  ];

  const isPremium = hasPlanFeature(schoolPlan, "ai");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{branchName}</h2>
          <p className="text-sm text-muted-foreground">Filial boshqaruv paneli</p>
        </div>
        {isPremium && (
          <Badge variant="outline" className="ml-auto border-purple-400 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-3 w-3 mr-1" /> Premium
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.key === "premium" && <Sparkles className="h-3 w-3 inline mr-1 text-purple-500" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        loading ? <LoadingSkeleton /> : !overview ? (
          <p className="text-center text-muted-foreground py-10">Ma'lumot yuklanmadi</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <KpiCard icon={<Users className="h-5 w-5 text-blue-600" />} value={String(overview.kpis.totalStudents)} label="Jami o'quvchilar" color="bg-blue-100" />
              <KpiCard icon={<Activity className="h-5 w-5 text-emerald-600" />} value={String(overview.kpis.activeStudents)} label="Faol o'quvchilar" color="bg-emerald-100" />
              <KpiCard icon={<GraduationCap className="h-5 w-5 text-purple-600" />} value={String(overview.kpis.totalTeachers)} label="O'qituvchilar" color="bg-purple-100" />
              <KpiCard icon={<BookOpen className="h-5 w-5 text-orange-600" />} value={String(overview.kpis.totalGroups)} label="Guruhlar" color="bg-orange-100" />
              <KpiCard icon={<Activity className="h-5 w-5 text-cyan-600" />} value={`${overview.kpis.monthlyAttendancePercent}%`} label="O'rtacha davomat" color="bg-cyan-100" />
              <KpiCard icon={<Wallet className="h-5 w-5 text-green-600" />} value={`${overview.kpis.monthlyRevenue.toLocaleString()} so'm`} label="Oylik tushum" color="bg-green-100" />
              <KpiCard icon={<TrendingUp className="h-5 w-5 text-indigo-600" />} value={String(overview.kpis.newStudentsThisMonth)} label="Yangi o'quvchilar (oy)" color="bg-indigo-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">O'quvchilar o'sishi</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52">
                    <ResponsiveContainer><AreaChart data={overview.charts.studentGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                    </AreaChart></ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Daromad trendi</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52">
                    <ResponsiveContainer><AreaChart data={overview.charts.revenueGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                    </AreaChart></ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Davomat trendi</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-52">
                  <ResponsiveContainer><AreaChart data={overview.charts.attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="percent" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2} />
                  </AreaChart></ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Finance Tab */}
      {tab === "finance" && (
        loading ? <LoadingSkeleton /> : !finance ? (
          <p className="text-center text-muted-foreground py-10">Ma'lumot yuklanmadi</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={<Wallet className="h-5 w-5 text-blue-600" />} value={`${finance.revenue.daily.toLocaleString()} so'm`} label="Kunlik tushum" color="bg-blue-100" />
              <KpiCard icon={<Wallet className="h-5 w-5 text-cyan-600" />} value={`${finance.revenue.weekly.toLocaleString()} so'm`} label="Haftalik tushum" color="bg-cyan-100" />
              <KpiCard icon={<Wallet className="h-5 w-5 text-emerald-600" />} value={`${finance.revenue.monthly.toLocaleString()} so'm`} label="Oylik tushum" color="bg-emerald-100" />
              <KpiCard icon={<Wallet className="h-5 w-5 text-purple-600" />} value={`${finance.revenue.annual.toLocaleString()} so'm`} label="Yillik tushum" color="bg-purple-100" />
              <KpiCard icon={<Users className="h-5 w-5 text-green-600" />} value={String(finance.payments.paidStudents)} label="To'lov qilganlar" color="bg-green-100" />
              <KpiCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} value={String(finance.payments.debtors)} label="Qarzdorlar" color="bg-red-100" />
              <KpiCard icon={<Wallet className="h-5 w-5 text-amber-600" />} value={`${finance.payments.debtAmount.toLocaleString()} so'm`} label="Qarzdorlik" color="bg-amber-100" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Kurslar bo'yicha tushum</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-64">
                  <ResponsiveContainer><BarChart data={finance.courseRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="courseName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart></ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {finance.topCourse && (
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Eng ko'p daromadli kurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{finance.topCourse.courseName}</p>
                  <p className="text-sm text-muted-foreground">{finance.topCourse.amount.toLocaleString()} so'm</p>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}

      {/* Students Tab */}
      {tab === "students" && (
        loading ? <LoadingSkeleton /> : !students ? (
          <p className="text-center text-muted-foreground py-10">Ma'lumot yuklanmadi</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KpiCard icon={<Users className="h-5 w-5 text-blue-600" />} value={String(students.stats.total)} label="Jami" color="bg-blue-100" />
              <KpiCard icon={<Activity className="h-5 w-5 text-emerald-600" />} value={String(students.stats.active)} label="Faol" color="bg-emerald-100" />
              <KpiCard icon={<TrendingUp className="h-5 w-5 text-green-600" />} value={String(students.stats.new)} label="Yangi" color="bg-green-100" />
              <KpiCard icon={<GraduationCap className="h-5 w-5 text-indigo-600" />} value={String(students.stats.graduated)} label="Bitirgan" color="bg-indigo-100" />
              <KpiCard icon={<TrendingDown className="h-5 w-5 text-red-600" />} value={String(students.stats.dropped)} label="Ketgan" color="bg-red-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Eng faol guruhlar</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guruh</TableHead>
                        <TableHead className="text-right">Davomat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.attendance.topGroups.map((g) => (
                        <TableRow key={g.className}>
                          <TableCell className="font-medium">{g.className}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">{g.percent}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Eng past davomat guruhlar</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guruh</TableHead>
                        <TableHead className="text-right">Davomat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.attendance.lowestGroups.map((g) => (
                        <TableRow key={g.className}>
                          <TableCell className="font-medium">{g.className}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">{g.percent}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Yosh taqsimoti</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52">
                    <ResponsiveContainer><BarChart data={students.ageDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">O'quvchilar o'sish trendi</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52">
                    <ResponsiveContainer><AreaChart data={students.growthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                    </AreaChart></ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}

      {/* Teachers Tab */}
      {tab === "teachers" && (
        loading ? <LoadingSkeleton /> : !teachers ? (
          <p className="text-center text-muted-foreground py-10">Ma'lumot yuklanmadi</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard icon={<GraduationCap className="h-5 w-5 text-blue-600" />} value={String(teachers.stats.total)} label="Jami o'qituvchilar" color="bg-blue-100" />
              <KpiCard icon={<Activity className="h-5 w-5 text-emerald-600" />} value={String(teachers.stats.active)} label="Faol o'qituvchilar" color="bg-emerald-100" />
              <KpiCard icon={<BookOpen className="h-5 w-5 text-purple-600" />} value={String(teachers.performanceSummary.totalGroups)} label="Jami guruhlar" color="bg-purple-100" />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">O'qituvchi yuklamasi</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>O'qituvchi</TableHead>
                      <TableHead>Fan</TableHead>
                      <TableHead className="text-right">Guruhlar</TableHead>
                      <TableHead className="text-right">O'quvchilar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.workload.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                          Ma'lumot mavjud emas
                        </TableCell>
                      </TableRow>
                    ) : (
                      teachers.workload.map((t) => (
                        <TableRow key={t.teacherName}>
                          <TableCell className="font-medium">{t.teacherName}</TableCell>
                          <TableCell>{t.subject || "—"}</TableCell>
                          <TableCell className="text-right">{t.groupCount}</TableCell>
                          <TableCell className="text-right">{t.studentCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {teachers.topTeachers.length > 0 && (
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Eng faol o'qituvchilar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>O'qituvchi</TableHead>
                        <TableHead className="text-right">Guruhlar</TableHead>
                        <TableHead className="text-right">O'quvchilar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.topTeachers.map((t, i) => (
                        <TableRow key={t.teacherName}>
                          <TableCell className="font-bold">{i + 1}</TableCell>
                          <TableCell className="font-medium">{t.teacherName}</TableCell>
                          <TableCell className="text-right">{t.groupCount}</TableCell>
                          <TableCell className="text-right">{t.studentCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}

      {/* Premium Analytics Tab */}
      {tab === "premium" && (
        !isPremium ? <PremiumLocked planName={schoolPlan.planName} /> :
        loading ? <LoadingSkeleton /> : (
          <div className="space-y-6">
            {/* AI Insights */}
            {insights && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Insights
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Filial ma'lumotlari asosida avtomatik tahlil natijalari
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {insights.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/40">
                        <Info className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Forecast */}
            {forecast && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Forecasting prognozlari
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kelasi oy uchun bashorat qilingan ko'rsatkichlar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-muted/40 p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{forecast.expectedNewStudents}</p>
                      <p className="text-xs text-muted-foreground mt-1">Kutilayotgan yangi o'quvchilar</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{forecast.expectedRevenue.toLocaleString()} so'm</p>
                      <p className="text-xs text-muted-foreground mt-1">Kutilayotgan daromad</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">{forecast.expectedAttendancePercent}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Kutilayotgan davomat</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Smart Alerts */}
            {alerts && alerts.alerts.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Smart Alerts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Filialdagi muhim o'zgarishlar va ogohlantirishlar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alerts.alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          alert.type === "danger"
                            ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                            : alert.type === "warning"
                            ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                            : "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                        }`}
                      >
                        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                          alert.type === "danger" ? "text-red-500" : alert.type === "warning" ? "text-amber-500" : "text-emerald-500"
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.metric}: {alert.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}

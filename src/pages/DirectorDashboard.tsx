import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useCallback, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import DirectorLayout from "@/components/DirectorLayout";
import DirectorFinanceSection from "@/components/director/DirectorFinanceSection";
import { DirectorDashboardAreaChart } from "@/components/director/DirectorDashboardAreaChart";
import { DirectorDashboardAlertsPie } from "@/components/director/DirectorDashboardAlertsPie";
import { DirectorOverviewFinancePie } from "@/components/director/DirectorOverviewFinancePie";
import TeacherAttendanceOverviewChart from "@/components/teacher/TeacherAttendanceOverviewChart";
import TicketSystem from "@/components/director/TicketSystem";
import UnifiedProfileSection from "@/components/dashboard/UnifiedProfileSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton, StatsCardsSkeleton, TableSkeleton } from "@/components/ui/skeletons";
import { useRef } from "react";
import { BookOpen, Users, GraduationCap, UserCircle, Mail, Lock, Eye, EyeOff, Pencil, Trash2, Upload, Plus, Wallet, AlertTriangle, Info, ShieldAlert, Phone, MapPin, Camera, Calendar, Search, Eraser, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw, Minus, BarChart3, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppLocale } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";
import { normalizeUserRole, refreshAccessToken } from "@/lib/auth";
import { buildSubscriptionHeaderInfo } from "@/lib/school-subscription";
import { buildSchoolPlanContext, hasPlanFeature, type SchoolPlanContext } from "@/lib/school-plan-features";
import PlanFeatureGate from "@/components/director/PlanFeatureGate";
import PlanFeatureLockedOverlay from "@/components/director/PlanFeatureLockedOverlay";
import BranchDashboard from "@/components/director/BranchDashboard";

type DirectorSection =
  | "dashboard"
  | "students"
  | "teachers"
  | "school_admins"
  | "branches"
  | "classes"
  | "schedule"
  | "payments"
  | "exams"
  | "settings"
  | "support";

type SchoolAdminRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt?: string;
};
type BranchManager = {
  id: string;
  name: string;
  role: "school_admin" | "teacher";
};

type BranchRow = {
  id: string;
  name: string;
  address?: string | null;
  createdAt?: string | null;
  managerUser?: BranchManager | null;
};

type AssignableUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "school_admin" | "teacher";
};

type BranchAnalytics = {
  branch: { id: string; name: string; address: string };
  isPremium: boolean;
  planName: string;
  students: { total: number; active: number; newThisMonth: number };
  teachers: { total: number; active: number };
  finance: { monthIncome: number; prevMonthIncome: number; nonPayers: number; debt: number };
  attendance: { averagePercent: number; thisMonthRate: number; prevMonthRate: number; bestGroup: { name: string; percent: number } | null; worstGroup: { name: string; percent: number } | null };
  courses: { popularCourse: { name: string; teacherName: string } | null; totalGroups: number };
  aiRecommendations: string[];
};

type BranchRanking = {
  id: string;
  name: string;
  rank: number;
  studentCount: number;
  teacherCount: number;
  classCount: number;
  attendanceRate: number;
  monthlyIncome: number;
  score: number;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ALL_CLASSES_VALUE = "__all__";
const DIRECTOR_USERS_PAGE_SIZE = 5;
const STUDENTS_LIST_PAGE_SIZE = 10;
const RENDER_LEGACY_PROFILE = Boolean(import.meta.env.VITE_RENDER_LEGACY_PROFILE);

type DirectorOverview = {
  classes: number;
  subjects: number;
  teachers: number;
  students: number;
  parents: number;
  studentStats: {
    today: number;
    week: number;
    month: number;
  };
  teacherStats: {
    today: number;
    week: number;
    month: number;
  };
  finance: {
    monthIncome: number;
    monthExpense: number;
  };
  recentActivities: {
    type: "teacher" | "student" | "parent";
    title: string;
    description: string;
    createdAt: string;
  }[];
  alerts: {
    level: "info" | "warning";
    message: string;
  }[];
  /** `date` ISO `YYYY-MM-DD` (UTC): kunlik qabul (`admitted`) va chiqish (`departed`). */
  admissionTimeline?: { date: string; admitted: number; departed: number }[];
  subscription?: {
    startAt: string | null;
    endAt: string | null;
    daysLeft: number | null;
    isExpired: boolean;
    planName?: string | null;
  } | null;
  planFeatures?: {
    analytics?: boolean;
    finance?: boolean;
    payment?: boolean;
    attendanceReports?: boolean;
    ai?: boolean;
  };
  planLimits?: {
    maxStudents?: number;
    maxBranches?: number;
    planName?: string;
  };
};

/**
 * Demo ogohlantirishlar (pie chart / ro‘yxatni ko‘rish uchun).
 * Faqat `npm run dev` yoki `.env` da VITE_APPEND_DEMO_ALERTS=true bo‘lganda
 * serverdan kelgan `alerts` ro‘yxati oxiriga qo‘shiladi (API dagi + bu 3 ta).
 */
const DIRECTOR_DEMO_OVERVIEW_ALERTS: DirectorOverview["alerts"] = [
  {
    level: "info",
    message:
      "1-A sinfi uchun hali yetarli baho yoki davomat ma'lumoti yo'q — sinf rahbari bilan tekshiring.",
  },
  {
    level: "warning",
    message: "Obuna tugashiga 15 kundan kam vaqt qoldi; uzaytirishni rejalashtiring.",
  },
  {
    level: "info",
    message: "Bu haftada 3 ta yangi o'qituvchi tizimga qo'shildi.",
  },
];

const DEMO_ADMISSION_TIMELINE_DAYS = 400;

/**
 * Kirish/chiqish grafigini ko‘rish uchun namuna (backend bo‘sh yoki nol bo‘lsa).
 * — `npm run dev` yoki `VITE_APPEND_DEMO_ADMISSION_TIMELINE=true`
 * — majburiy: `VITE_FORCE_DEMO_ADMISSION_TIMELINE=true` (haqiqiy seriya bo‘lsa ham demo)
 * Joriy UTC oyda 3 ta kunga chiqish (+1) — shu oy va shu chorak yig‘masida ko‘rinadi.
 */
function buildDirectorDemoAdmissionTimeline(): NonNullable<DirectorOverview["admissionTimeline"]> {
  const rows: NonNullable<DirectorOverview["admissionTimeline"]> = [];
  const now = new Date();
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cursor.setUTCDate(cursor.getUTCDate() - (DEMO_ADMISSION_TIMELINE_DAYS - 1));
  for (let i = 0; i < DEMO_ADMISSION_TIMELINE_DAYS; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const admitted = Math.max(
      0,
      Math.min(
        9,
        Math.round(2 + Math.sin(i / 18) * 2.2 + ((i * 17) % 5) * 0.6 + (i % 11 === 0 ? 2 : 0)),
      ),
    );
    const departed = Math.max(
      0,
      Math.min(
        6,
        Math.round(0.8 + Math.sin(i / 26 + 0.9) * 1.4 + ((i * 11) % 4) * 0.45 + (i % 17 === 0 ? 1 : 0)),
      ),
    );
    rows.push({ date: key, admitted, departed });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
  const inCurrentMonth = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => row.date.startsWith(monthPrefix));
  const n = inCurrentMonth.length;
  if (n > 0) {
    const preferred = [0, Math.floor(n / 2), n - 1].filter((p) => p >= 0 && p < n);
    const idxs: number[] = [];
    for (const p of preferred) {
      idxs.push(inCurrentMonth[p]!.idx);
    }
    while (idxs.length < 3) {
      idxs.push(inCurrentMonth[n - 1]!.idx);
    }
    for (const idx of idxs.slice(0, 3)) {
      rows[idx].departed += 1;
    }
  }

  return rows;
}

function isAdmissionTimelineVisuallyEmpty(
  timeline: DirectorOverview["admissionTimeline"] | undefined,
): boolean {
  if (!Array.isArray(timeline) || timeline.length === 0) return true;
  return timeline.every((d) => (d.admitted ?? 0) === 0 && (d.departed ?? 0) === 0);
}

type Subject = {
  _id: string;
  name: string;
};

type ClassRow = {
  _id: string;
  name: string;
  classTeacherId?: string | null;
  classTeacherName?: string | null;
  studentCount?: number;
  currentAverageGrade?: number;
  previousAverageGrade?: number;
  monthlyGrowth?: number | null;
  absentCount?: number;
  lateCount?: number;
  monthlyRank?: number | null;
  monthlyTrend?: "up" | "down" | "stable" | "no_data";
  monthlyTrendTitle?: string;
  monthlyTrendReason?: string;
};

type ClassInsights = {
  classes: ClassRow[];
  selectedClass: {
    _id: string;
    name: string;
    classTeacherId?: string | null;
    classTeacherName?: string | null;
    studentCount: number;
  } | null;
  subjectRankings: Array<{
    subjectId?: string | null;
    subjectName: string;
    averageGrade: number;
    gradesCount: number;
    bestStudentName?: string | null;
  }>;
  studentRankings: Array<{
    studentId?: string | null;
    studentName: string;
    email?: string | null;
    averageGrade: number;
    gradesCount: number;
  }>;
  selectedStudent: {
    studentId?: string | null;
    studentName: string;
    email?: string | null;
    subjectGrades: Array<{
      subjectId?: string | null;
      subjectName: string;
      averageGrade: number;
      gradesCount: number;
      bestGrade: number;
      lastGrade: number;
    }>;
  } | null;
};

type TimetableEntry = {
  id: string;
  classId?: string;
  className?: string;
  subjectId?: string | null;
  teacherId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  subjectName: string;
  teacherName: string;
};

type ManagedExamRow = {
  id: string;
  title: string;
  classId: string | null;
  className: string;
  subjectName: string;
  duration: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  createdByRole?: string;
};

type ExamResultAttemptRow = {
  id: string;
  studentId: string | null;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number;
  maxScore: number;
  gradePercent: number;
  checkedAnswers: number;
  pendingManual: number;
  isFinalScore: boolean;
};

type ExamResultsResponse = {
  exam: {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    duration: number;
    startTime: string;
    endTime: string;
  };
  attempts: ExamResultAttemptRow[];
};

type TeacherRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  subjectId?: string;
  subjectName?: string;
  classes?: {
    id: string;
    name: string;
    studentCount: number;
  }[];
};

type StudentRowForParent = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string | null;
  classId?: string;
  className?: string;
  studentCode?: string;
  birthDate?: string | null;
  gender?: string;
  nationality?: string;
  birthCertSeries?: string;
  birthCertNumber?: string;
  status?: string;
  admissionOrderNumber?: string;
  academicYear?: string;
  educationLanguage?: string;
  admissionOrderDate?: string | null;
  classAcceptedDate?: string | null;
  parentName?: string;
  parentPassport?: string;
  parentPhone?: string;
  region?: string;
  district?: string;
  address?: string;
  createdAt?: string | null;
};

type DirectorManageableRole = "teacher" | "student" | "parent";

type DirectorManagedUser = {
  id: string;
  name: string;
  email: string;
  role: DirectorManageableRole;
  photoUrl?: string | null;
  phone?: string | null;
  parentName?: string | null;
  debtAmount?: number | null;
  relatedLabel?: string | null;
  relatedId?: string | null;
  createdAt?: string;
};

type DirectorHeaderNotification = {
  id: string;
  text: string;
  at: string;
  section: DirectorSection;
};

type FaceApiModule = typeof import("@/lib/faceApi");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;

const getClassTrendLabel = (
  trend: ClassRow["monthlyTrend"] | undefined,
  translateFn: (key: string, vars?: Record<string, string | number>) => string,
) => {
  if (trend === "up") return translateFn("trends.up");
  if (trend === "down") return translateFn("trends.down");
  if (trend === "stable") return translateFn("trends.stable");
  return translateFn("trends.noData");
};

const getClassTrendClassName = (trend?: ClassRow["monthlyTrend"]) => {
  if (trend === "up") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (trend === "down") return "border-rose-200 bg-rose-50 text-rose-700";
  if (trend === "stable") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const getClassTrendReason = (
  classRow: ClassRow,
  translateFn: (key: string, vars?: Record<string, string | number>) => string,
) => {
  if (classRow.monthlyTrend === "up") {
    return classRow.absentCount || classRow.lateCount
      ? translateFn("trends.reason.upWithAttendance", {
          absent: classRow.absentCount || 0,
          late: classRow.lateCount || 0,
        })
      : translateFn("trends.reason.up");
  }

  if (classRow.monthlyTrend === "down") {
    return classRow.absentCount || classRow.lateCount
      ? translateFn("trends.reason.downWithAttendance", {
          absent: classRow.absentCount || 0,
          late: classRow.lateCount || 0,
        })
      : translateFn("trends.reason.down");
  }

  if (classRow.monthlyTrend === "stable") {
    return classRow.absentCount || classRow.lateCount
      ? translateFn("trends.reason.stableWithAttendance", {
          absent: classRow.absentCount || 0,
          late: classRow.lateCount || 0,
        })
      : translateFn("trends.reason.stable");
  }

  return translateFn("trends.reason.noData");
};

const loadFaceApiModule = async (): Promise<FaceApiModule> => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@/lib/faceApi");
  }

  return faceApiModulePromise;
};

const decodeHtmlEntities = (value?: string | null) => {
  if (!value) return "";
  return value
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const DirectorDashboard = () => {
  const { t } = useTranslation("director-dashboard");
  const tr = t;
  const { t: tLayout } = useTranslation("layout");
  const { t: tStats } = useTranslation("director-stats");
  const { t: tTable } = useTranslation("director-table");
  const { t: tFilters } = useTranslation("director-filters");
  const tUi = (key: string) => t(`ui.${key}`);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const locale = useAppLocale();
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatMoney = (value: number) => `${moneyFormatter.format(Math.round(value || 0))} so'm`;

  const directorRoleLabels: Record<DirectorManageableRole, string> = {
    teacher: tFilters("teacher"),
    student: tFilters("student"),
    parent: tFilters("parent"),
  };

  const directorRoleFilterOptions = useMemo<Array<{ value: "all" | DirectorManageableRole; label: string }>>(
    () => [
      { value: "all", label: tFilters("all") },
      { value: "teacher", label: tFilters("teacher") },
      { value: "student", label: tFilters("student") },
      { value: "parent", label: tFilters("parent") },
    ],
    [tFilters],
  );
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const normalizedRole = normalizeUserRole(currentUser?.role);
  const isSchoolAdmin = normalizedRole === "school_admin";
  const schoolManagerLoginMessage = t("schoolManagerLoginMessage");
  const profileRoleLabel = isSchoolAdmin ? tLayout("schoolAdmin.badge") : tLayout("director.badge");
  const rawSchoolAddress = typeof currentUser?.schoolAddress === "string" ? currentUser.schoolAddress : "";

  const formatLocationPart = (value: string) =>
    value
      .replace(/\b(toshkent|tashkent|uzbekistan|o'zbekiston|узбекистан)\b/gi, "")
      .replace(/\b(sh\.?|city|город)\b/gi, "")
      .replace(/\b(tumani|tumani|rayoni|rayon|district|район)\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/^[,-/\s]+|[,-/\s]+$/g, "")
      .trim();

  const normalizeCase = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");

  const formattedSchoolAddress = (() => {
    const normalized = rawSchoolAddress.replace(/\s+/g, " ").trim();
    if (!normalized) return "";

    const parts = normalized
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const districtIndex = parts.findIndex((part) => /tumani|tumani|rayon|district|район/i.test(part));
    const districtRaw = districtIndex >= 0
      ? parts[districtIndex]
      : (parts.length >= 2 ? parts[parts.length - 2] : parts[0]);

    const streetRaw =
      parts.find((part, idx) => idx !== districtIndex && /\d/.test(part)) ||
      (parts.length > 0 ? parts[parts.length - 1] : "");

    const district = normalizeCase(formatLocationPart(districtRaw));
    const street = normalizeCase(formatLocationPart(streetRaw));

    if (district && street && district !== street) {
      return `${district} / ${street}`;
    }

    if (district) {
      return district;
    }

    return normalizeCase(formatLocationPart(normalized)) || normalized;
  })();
  const profileLocationLabel = formattedSchoolAddress || t("profile.locationDisplay");
  const profileLocationHref = `https://www.google.com/maps/search/${encodeURIComponent(rawSchoolAddress || profileLocationLabel)}`;
  const profileDisplayName = decodeHtmlEntities(currentUser?.name)
    || (isSchoolAdmin ? tLayout("schoolAdmin.fallbackName") : tLayout("director.fallbackName"));
  const [section, setSection] = useState<DirectorSection>("dashboard");
  const [studentsView, setStudentsView] = useState<"base" | "list" | "attach">("base");
  const [overview, setOverview] = useState<DirectorOverview | null>(null);
  const [directorAttendanceStatsRange, setDirectorAttendanceStatsRange] = useState<"1d" | "1w" | "1m">("1w");
  const [directorAttendanceStatsSeries, setDirectorAttendanceStatsSeries] = useState<
    { bucket: string; presentLate: number; absent: number }[]
  >([]);
  const [directorAttendanceStatsBucket, setDirectorAttendanceStatsBucket] = useState<"hour" | "day">("day");
  const [loadingDirectorAttendanceStats, setLoadingDirectorAttendanceStats] = useState(false);
  const [headerNotifications, setHeaderNotifications] = useState<DirectorHeaderNotification[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [directorUsersLoading, setDirectorUsersLoading] = useState(false);
  const [directorUsers, setDirectorUsers] = useState<DirectorManagedUser[]>([]);
  const [directorUsersSearch, setDirectorUsersSearch] = useState("");
  const [directorUsersRoleFilter, setDirectorUsersRoleFilter] = useState<"all" | DirectorManageableRole>("all");
  const [studentsClassFilter, setStudentsClassFilter] = useState<string>("all");
  const [directorUsersPage, setDirectorUsersPage] = useState(1);
  const [directorUserDialogOpen, setDirectorUserDialogOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdminRow[]>([]);
  const [schoolAdminsLoading, setSchoolAdminsLoading] = useState(false);
  const [schoolAdminDialogOpen, setSchoolAdminDialogOpen] = useState(false);
  const [schoolAdminName, setSchoolAdminName] = useState("");
  const [schoolAdminEmail, setSchoolAdminEmail] = useState("");
  const [schoolAdminPhone, setSchoolAdminPhone] = useState("");
  const [schoolAdminPassword, setSchoolAdminPassword] = useState("");
  const [showSchoolAdminPassword, setShowSchoolAdminPassword] = useState(false);
  const [creatingSchoolAdmin, setCreatingSchoolAdmin] = useState(false);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [editBranchDialogOpen, setEditBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRow | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [savingBranchEdit, setSavingBranchEdit] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningBranch, setAssigningBranch] = useState<BranchRow | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = useState(false);
  const [savingBranchAssignment, setSavingBranchAssignment] = useState(false);
  const [branchAnalyticsOpen, setBranchAnalyticsOpen] = useState(false);
  const [branchAnalyticsLoading, setBranchAnalyticsLoading] = useState(false);
  const [selectedBranchAnalytics, setSelectedBranchAnalytics] = useState<BranchAnalytics | null>(null);
  const [branchRankings, setBranchRankings] = useState<BranchRanking[]>([]);
  const [branchRankingsLoading, setBranchRankingsLoading] = useState(false);
  const [selectedBranchDashboard, setSelectedBranchDashboard] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get("section");
    const viewParam = params.get("view");

    const allowedSections: DirectorSection[] = [
      "dashboard",
      "students",
      "teachers",
      "school_admins",
      "branches",
      "classes",
      "schedule",
      "payments",
      "exams",
      "settings",
      "support",
    ];
    const allowedViews: Array<"base" | "list" | "attach"> = ["base", "list", "attach"];

    if (sectionParam && allowedSections.includes(sectionParam as DirectorSection)) {
      setSection(sectionParam as DirectorSection);
    }
    if (viewParam && allowedViews.includes(viewParam as "base" | "list" | "attach")) {
      setStudentsView(viewParam as "base" | "list" | "attach");
    }
  }, [location.search]);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newClassName, setNewClassName] = useState("");

  const [selectedTimetableClassId, setSelectedTimetableClassId] = useState<string>("");
  const [selectedClassInsightsStudentId, setSelectedClassInsightsStudentId] = useState<string>("");
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [loadingClassInsights, setLoadingClassInsights] = useState(false);
  const [classInsights, setClassInsights] = useState<ClassInsights | null>(null);
  const [loadingExams, setLoadingExams] = useState(false);
  const [exams, setExams] = useState<ManagedExamRow[]>([]);
  const [creatingExam, setCreatingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamClassId, setNewExamClassId] = useState("");
  const [newExamSubjectId, setNewExamSubjectId] = useState("");
  const [newExamDuration, setNewExamDuration] = useState("45");
  const [newExamStartTime, setNewExamStartTime] = useState("");
  const [newExamEndTime, setNewExamEndTime] = useState("");
  const [questionExamId, setQuestionExamId] = useState<string | null>(null);
  const [questionExamTitle, setQuestionExamTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"test" | "text">("test");
  const [questionPoints, setQuestionPoints] = useState("5");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOptionKey, setCorrectOptionKey] = useState("A");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [publishingExamId, setPublishingExamId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [examResults, setExamResults] = useState<ExamResultAttemptRow[]>([]);
  const [editingTimetableEntryId, setEditingTimetableEntryId] = useState<string | null>(null);
  const [ttDayOfWeek, setTtDayOfWeek] = useState<string>("1");
  const [ttStartTime, setTtStartTime] = useState<string>("08:00");
  const [ttEndTime, setTtEndTime] = useState<string>("08:45");
  const [ttSubjectId, setTtSubjectId] = useState<string>("");
  const [ttTeacherId, setTtTeacherId] = useState<string>("");
  const [ttRoom, setTtRoom] = useState<string>("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null);
  const [selectedDirectorUser, setSelectedDirectorUser] = useState<DirectorManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelatedId, setEditRelatedId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");

  const [statRange, setStatRange] = useState<"today" | "week" | "month">("today");

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const handleAuthExpiry = useCallback((message?: string) => {
    const normalized = (message || "").toLowerCase();
    if (
      normalized.includes("invalid or expired token") ||
      normalized.includes("jwt expired") ||
      normalized.includes("invalid token") ||
      normalized.includes("token expired")
    ) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      navigate("/login");
      return true;
    }

    return false;
  }, [navigate]);

  const apiFetch = useCallback(async (...args: Parameters<typeof fetch>) => {
    const res = await fetch(...args);
    if (res.status === 401) {
      const data = await res.clone().json().catch(() => null);
      const message = data?.message || "Invalid or expired token";

      try {
        const refreshed = await refreshAccessToken();
        const [input, init] = args;
        const nextHeaders = new Headers(init?.headers);
        nextHeaders.set("Authorization", `Bearer ${refreshed.token}`);
        const retryRes = await fetch(input, {
          ...init,
          headers: nextHeaders,
        });
        if (retryRes.status !== 401) {
          return retryRes;
        }
      } catch {
        // Fall through to the existing auth expiry handling.
      }

      handleAuthExpiry(message);
      throw new Error(message);
    }
    return res;
  }, [handleAuthExpiry]);

  const dayOptions: { value: string; label: string }[] = [
    { value: "1", label: t("days.monday", { defaultValue: "Dushanba" }) },
    { value: "2", label: t("days.tuesday", { defaultValue: "Seshanba" }) },
    { value: "3", label: t("days.wednesday", { defaultValue: "Chorshanba" }) },
    { value: "4", label: t("days.thursday", { defaultValue: "Payshanba" }) },
    { value: "5", label: t("days.friday", { defaultValue: "Juma" }) },
    { value: "6", label: t("days.saturday", { defaultValue: "Shanba" }) },
    { value: "0", label: t("days.sunday", { defaultValue: "Yakshanba" }) },
  ];
  const todayDay = new Date().getDay();

  const getClassBadgeClassName = (classId?: string, className?: string) => {
    const palette = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-violet-100 text-violet-800 border-violet-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
      "bg-lime-100 text-lime-800 border-lime-200",
      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    ];

    const seed = classId || className || "unknown-class";
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    return palette[Math.abs(hash) % palette.length];
  };

  const [studentsForParents, setStudentsForParents] = useState<StudentRowForParent[]>([]);
  const [loadingStudentsForParents, setLoadingStudentsForParents] = useState(false);
  const [parentStudentId, setParentStudentId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [showParentPassword, setShowParentPassword] = useState(false);
  const [showParentLoginAfterAttach, setShowParentLoginAfterAttach] = useState(false);

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentParentName, setStudentParentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [attachStudentUserId, setAttachStudentUserId] = useState("");
  const [attachTargetClassId, setAttachTargetClassId] = useState("");
  const [attachAcademicYear, setAttachAcademicYear] = useState("");
  const [attachEducationLanguage, setAttachEducationLanguage] = useState("");
  const [attachAdmissionOrderDate, setAttachAdmissionOrderDate] = useState("");
  const [attachClassAcceptedDate, setAttachClassAcceptedDate] = useState("");
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentsBaseFiltersOpen, setStudentsBaseFiltersOpen] = useState(true);

  const [directorPhotoUrl, setDirectorPhotoUrl] = useState<string | null>(null);
  const [savingDirectorProfile, setSavingDirectorProfile] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [savingProfileDetails, setSavingProfileDetails] = useState(false);
  const directorPhotoInputRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    gender: "",
    dateOfBirth: "",
    nationalId: "",
    country: "",
    cityState: "",
    postalCode: "",
    taxId: "",
  });
  const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
  const [newProfilePassword, setNewProfilePassword] = useState("");
  const [confirmProfilePassword, setConfirmProfilePassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showProfilePasswordConfirm, setShowProfilePasswordConfirm] = useState(false);

  const [studentPhotoDialogOpen, setStudentPhotoDialogOpen] = useState(false);
  const [studentForPhoto, setStudentForPhoto] = useState<StudentRowForParent | null>(null);
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | null>(null);
  const [studentImporting, setStudentImporting] = useState(false);
  const studentPhotoInputRef = useRef<HTMLInputElement>(null);
  const studentImportInputRef = useRef<HTMLInputElement>(null);

  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const [faceClassId, setFaceClassId] = useState("");
  const [faceResult, setFaceResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceCameraOn, setFaceCameraOn] = useState(false);
  const loadedDirectorDataRef = useRef({
    overview: false,
    subjects: false,
    teachers: false,
    classes: false,
    students: false,
    users: false,
    exams: false,
    branches: false,
  });
  const directorUsersRequestIdRef = useRef(0);

  const updateAuthUserInStorage = (patch: Partial<{ name: string; email: string; phone: string | null; photoUrl: string | null }>) => {
    const auth = localStorage.getItem("auth_user");
    if (!auth) return;
    const parsed = JSON.parse(auth);
    const next = { ...parsed, ...patch };
    localStorage.setItem("auth_user", JSON.stringify(next));
  };

  const buildProfileFormFromAuth = useCallback(() => {
    const raw = localStorage.getItem("auth_user");
    const parsed = raw ? JSON.parse(raw) : {};
    const fullName = decodeHtmlEntities(parsed?.name) || profileDisplayName;
    const parts = fullName.split(" ").filter(Boolean);
    const extrasRaw = localStorage.getItem("director_profile_meta");
    const extras = extrasRaw ? JSON.parse(extrasRaw) : {};

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      email: parsed?.email || currentUser?.email || "",
      phone: parsed?.phone || currentUser?.phone || "",
      bio: extras.bio || profileRoleLabel,
      gender: extras.gender || "",
      dateOfBirth: extras.dateOfBirth || "",
      nationalId: extras.nationalId || "",
      country: extras.country || "",
      cityState: extras.cityState || "",
      postalCode: extras.postalCode || "",
      taxId: extras.taxId || "",
    };
  }, [currentUser?.email, currentUser?.phone, profileDisplayName, profileRoleLabel]);

  const toDateTimeLocalValue = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const tzOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
    return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const fetchOverview = async (silent = false) => {
    if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || t("errors.overviewLoad"));
      }
      const data = await res.json();
      const appendDemoAlerts =
        import.meta.env.DEV || import.meta.env.VITE_APPEND_DEMO_ALERTS === "true";
      const mergedAlerts = appendDemoAlerts
        ? [...(Array.isArray(data.alerts) ? data.alerts : []), ...DIRECTOR_DEMO_OVERVIEW_ALERTS]
        : Array.isArray(data.alerts)
          ? data.alerts
          : [];
      const allowDemoTimeline =
        import.meta.env.VITE_APPEND_DEMO_ADMISSION_TIMELINE === "true";
      const forceDemoTimeline = import.meta.env.VITE_FORCE_DEMO_ADMISSION_TIMELINE === "true";
      const apiTimeline = Array.isArray(data.admissionTimeline) ? data.admissionTimeline : [];
      const admissionTimeline =
        allowDemoTimeline &&
        (forceDemoTimeline || isAdmissionTimelineVisuallyEmpty(apiTimeline))
          ? buildDirectorDemoAdmissionTimeline()
          : apiTimeline;
      const nextOverview: DirectorOverview = { ...data, alerts: mergedAlerts, admissionTimeline };
      setOverview(nextOverview);
      const timestamp = new Date().toLocaleString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
      const mappedAlerts: DirectorHeaderNotification[] = (nextOverview.alerts || []).map(
        (alert: { level: "info" | "warning"; message: string }) => ({
          id: `overview:${alert.level}:${alert.message}`,
          text: alert.message,
          at: timestamp,
          section: "dashboard",
        }),
      );
      setHeaderNotifications(mappedAlerts.slice(0, 8));
      loadedDirectorDataRef.current.overview = true;
    } catch (err: unknown) {
      if (silent) return;
      toast({
        title: t("errorTitle"),
        description:
          err instanceof Error ? err.message : t("errors.overviewLoadDesc"),
        variant: "destructive",
      });
    }
  };

  const fetchSubjects = async () => {
    if (!token) return;
    setLoadingSubjects(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t("errors.subjectsLoad"));
      const data = await res.json();
      setSubjects(data);
      loadedDirectorDataRef.current.subjects = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.subjectsLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchTeachers = async () => {
    if (!token) return;
    setLoadingTeachers(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t("errors.teachersLoad"));
      const data = await res.json();
      setTeachers(data);
      loadedDirectorDataRef.current.teachers = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.teachersLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchStudentsForParents = async () => {
    if (!token) return;
    setLoadingStudentsForParents(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t("errors.studentsLoad"));
      const data = await res.json();
      setStudentsForParents(data);
      loadedDirectorDataRef.current.students = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.studentsLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingStudentsForParents(false);
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    setLoadingClasses(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t("errors.classesLoad"));
      const data = await res.json();
      setClasses(data);
      if (!selectedTimetableClassId && data.length > 0) {
        setSelectedTimetableClassId(isSchoolAdmin ? ALL_CLASSES_VALUE : data[0]._id);
      }
      loadedDirectorDataRef.current.classes = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.classesLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassInsights = async (classId: string, studentId?: string) => {
    if (!token || !classId) return;
    setLoadingClassInsights(true);
    try {
      const params = new URLSearchParams({ classId });
      if (studentId) {
        params.set("studentId", studentId);
      }

      const res = await apiFetch(`${API_BASE_URL}/api/director/classes/insights?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.classInsightsLoad"));
      }
      setClassInsights(data);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.classInsightsLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingClassInsights(false);
    }
  };

  const fetchExams = async (classId?: string) => {
    if (!token) return;
    setLoadingExams(true);
    try {
      const params = new URLSearchParams();
      if (classId) {
        params.set("classId", classId);
      }

      const query = params.toString();
      const res = await apiFetch(`${API_BASE_URL}/api/exams/manage${query ? `?${query}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.examsLoad"));
      }

      const mapped: ManagedExamRow[] = (Array.isArray(data) ? data : []).map((item: ManagedExamRow) => ({
        id: item.id,
        title: item.title || "",
        classId: item.classId || null,
        className: item.className || "—",
        subjectName: item.subjectName || "—",
        duration: Number(item.duration || 0),
        startTime: item.startTime,
        endTime: item.endTime,
        isPublished: Boolean(item.isPublished),
        createdByRole: item.createdByRole,
      }));

      setExams(mapped);
      loadedDirectorDataRef.current.exams = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.examsLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingExams(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }

    if (!newExamTitle || !newExamClassId || !newExamSubjectId || !newExamDuration || !newExamStartTime || !newExamEndTime) {
      toast({
        title: t("insufficientDataTitle"),
        description: t("validation.examRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(newExamStartTime);
    const endDate = new Date(newExamEndTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast({
        title: t("errorTitle"),
        description: t("validation.invalidDateTime"),
        variant: "destructive",
      });
      return;
    }
    if (startDate.getTime() >= endDate.getTime()) {
      toast({
        title: t("timeErrorTitle"),
        description: t("validation.startBeforeEnd"),
        variant: "destructive",
      });
      return;
    }

    setCreatingExam(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newExamTitle,
          classId: newExamClassId,
          subjectId: newExamSubjectId,
          duration: Number(newExamDuration),
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          isPublished: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.examCreate"));
      }

      toast({
        title: t("successTitle"),
        description: t("messages.examCreated"),
      });

      setNewExamTitle("");
      setNewExamSubjectId("");
      setNewExamDuration("45");
      setNewExamStartTime("");
      setNewExamEndTime("");
      if (selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE) {
        setNewExamClassId(selectedTimetableClassId);
      }

      await fetchExams(selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE ? selectedTimetableClassId : undefined);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.examCreateDesc"),
        variant: "destructive",
      });
    } finally {
      setCreatingExam(false);
    }
  };

  const handleOpenQuestionEditor = (exam: ManagedExamRow) => {
    setQuestionExamId(exam.id);
    setQuestionExamTitle(exam.title);
    setQuestionText("");
    setQuestionType("test");
    setQuestionPoints("5");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOptionKey("A");
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !questionExamId) return;

    if (!questionText || !questionPoints) {
      toast({
        title: t("insufficientDataTitle"),
        description: t("validation.questionRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    const optionsRaw = [
      { key: "A", text: optionA.trim() },
      { key: "B", text: optionB.trim() },
      { key: "C", text: optionC.trim() },
      { key: "D", text: optionD.trim() },
    ];
    const options = optionsRaw.filter((o) => o.text.length > 0);

    if (questionType === "test") {
      if (options.length < 2) {
        toast({
          title: t("errorTitle"),
          description: t("validation.testMinOptions"),
          variant: "destructive",
        });
        return;
      }
      if (!options.some((o) => o.key === correctOptionKey)) {
        toast({
          title: t("errorTitle"),
          description: t("validation.correctOptionRequired"),
          variant: "destructive",
        });
        return;
      }
    }

    setAddingQuestion(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/exams/${questionExamId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText,
          type: questionType,
          points: Number(questionPoints),
          options: questionType === "test" ? options : [],
          correctAnswer: questionType === "test" ? correctOptionKey : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.questionAdd"));
      }

      toast({
        title: t("successTitle"),
        description: t("messages.questionAdded"),
      });

      setQuestionText("");
      setQuestionPoints("5");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectOptionKey("A");
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.questionAddDesc"),
        variant: "destructive",
      });
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleToggleExamPublish = async (exam: ManagedExamRow) => {
    if (!token) return;
    setPublishingExamId(exam.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/exams/${exam.id}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: !exam.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.examToggle"));
      }

      toast({
        title: t("successTitle"),
        description: data.isPublished ? t("messages.examActivated") : t("messages.examDrafted"),
      });

      await fetchExams(selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE ? selectedTimetableClassId : undefined);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.examToggleDesc"),
        variant: "destructive",
      });
    } finally {
      setPublishingExamId(null);
    }
  };

  const handleDeleteExam = async (exam: ManagedExamRow) => {
    if (!token) return;

    const hasEnded = new Date(exam.endTime).getTime() <= Date.now();
    if (!hasEnded) {
      toast({
        title: t("notAllowedYetTitle"),
        description: t("messages.examDeleteAfterEnd"),
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(t("confirm.deleteExamWithCascade", { title: exam.title }));
    if (!confirmed) return;

    setDeletingExamId(exam.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/exams/${exam.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.examDelete"));
      }

      toast({
        title: t("successTitle"),
        description: t("messages.examDeletedWithResults"),
      });

      if (selectedExamId === exam.id) {
        setSelectedExamId("");
        setSelectedExamTitle("");
        setExamResults([]);
      }

      await fetchExams(
        selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE
          ? selectedTimetableClassId
          : undefined,
      );
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.examDeleteDesc"),
        variant: "destructive",
      });
    } finally {
      setDeletingExamId(null);
    }
  };

  const fetchExamResults = async (examId: string, titleFallback?: string) => {
    if (!token || !examId) return;
    setExamResultsLoading(true);
    setSelectedExamId(examId);
    if (titleFallback) {
      setSelectedExamTitle(titleFallback);
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ExamResultsResponse | { message?: string } = await res.json();
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || t("errors.examResultsLoad"));
      }

      const payload = data as ExamResultsResponse;
      setSelectedExamTitle(payload.exam?.title || titleFallback || t("exams.examFallback"));
      setExamResults(Array.isArray(payload.attempts) ? payload.attempts : []);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.examResultsLoadDesc"),
        variant: "destructive",
      });
      setExamResults([]);
    } finally {
      setExamResultsLoading(false);
    }
  };

  const fetchSchoolAdmins = async () => {
    if (!token) return;

    setSchoolAdminsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users?role=school_admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("errors.usersLoad"));

      const rows: SchoolAdminRow[] = Array.isArray(data)
        ? data.map((item: SchoolAdminRow & { user?: { phone?: string | null } }) => ({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone ?? item.user?.phone ?? null,
            createdAt: item.createdAt,
          }))
        : [];

      setSchoolAdmins(rows);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.usersLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setSchoolAdminsLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!token) return;

    setBranchesLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Filiallarni yuklab bo'lmadi");
      }

      const rows: BranchRow[] = Array.isArray(data.branches)
        ? data.branches.map((item: { _id?: string; id?: string; name?: string; address?: string; createdAt?: string; created_at?: string; managerUser?: BranchManager | null }) => ({
          id: String(item._id || item.id || ""),
          name: item.name || "",
          address: item.address ?? null,
          createdAt: item.createdAt ?? item.created_at ?? null,
          managerUser: item.managerUser ?? null,
        }))
        : [];

      setBranches(rows);
      loadedDirectorDataRef.current.branches = true;
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Filiallarni yuklab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setBranchesLoading(false);
    }
  };

  const fetchBranchAnalytics = useCallback(async (branchId: string) => {
    if (!token) return;
    setBranchAnalyticsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches/${branchId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Analitikani yuklab bo'lmadi");
      setSelectedBranchAnalytics(data);
    } catch (err: unknown) {
      toast({
        title: "Xatolik",
        description: err instanceof Error ? err.message : "Analitikani yuklab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setBranchAnalyticsLoading(false);
    }
  }, [token, toast, apiFetch]);

  const fetchBranchRankings = useCallback(async () => {
    if (!token) return;
    setBranchRankingsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches/rankings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reytingni yuklab bo'lmadi");
      setBranchRankings(Array.isArray(data.rankings) ? data.rankings : []);
    } catch (err: unknown) {
      toast({
        title: "Xatolik",
        description: err instanceof Error ? err.message : "Reytingni yuklab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setBranchRankingsLoading(false);
    }
  }, [token, toast, apiFetch]);

  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreatingSchoolAdmin(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/school-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: schoolAdminName.trim(),
          email: schoolAdminEmail.trim(),
          phone: schoolAdminPhone.trim(),
          password: schoolAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("errors.schoolAdminCreate"));

      toast({
        title: t("successTitle"),
        description: t("messages.schoolAdminCreated"),
      });

      setSchoolAdminDialogOpen(false);
      setSchoolAdminName("");
      setSchoolAdminEmail("");
      setSchoolAdminPhone("");
      setSchoolAdminPassword("");
      await fetchSchoolAdmins();
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.schoolAdminCreateDesc"),
        variant: "destructive",
      });
    } finally {
      setCreatingSchoolAdmin(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!branchName.trim()) {
      toast({
        title: t("errorTitle"),
        description: "Filial nomini kiriting.",
        variant: "destructive",
      });
      return;
    }

    setCreatingBranch(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: branchName.trim(),
          address: branchAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Filial yaratilmadi");
      }

      toast({
        title: t("successTitle"),
        description: "Filial qo'shildi.",
      });

      setBranchDialogOpen(false);
      setBranchName("");
      setBranchAddress("");
      await fetchBranches();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Filial yaratilmadi",
        variant: "destructive",
      });
    } finally {
      setCreatingBranch(false);
    }
  };

  const fetchAssignableUsers = async () => {
    if (!token) return;
    setAssignableUsersLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Foydalanuvchilarni yuklab bo'lmadi");
      const users: AssignableUser[] = Array.isArray(data)
        ? data.filter((u: { role?: string }) => u.role === "school_admin" || u.role === "teacher")
          .map((u: { id?: string; _id?: string; name?: string; email?: string; phone?: string | null; role?: string }) => ({
            id: String(u.id || u._id || ""),
            name: u.name || "",
            email: u.email || "",
            phone: u.phone ?? null,
            role: u.role as "school_admin" | "teacher",
          }))
        : [];
      setAssignableUsers(users);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Foydalanuvchilarni yuklab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setAssignableUsersLoading(false);
    }
  };

  const handleEditBranch = (branch: BranchRow) => {
    setEditingBranch(branch);
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address || "");
    setEditBranchDialogOpen(true);
  };

  const handleSaveBranchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingBranch) return;
    setSavingBranchEdit(true);
    try {
      const body: Record<string, string> = {};
      if (editBranchName.trim()) body.name = editBranchName.trim();
      if (editBranchAddress !== editingBranch.address) body.address = editBranchAddress.trim();

      const res = await apiFetch(`${API_BASE_URL}/api/director/branches/${editingBranch.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Filial tahrirlanmadi");

      toast({
        title: t("successTitle"),
        description: "Filial tahrirlandi.",
      });

      setEditBranchDialogOpen(false);
      setEditingBranch(null);
      await fetchBranches();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Filial tahrirlanmadi",
        variant: "destructive",
      });
    } finally {
      setSavingBranchEdit(false);
    }
  };

  const handleDeleteBranch = async (branch: BranchRow) => {
    if (!token) return;
    if (!window.confirm(`"${branch.name}" filialini o'chirmoqchimisiz?`)) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches/${branch.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Filial o'chirilmadi");

      toast({
        title: t("successTitle"),
        description: "Filial o'chirildi.",
      });

      await fetchBranches();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Filial o'chirilmadi",
        variant: "destructive",
      });
    }
  };

  const handleAssignManager = (branch: BranchRow) => {
    setAssigningBranch(branch);
    setAssignUserId(branch.managerUser?.id || "");
    void fetchAssignableUsers();
    setAssignDialogOpen(true);
  };

  const handleSaveAssignManager = async () => {
    if (!token || !assigningBranch) return;
    setSavingBranchAssignment(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/branches/${assigningBranch.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          managerUserId: assignUserId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Mas'ul biriktirilmadi");

      toast({
        title: t("successTitle"),
        description: assignUserId ? "Mas'ul biriktirildi." : "Mas'ul olib tashlandi.",
      });

      setAssignDialogOpen(false);
      setAssigningBranch(null);
      setAssignUserId("");
      await fetchBranches();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Mas'ul biriktirilmadi",
        variant: "destructive",
      });
    } finally {
      setSavingBranchAssignment(false);
    }
  };

  const fetchDirectorUsers = async (options?: {
    role?: "all" | DirectorManageableRole;
    search?: string;
  }) => {
    if (!token) return;

    const role = options?.role ?? directorUsersRoleFilter;
    const search = options?.search ?? directorUsersSearch;

    const requestId = ++directorUsersRequestIdRef.current;
    setDirectorUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (role !== "all") {
        params.set("role", role);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const queryString = params.toString();
      const res = await apiFetch(`${API_BASE_URL}/api/director/users${queryString ? `?${queryString}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("errors.usersLoad"));
      if (requestId !== directorUsersRequestIdRef.current) return;

      const normalizedUsers: DirectorManagedUser[] = Array.isArray(data)
        ? data.map((item: DirectorManagedUser & { user?: { phone?: string | null }; parentPhone?: string | null }) => ({
          ...item,
          phone: item.phone ?? item.user?.phone ?? item.parentPhone ?? null,
          debtAmount: typeof item.debtAmount === "number" ? item.debtAmount : null,
        }))
        : [];

      setDirectorUsers(normalizedUsers);
      loadedDirectorDataRef.current.users = true;
    } catch (err: unknown) {
      if (requestId !== directorUsersRequestIdRef.current) return;
      toast({
        title: t("errorTitle"),
        description:
          err instanceof Error ? err.message : t("errors.usersLoadDesc"),
        variant: "destructive",
      });
    } finally {
      if (requestId === directorUsersRequestIdRef.current) {
        setDirectorUsersLoading(false);
      }
    }
  };

  const visibleDirectorRoleFilters = useMemo(() => {
    if (section === "teachers") {
      return directorRoleFilterOptions.filter((filter) =>
        filter.value === "all" || filter.value === "teacher",
      );
    }

    if (section === "students") {
      return directorRoleFilterOptions.filter(
        (filter) => filter.value === "student" || filter.value === "parent",
      );
    }

    return directorRoleFilterOptions;
  }, [directorRoleFilterOptions, section]);

  const directorUsersTotal = directorUsers.length;
  const directorUsersTotalPages = Math.max(1, Math.ceil(directorUsersTotal / DIRECTOR_USERS_PAGE_SIZE));
  const safeDirectorUsersPage = Math.min(directorUsersPage, directorUsersTotalPages);
  const directorUsersPageStartIndex = directorUsersTotal === 0 ? 0 : (safeDirectorUsersPage - 1) * DIRECTOR_USERS_PAGE_SIZE;
  const directorUsersPageEndIndex = Math.min(directorUsersPageStartIndex + DIRECTOR_USERS_PAGE_SIZE, directorUsersTotal);

  const paginatedDirectorUsers = useMemo(
    () => directorUsers.slice(directorUsersPageStartIndex, directorUsersPageEndIndex),
    [directorUsers, directorUsersPageStartIndex, directorUsersPageEndIndex],
  );

  const filteredStudentUsers = useMemo(() => {
    if (section !== "students") return [];

    return directorUsers.filter((user) => {
      if (studentsClassFilter === "all") return true;

      const related = (user.relatedLabel || "").toLowerCase();
      const className = classes.find((c) => c._id === studentsClassFilter)?.name?.toLowerCase() || "";
      return className ? related.includes(className) : true;
    });
  }, [classes, directorUsers, section, studentsClassFilter]);

  const filteredStudentUsersTotal = filteredStudentUsers.length;
  const filteredStudentUsersTotalPages = Math.max(1, Math.ceil(filteredStudentUsersTotal / STUDENTS_LIST_PAGE_SIZE));
  const safeFilteredStudentUsersPage = Math.min(directorUsersPage, filteredStudentUsersTotalPages);
  const filteredStudentUsersPageStart = filteredStudentUsersTotal === 0 ? 0 : (safeFilteredStudentUsersPage - 1) * STUDENTS_LIST_PAGE_SIZE;
  const filteredStudentUsersPageEnd = Math.min(filteredStudentUsersPageStart + STUDENTS_LIST_PAGE_SIZE, filteredStudentUsersTotal);

  const paginatedFilteredStudentUsers = useMemo(
    () => filteredStudentUsers.slice(filteredStudentUsersPageStart, filteredStudentUsersPageEnd),
    [filteredStudentUsers, filteredStudentUsersPageEnd, filteredStudentUsersPageStart],
  );

  const studentPaginationPages = useMemo(() => {
    const total = filteredStudentUsersTotalPages;
    const current = safeFilteredStudentUsersPage;

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }

    return [current - 2, current - 1, current, current + 1, current + 2];
  }, [filteredStudentUsersTotalPages, safeFilteredStudentUsersPage]);

  const fetchTimetableForClass = async (classId: string) => {
    if (!token || !classId) return;
    setLoadingTimetable(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/timetable?classId=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.scheduleLoad"));
      }
      const selectedClass = classes.find((c) => c._id === classId);
      const normalized = Array.isArray(data)
        ? data.map((entry: TimetableEntry) => ({
          ...entry,
          classId,
          className: selectedClass?.name || "",
        }))
        : [];
      setTimetableEntries(normalized);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.scheduleLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingTimetable(false);
    }
  };

  const fetchTimetableForAllClasses = async (targetClasses?: ClassRow[]) => {
    if (!token) return;

    const sourceClasses = Array.isArray(targetClasses) ? targetClasses : classes;
    if (sourceClasses.length === 0) {
      setTimetableEntries([]);
      return;
    }

    setLoadingTimetable(true);
    try {
      const allResults = await Promise.all(
        sourceClasses.map(async (cls) => {
          const res = await apiFetch(`${API_BASE_URL}/api/director/timetable?classId=${cls._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || t("errors.scheduleLoad"));
          }

          return (Array.isArray(data) ? data : []).map((entry: TimetableEntry) => ({
            ...entry,
            classId: cls._id,
            className: cls.name,
          }));
        }),
      );

      const merged = allResults
        .flat()
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

      setTimetableEntries(merged);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.scheduleLoadDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingTimetable(false);
    }
  };

  const refreshScheduleTimetable = async () => {
    if (!selectedTimetableClassId) return;
    if (selectedTimetableClassId === ALL_CLASSES_VALUE) {
      await fetchTimetableForAllClasses();
      return;
    }
    await fetchTimetableForClass(selectedTimetableClassId);
  };

  useEffect(() => {
    if (!token) return;

    void fetchOverview(true);
    const intervalId = window.setInterval(() => {
      void fetchOverview(true);
    }, 60_000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, locale]);

  useEffect(() => {
    if (section === "settings") {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          setDirectorPhotoUrl(u.photoUrl || null);
          setProfileForm(buildProfileFormFromAuth());
          setProfileEditMode(false);
        } catch {
          // ignore
        }
      }
    }
  }, [buildProfileFormFromAuth, section]);

  useEffect(() => {
    if (section !== "settings") {
      faceStreamRef.current?.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
      setFaceCameraOn(false);
    }

    const isPeopleSection = section === "teachers" || section === "students";
    const isAcademicSection = section === "classes" || section === "schedule" || section === "exams";

    const loadSectionData = async () => {
      if (section === "dashboard") {
        await fetchOverview();
      }

      if (isPeopleSection || isAcademicSection || section === "settings") {
        const tasks: Promise<void>[] = [];

        if (!loadedDirectorDataRef.current.subjects) {
          tasks.push(fetchSubjects());
        }
        if (!loadedDirectorDataRef.current.classes) {
          tasks.push(fetchClasses());
        }
        if ((isPeopleSection || section === "classes" || section === "schedule") && !loadedDirectorDataRef.current.teachers) {
          tasks.push(fetchTeachers());
        }
        if (section === "students" && !loadedDirectorDataRef.current.students) {
          tasks.push(fetchStudentsForParents());
        }
        if (tasks.length > 0) {
          await Promise.all(tasks);
        }
      }

      if (section === "exams" && !loadedDirectorDataRef.current.exams) {
        const classId = selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE
          ? selectedTimetableClassId
          : undefined;
        await fetchExams(classId);
      }

      if (section === "branches" && !loadedDirectorDataRef.current.branches && !isSchoolAdmin) {
        await fetchBranches();
        await fetchBranchRankings();
      }
    };

    void loadSectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, selectedTimetableClassId]);

  useEffect(() => {
    if (!token || section !== "dashboard") return;
    const plan = buildSchoolPlanContext(overview?.subscription ?? null, overview);
    if (!hasPlanFeature(plan, "attendanceReports")) {
      setDirectorAttendanceStatsSeries([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoadingDirectorAttendanceStats(true);
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/director/attendance/stats?range=${directorAttendanceStatsRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || t("attendanceStatsLoadError"));
        }
        if (!cancelled) {
          setDirectorAttendanceStatsSeries(Array.isArray(data.series) ? data.series : []);
          setDirectorAttendanceStatsBucket(data.bucket === "hour" ? "hour" : "day");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast({
            title: t("errorTitle"),
            description: err instanceof Error ? err.message : t("attendanceStatsLoadError"),
            variant: "destructive",
          });
          setDirectorAttendanceStatsSeries([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingDirectorAttendanceStats(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, section, directorAttendanceStatsRange, overview?.planFeatures?.attendanceReports]);

  useEffect(() => {
    if (section !== "school_admins" || isSchoolAdmin) return;
    void fetchSchoolAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isSchoolAdmin]);

  useEffect(() => {
    if (section !== "teachers" && section !== "students") return;

    if (section === "teachers" && directorUsersRoleFilter !== "all" && directorUsersRoleFilter !== "teacher") {
      setDirectorUsersRoleFilter("all");
      return;
    }

    if (section === "students" && directorUsersRoleFilter !== "student" && directorUsersRoleFilter !== "parent") {
      setDirectorUsersRoleFilter("student");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fetchDirectorUsers();
    }, 150);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, directorUsersRoleFilter, directorUsersSearch]);

  useEffect(() => {
    setDirectorUsersPage((prev) => Math.min(prev, directorUsersTotalPages));
  }, [directorUsersTotalPages]);

  useEffect(() => {
    if (section !== "students") return;
    setDirectorUsersPage((prev) => Math.min(prev, filteredStudentUsersTotalPages));
  }, [filteredStudentUsersTotalPages, section]);

  useEffect(() => {
    if (section !== "teachers" && section !== "students") return;
    setDirectorUsersPage(1);
  }, [section, directorUsersRoleFilter, directorUsersSearch]);

  useEffect(() => {
    if ((section !== "schedule" && section !== "exams") || !selectedTimetableClassId) return;

    if (section === "schedule") {
      if (selectedTimetableClassId === ALL_CLASSES_VALUE) {
        fetchTimetableForAllClasses();
      } else {
        fetchTimetableForClass(selectedTimetableClassId);
      }
      return;
    }

    const classId = selectedTimetableClassId !== ALL_CLASSES_VALUE ? selectedTimetableClassId : undefined;
    fetchExams(classId);

    if (selectedTimetableClassId === ALL_CLASSES_VALUE) {
      setClassInsights(null);
      return;
    }

    fetchClassInsights(selectedTimetableClassId, selectedClassInsightsStudentId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, selectedTimetableClassId, selectedClassInsightsStudentId, classes]);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }
    if (!teacherName || !teacherEmail || !teacherPassword || !teacherSubjectId) {
      toast({
        title: t("insufficientDataTitle"),
        description: t("validation.teacherRequired"),
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/teachers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: teacherName,
          email: teacherEmail,
          password: teacherPassword,
          subjectId: teacherSubjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.teacherCreate"));
      }
      toast({
        title: t("successTitle"),
        description: t("messages.teacherCreated"),
      });
      setTeacherDialogOpen(false);
      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherSubjectId("");
      await fetchTeachers();
      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.teacherCreateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }
    if (!studentName || !studentEmail || !studentPassword || !studentClassId) {
      toast({
        title: t("insufficientDataTitle"),
        description: t("validation.studentRequired"),
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: studentName,
          email: studentEmail,
          phone: studentPhone || undefined,
          parentName: studentParentName || undefined,
          password: studentPassword,
          classId: studentClassId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.studentCreate"));
      }
      toast({
        title: t("successTitle"),
        description: t("messages.studentCreated"),
      });
      setStudentDialogOpen(false);
      setStudentName("");
      setStudentEmail("");
      setStudentPhone("");
      setStudentParentName("");
      setStudentPassword("");
      setStudentClassId("");
      await fetchStudentsForParents();
      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.studentCreateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleAttachStudentToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }

    if (!attachStudentUserId || !attachAcademicYear || !attachEducationLanguage || !attachTargetClassId || !attachAdmissionOrderDate || !attachClassAcceptedDate) {
      toast({
        title: t("insufficientDataTitle"),
        description: "Barcha maydonlarni to'ldiring.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users/${attachStudentUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: attachTargetClassId,
          academicYear: attachAcademicYear,
          educationLanguage: attachEducationLanguage,
          admissionOrderDate: attachAdmissionOrderDate,
          classAcceptedDate: attachClassAcceptedDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "O'quvchini sinfga biriktirib bo'lmadi");
      }

      toast({
        title: t("savedTitle"),
        description: "O'quvchi sinfga muvaffaqiyatli biriktirildi.",
      });

      const attachedStudentId = studentsForParents.find((s) => s.userId === attachStudentUserId)?.id || "";
      setParentStudentId(attachedStudentId);
      setShowParentLoginAfterAttach(true);
      setAttachTargetClassId("");
      await fetchStudentsForParents();
      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "Biriktirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const selectedAttachStudent = useMemo(
    () => studentsForParents.find((s) => s.userId === attachStudentUserId),
    [attachStudentUserId, studentsForParents],
  );

  const attachedStudents = useMemo(
    () => studentsForParents.filter((s) => Boolean(s.userId) && (Boolean(s.classId) || Boolean((s.className || "").trim() && s.className !== "—"))),
    [studentsForParents],
  );

  const selectedAttachTargetClass = useMemo(
    () => classes.find((c) => c._id === attachTargetClassId),
    [attachTargetClassId, classes],
  );

  const handleDownloadStudentTemplate = () => {
    const headers = [
      "FISH",
      "Email",
      "Parol",
      "ID",
      "Tug'ilgan sana",
      "Jinsi",
      "Millati",
      "Guvohnoma seriya va raqami",
      "Sinf kodi",
      "Ta'lim tili",
      "O'quvchi holati",
      "Qabul buyruq raqami",
      "Qabul buyruq sanasi",
      "Shaxsiy telefon raqami",
      "Ota-ona yoki vasiy FISH",
      "Ota-ona yoki vasiy passporti",
      "Ota-ona yoki vasiy telefon raqami",
      "Viloyat",
      "Tuman",
      "To'liq manzil",
      "O'quv yili",
      "Sinfga qabul sanasi",
    ];
    const rows: string[][] = [];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((header) => ({ wch: Math.max(16, header.length + 4) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import shabloni");
    XLSX.writeFile(wb, "students-import-template.xlsx");
    toast({
      title: t("successTitle"),
      description: "Import shabloni Excel fayl sifatida yuklandi.",
    });
  };

  const convertImportFileToCsvFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".csv")) return file;

    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      throw new Error("Faqat Excel (.xlsx/.xls) yoki CSV fayl yuklash mumkin.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Excel faylda varaq topilmadi.");
    }
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
    return new File([csv], "students-import-template.csv", { type: "text/csv" });
  };

  const handleImportStudentsCsv = async (file: File) => {
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }

    setStudentImporting(true);
    try {
      const importFile = await convertImportFileToCsvFile(file);
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await apiFetch(`${API_BASE_URL}/api/director/students/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "O'quvchilarni import qilishda xatolik");
      }

      await Promise.all([
        fetchStudentsForParents(),
        fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch }),
        fetchOverview(),
      ]);

      const firstErrors = Array.isArray(data.errors)
        ? data.errors.slice(0, 3).map((err: { row: number; message: string }) => `${err.row}-qator: ${err.message}`).join("\n")
        : "";
      toast({
        title: data.failed > 0 ? "Import qisman bajarildi" : t("successTitle"),
        description: `Qo'shildi: ${data.created || 0}, xato: ${data.failed || 0}${firstErrors ? `\n${firstErrors}` : ""}`,
        variant: data.failed > 0 ? "destructive" : "default",
      });
    } catch (err) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : "O'quvchilarni import qilishda xatolik",
        variant: "destructive",
      });
    } finally {
      setStudentImporting(false);
    }
  };

  const handleExportStudentsBase = () => {
    const headers = [
      "FISH",
      "ID",
      "Tug'ilgan sana",
      "Jinsi",
      "Millati",
      "Guvohnoma seriya va raqami",
      "Sinf kodi",
      "Ta'lim tili",
      "O'quvchi holati",
      "Qabul buyruq raqami",
      "Qabul buyruq sanasi",
      "Shaxsiy telefon raqami",
      "Ota-ona yoki vasiy FISH",
      "Ota-ona yoki vasiy passporti",
      "Ota-ona yoki vasiy telefon raqami",
      "Viloyat",
      "Tuman",
      "To'liq manzil"
    ];
    const formatExportDate = (value?: string | null) => {
      if (!value) return "";
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(locale);
    };
    const genderLabel = (value?: string) => {
      if (value === "male") return "Erkak";
      if (value === "female") return "Ayol";
      return "";
    };
    const statusLabel = (value?: string) => {
      if (value === "active") return "O'quvchi";
      if (value === "inactive") return "Vaqtincha to'xtagan";
      if (value === "graduated") return "Bitirgan";
      return "";
    };
    const sortedStudents = [...studentsForParents].sort((a, b) =>
      decodeHtmlEntities(a.name || "").localeCompare(decodeHtmlEntities(b.name || ""), locale, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    const rows = sortedStudents.map((student) => [
      decodeHtmlEntities(student.name || ""),
      student.studentCode || student.id || "",
      formatExportDate(student.birthDate),
      genderLabel(student.gender),
      student.nationality || "",
      [student.birthCertSeries, student.birthCertNumber].filter(Boolean).join(" "),
      decodeHtmlEntities(student.className || ""),
      student.educationLanguage || "",
      statusLabel(student.status),
      student.admissionOrderNumber || "",
      formatExportDate(student.admissionOrderDate),
      student.phone || "",
      decodeHtmlEntities(student.parentName || ""),
      student.parentPassport || "",
      student.parentPhone || "",
      student.region || "",
      student.district || "",
      student.address || "",
    ]);

    // SheetJS orqali .xlsx fayl yaratish
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Ustun kengliklarini belgilash (masalan, har bir ustun uchun 20)
    // Ustunlar: A=25, D=28, F=28, N=28, qolganlari 20
    ws['!cols'] = headers.map((_, idx) => {
      // A=0, D=3, F=5, N=13
      if (idx === 0) return { wch: 27 }; // A
      if (idx === 3) return { wch: 28 }; // D
      if (idx === 5) return { wch: 28 }; // F
      if (idx === 13) return { wch: 28 }; // N
      return { wch: 20 };
    });

    // Header ustunlariga to'q ko'k rang (Excel default header) berish
    const headerFill = {
      patternType: "solid",
      fgColor: { rgb: "305496" }, // Excel default header color
    };
    headers.forEach((_, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
      if (!ws[cellRef]) return;
      ws[cellRef].s = {
        fill: headerFill,
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });

    // Workbook va faylni yuklash
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oquvchilar");
    XLSX.writeFile(wb, "Oquvchilar-bazasi.xlsx");

    toast({
      title: t("successTitle"),
      description: "O'quvchilar bazasi .xlsx faylga eksport qilindi.",
    });
  };

  const formatDateForInput = (dateValue?: string | null) => {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!selectedAttachStudent) {
      setAttachAcademicYear("");
      setAttachEducationLanguage("");
      setAttachAdmissionOrderDate("");
      setAttachClassAcceptedDate("");
      return;
    }

    setAttachAcademicYear(selectedAttachStudent.academicYear || "");
    setAttachEducationLanguage(selectedAttachStudent.educationLanguage || "");
    setAttachAdmissionOrderDate(formatDateForInput(selectedAttachStudent.admissionOrderDate));
    setAttachClassAcceptedDate(formatDateForInput(selectedAttachStudent.classAcceptedDate));
  }, [selectedAttachStudent]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSubjectName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.subjectCreate"));
      }
      toast({
        title: t("successTitle"),
        description: t("messages.subjectCreated"),
      });
      setNewSubjectName("");
      await fetchSubjects();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.subjectCreateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.classCreate"));
      }
      toast({
        title: t("successTitle"),
        description: t("messages.classCreated"),
      });
      setNewClassName("");
      await fetchClasses();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.classCreateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleCreateTimetableEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: t("errorTitle"),
        description: schoolManagerLoginMessage,
        variant: "destructive",
      });
      return;
    }

    if (!selectedTimetableClassId || selectedTimetableClassId === ALL_CLASSES_VALUE || !ttSubjectId || !ttTeacherId || !ttStartTime || !ttEndTime) {
      toast({
        title: t("insufficientDataTitle"),
        description: t("validation.scheduleRequired"),
        variant: "destructive",
      });
      return;
    }

    const isEditing = Boolean(editingTimetableEntryId);

    try {
      const res = await apiFetch(
        isEditing
          ? `${API_BASE_URL}/api/director/timetable/${editingTimetableEntryId}`
          : `${API_BASE_URL}/api/director/timetable`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            classId: selectedTimetableClassId,
            subjectId: ttSubjectId,
            teacherId: ttTeacherId,
            dayOfWeek: Number(ttDayOfWeek),
            startTime: ttStartTime,
            endTime: ttEndTime,
            room: ttRoom || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.scheduleSave"));
      }

      toast({
        title: t("successTitle"),
        description: isEditing ? t("messages.scheduleUpdated") : t("messages.scheduleCreated"),
      });

      if (isEditing) {
        setEditingTimetableEntryId(null);
      }
      setTtSubjectId("");
      setTtTeacherId("");
      setTtDayOfWeek("1");
      setTtStartTime("08:00");
      setTtEndTime("08:45");
      setTtRoom("");
      await refreshScheduleTimetable();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.scheduleSaveDesc"),
        variant: "destructive",
      });
    }
  };

  const handleEditTimetableEntry = (entry: TimetableEntry) => {
    if (entry.classId) {
      setSelectedTimetableClassId(entry.classId);
    }
    setEditingTimetableEntryId(entry.id);
    setTtDayOfWeek(String(entry.dayOfWeek));
    setTtStartTime(entry.startTime || "08:00");
    setTtEndTime(entry.endTime || "08:45");
    setTtRoom(entry.room || "");
    setTtSubjectId(entry.subjectId || "");
    setTtTeacherId(entry.teacherId || "");
  };

  const resetTimetableForm = () => {
    setEditingTimetableEntryId(null);
    setTtSubjectId("");
    setTtTeacherId("");
    setTtDayOfWeek("1");
    setTtStartTime("08:00");
    setTtEndTime("08:45");
    setTtRoom("");
  };

  const handleDeleteTimetableEntry = async (entryId: string) => {
    if (!token) return;
    if (!window.confirm(t("confirm.deleteTimetable"))) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/timetable/${entryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.scheduleDelete"));
      }
      toast({
        title: t("deleted"),
        description: t("messages.scheduleDeleted"),
      });
      await refreshScheduleTimetable();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.scheduleDeleteDesc"),
        variant: "destructive",
      });
    }
  };

  const openEditTeacher = (teacher: TeacherRow) => {
    setEditingTeacher(teacher);
    setEditName(teacher.name);
    setEditEmail(teacher.email);
    setEditPassword("");
    setEditSubjectId(teacher.subjectId || "");
    setEditDialogOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingTeacher) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/teachers/${editingTeacher.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
          subjectId: editSubjectId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.teacherUpdate"));
      }
      toast({
        title: t("savedTitle"),
        description: t("messages.teacherUpdated"),
      });
      setEditDialogOpen(false);
      setEditingTeacher(null);
      await fetchTeachers();
      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.teacherUpdateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeacher = async (teacher: TeacherRow) => {
    if (!token) return;
    if (!window.confirm(t("confirm.deleteTeacher"))) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/teachers/${teacher.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.teacherDelete"));
      }
      toast({
        title: t("deleted"),
        description: t("messages.teacherDeleted"),
      });
      await fetchTeachers();
      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.teacherDeleteDesc"),
        variant: "destructive",
      });
    }
  };

  const openDirectorUserDialog = async (userId: string) => {
    if (!token) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("errors.userLoad"));

      const loaded: DirectorManagedUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone ?? data.user?.phone ?? null,
        debtAmount: typeof data.debtAmount === "number" ? data.debtAmount : null,
        relatedLabel: data.relatedLabel,
        relatedId: data.relatedId || null,
        createdAt: data.createdAt,
      };

      setSelectedDirectorUser(loaded);
      setEditName(loaded.name);
      setEditEmail(loaded.email);
      setEditPhone(loaded.phone || "");
      setEditRelatedId(loaded.relatedId || "");
      setEditPassword("");
      setDirectorUserDialogOpen(true);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.userLoadDesc"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateDirectorUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDirectorUser) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users/${selectedDirectorUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          password: editPassword || undefined,
          classId: selectedDirectorUser.role === "student" ? (editRelatedId || undefined) : undefined,
          subjectId: selectedDirectorUser.role === "teacher" ? (editRelatedId || undefined) : undefined,
          studentId: selectedDirectorUser.role === "parent" ? (editRelatedId || undefined) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.userUpdate"));
      }

      toast({
        title: t("savedTitle"),
        description: t("messages.userUpdated"),
      });

      setDirectorUserDialogOpen(false);
      await fetchDirectorUsers();
      await fetchTeachers();
      await fetchStudentsForParents();
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.userUpdateDesc"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteDirectorUser = async () => {
    if (!token || !selectedDirectorUser) return;
    if (!window.confirm(t("confirm.deleteUser"))) return;

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/director/users/${selectedDirectorUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.userDelete"));
      }

      toast({
        title: t("deleted"),
        description: t("messages.userDeleted"),
      });

      setDirectorUserDialogOpen(false);
      setSelectedDirectorUser(null);
      await Promise.all([fetchDirectorUsers(), fetchTeachers(), fetchStudentsForParents(), fetchOverview()]);
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.userDeleteDesc"),
        variant: "destructive",
      });
    }
  };

  const handleProfileFieldChange = (key: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfileDetails = async () => {
    if (!token) return;

    const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
    if (!fullName || !profileForm.email.trim()) {
      toast({
        title: t("errorTitle"),
        description: t("profile.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    if (changePasswordEnabled) {
      if (!newProfilePassword.trim()) {
        toast({
          title: t("errorTitle"),
          description: "Yangi parolni kiriting.",
          variant: "destructive",
        });
        return;
      }
      if (newProfilePassword !== confirmProfilePassword) {
        toast({
          title: t("errorTitle"),
          description: "Parol tasdiqlash bilan mos emas.",
          variant: "destructive",
        });
        return;
      }
    }

    setSavingProfileDetails(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim() || null,
          password: changePasswordEnabled ? newProfilePassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.saveFailed"));
      }

      updateAuthUserInStorage({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
      });

      localStorage.setItem(
        "director_profile_meta",
        JSON.stringify({
          bio: profileForm.bio,
          gender: profileForm.gender,
          dateOfBirth: profileForm.dateOfBirth,
          nationalId: profileForm.nationalId,
          country: profileForm.country,
          cityState: profileForm.cityState,
          postalCode: profileForm.postalCode,
          taxId: profileForm.taxId,
        }),
      );

      setProfileEditMode(false);
      setChangePasswordEnabled(false);
      setNewProfilePassword("");
      setConfirmProfilePassword("");
      setShowProfilePassword(false);
      setShowProfilePasswordConfirm(false);
      setProfileForm((prev) => ({
        ...prev,
        firstName: data.name.split(" ")[0] || "",
        lastName: data.name.split(" ").slice(1).join(" "),
        email: data.email || "",
        phone: data.phone || "",
      }));

      toast({
        title: t("savedTitle"),
        description: t("messages.userUpdated"),
      });
    } catch (err) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingProfileDetails(false);
    }
  };

  const searchItems = [
    ...classes.map((c) => ({
      id: c._id,
      title: c.name,
      subtitle: tTable("class"),
      section: "classes" as const,
    })),
    ...branches.map((b) => ({
      id: b.id,
      title: b.name,
      subtitle: b.address || t("search.noAddress", { defaultValue: "Manzil yo'q" }),
      section: "branches" as const,
    })),
    ...subjects.map((s) => ({
      id: s._id,
      title: s.name,
      subtitle: tTable("subject"),
      section: "classes" as const,
    })),
    ...teachers.map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: `${t.email} • ${tTable("teacher")}`,
      section: "teachers" as const,
    })),
    ...studentsForParents.map((s) => ({
      id: s.id,
      title: s.name || t("analysis.student"),
      subtitle: `${s.className || t("search.noClass")}${s.email ? ` • ${s.email}` : ""}`,
      section: "students" as const,
    })),
    ...directorUsers.map((u) => ({
      id: u.id,
      title: u.name,
      subtitle: `${u.role} • ${u.email}`,
      section: u.role === "teacher" ? ("teachers" as const) : ("students" as const),
    })),
    ...timetableEntries.map((e) => ({
      id: e.id,
      title: `${e.subjectName} (${e.teacherName})`,
      subtitle: `${e.startTime}-${e.endTime}`,
      section: "schedule" as const,
    })),
  ];

  const directorSubscriptionInfo = buildSubscriptionHeaderInfo(overview?.subscription ?? null, {
    schoolId: currentUser?.schoolId ? String(currentUser.schoolId) : null,
  });

  const schoolPlan: SchoolPlanContext = useMemo(
    () => buildSchoolPlanContext(overview?.subscription ?? null, overview),
    [overview],
  );

  useEffect(() => {
    if (section === "payments" && !hasPlanFeature(schoolPlan, "finance")) {
      setSection("dashboard");
    }
  }, [section, schoolPlan]);

  const studentsHeaderTitle =
    studentsView === "attach"
      ? t("students.attachTitle")
      : studentsView === "base"
        ? t("students.baseTitle")
        : t("students.title");

  const studentsHeaderDescription =
    studentsView === "attach"
      ? t("students.attachDescription")
      : studentsView === "base"
        ? t("students.baseDescription")
        : t("students.description");

  return (
    <DirectorLayout
      currentSection={section}
      onSectionChange={(nextSection) => {
        setSection(nextSection as DirectorSection);
      }}
      currentStudentsView={studentsView}
      onStudentsViewChange={setStudentsView}
      headerNotifications={headerNotifications}
      searchItems={searchItems}
      subscriptionInfo={directorSubscriptionInfo}
    >
      <div className="space-y-8">
        {overview?.subscription && (overview.subscription.isExpired || (overview.subscription.daysLeft !== null && overview.subscription.daysLeft <= 7)) && (
          <Alert variant={overview.subscription.isExpired ? "destructive" : "default"} className={`border-l-4 ${overview.subscription.isExpired ? "bg-rose-50 border-l-rose-500" : "bg-amber-50 border-l-amber-500"}`}>
            {overview.subscription.isExpired ? <ShieldAlert className="h-5 w-5 text-rose-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
            <AlertTitle className={`font-bold ${overview.subscription.isExpired ? "text-rose-800" : "text-amber-800"}`}>
              {overview.subscription.isExpired ? t("subscriptionExpiredTitle") : t("subscriptionExpiringTitle")}
            </AlertTitle>
            <AlertDescription className={overview.subscription.isExpired ? "text-rose-700" : "text-amber-700"}>
              {overview.subscription.isExpired ? (
                <>
                  {t("subscriptionExpiredBody")}
                </>
              ) : (
                <>
                  {t("subscriptionExpiringBody", { days: overview.subscription.daysLeft || 0 })}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {section === "dashboard" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-gray-500 text-sm font-medium text-foreground">{t("statsFilterTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("statsFilterDesc")}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
                <div className="inline-flex rounded-full border bg-background p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatRange("today")}
                    className={`px-3 py-1 rounded-full ${statRange === "today" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                  >
                    {t("today")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatRange("week")}
                    className={`px-3 py-1 rounded-full ${statRange === "week" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                  >
                    {t("last7Days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatRange("month")}
                    className={`px-3 py-1 rounded-full ${statRange === "month" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                  >
                    {t("last30Days")}
                  </button>
                </div>
              </div>
            </div>

            <PlanFeatureGate
              plan={schoolPlan}
              feature="attendanceReports"
              title={t("planGate.attendanceTitle")}
              description={t("planGate.attendanceDesc")}
            >
              <TeacherAttendanceOverviewChart
                data={directorAttendanceStatsSeries}
                bucket={directorAttendanceStatsBucket}
                range={directorAttendanceStatsRange}
                onRangeChange={setDirectorAttendanceStatsRange}
                loading={loadingDirectorAttendanceStats}
                locale={locale}
                i18nNamespace="director-dashboard"
                chartKeyPrefix="attendanceChart"
                loadingTranslationKey="loading"
              />
            </PlanFeatureGate>

            {!overview ? (
              <>
                <StatsCardsSkeleton count={5} className="md:grid-cols-2 lg:grid-cols-4" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-5 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ListSkeleton rows={4} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ListSkeleton rows={3} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card
                    className="cursor-pointer transition hover:ring-2 hover:ring-primary/30"
                    onClick={() => setSection("classes")}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("classesAndParallels")}</CardTitle>
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview.classes}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{tStats("classesAndParallelsDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer transition hover:ring-2 hover:ring-primary/30"
                    onClick={() => setSection("teachers")}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("teachers")}</CardTitle>
                      <div className="rounded-lg bg-emerald-500/10 p-2">
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {overview.teacherStats ? overview.teacherStats[statRange] : overview.teachers}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{tStats("teachersDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer transition hover:ring-2 hover:ring-primary/30" onClick={() => setSection("students")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("students")}</CardTitle>
                      <div className="rounded-lg bg-violet-500/10 p-2">
                        <UserCircle className="h-4 w-4 text-violet-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {overview.studentStats ? overview.studentStats[statRange] : overview.students}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{tStats("studentsDesc")}</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("parents")}</CardTitle>
                      <div className="rounded-lg bg-amber-500/10 p-2">
                        <Users className="h-4 w-4 text-amber-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overview.parents}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{tStats("parentsDesc")}</p>
                    </CardContent>
                  </Card>

                  {hasPlanFeature(schoolPlan, "finance") ? (
                    <>
                      <div className="md:col-span-2 lg:col-span-4">
                        <p className=" text-gray-500 text-sm font-semibold text-foreground"> MOLIYAVIY FAOLLIK</p>
                      </div>

                      <DirectorOverviewFinancePie
                        monthIncome={overview.finance?.monthIncome ?? 0}
                        monthExpense={overview.finance?.monthExpense ?? 0}
                        formatMoney={formatMoney}
                        title={tStats("monthFinancePieTitle")}
                        description={tStats("monthFinancePieDesc")}
                        incomeLabel={tStats("monthIncome")}
                        expenseLabel={tStats("monthExpense")}
                        emptyMessage={tStats("monthFinancePieEmpty")}
                        netLabel={tStats("monthFinanceNetLabel")}
                        footerHint={tStats("monthFinancePieFooterHint")}
                        onOpenPayments={() => setSection("payments")}
                      />
                    </>
                  ) : null}
                </div>

                <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                  <Card className="flex h-[400px] flex-col overflow-hidden">
                    <CardHeader className="shrink-0 py-4">
                      <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
                      {overview.recentActivities.length > 0 ? (
                        overview.recentActivities.map((item, idx) => (
                        <div
                          key={`${item.type}-${idx}-${item.title}`}
                          className="border-b pb-2 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{item.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-[11px] capitalize border ${item.type === "teacher"
                                ? "border-emerald-500 bg-emerald-50 text-foreground"
                                : item.type === "student"
                                  ? "border-sky-500 bg-sky-50 text-foreground"
                                  : "border-amber-500 bg-amber-50 text-foreground"
                                }`}
                            >
                              {item.type === "teacher"
                                ? tStats("typeTeacher")
                                : item.type === "student"
                                  ? tStats("typeStudent")
                                  : tStats("typeParent")}
                            </Badge>
                          </div>
                          <p
                            className={`mt-0.5 text-[11px] font-medium ${item.type === "teacher"
                              ? "text-emerald-600"
                              : item.type === "student"
                                ? "text-sky-600"
                                : "text-amber-600"
                              }`}
                          >
                            {item.description}
                          </p>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("recentActivityEmpty")}</p>
                      )}
                    </CardContent>
                  </Card>

                  <PlanFeatureGate
                    plan={schoolPlan}
                    feature="analytics"
                    title={t("planGate.analyticsTitle")}
                    description={t("planGate.analyticsDesc")}
                  >
                    <DirectorDashboardAlertsPie alerts={overview.alerts} />
                  </PlanFeatureGate>
                </div>

                <PlanFeatureGate
                  plan={schoolPlan}
                  feature="analytics"
                  title={t("planGate.analyticsTitle")}
                  description={t("planGate.analyticsDesc")}
                >
                  <DirectorDashboardAreaChart series={overview.admissionTimeline} />
                </PlanFeatureGate>
              </>
            )}
          </>
        )}

        {(section === "classes" || section === "schedule" || section === "exams") && (
          <Card className={section === "schedule" ? "border-none bg-transparent shadow-none" : undefined}>
            {section !== "schedule" && (
              <CardHeader>
                <CardTitle>
                  {section === "classes" ? t("sectionClasses") : t("sectionExams")}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent
              className={`space-y-4 text-sm text-muted-foreground ${section === "schedule" ? "p-0" : ""}`}
            >
              {section === "classes" && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">{tTable("classes")}</h3>
                    {isSchoolAdmin ? (
                      <form onSubmit={handleCreateClass} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="class-name">{tTable("newClassName")}</Label>
                          <Input
                            id="class-name"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder={tTable("newClassExample")}
                            required
                          />
                        </div>
                        <Button type="submit" className="mt-2 sm:mt-0 sm:ml-2">
                          {tTable("addClass")}
                        </Button>
                      </form>
                    ) : null}
                    <div className="space-y-2">
                      {loadingClasses ? (
                        <ListSkeleton rows={4} />
                      ) : classes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {isSchoolAdmin
                            ? tTable("emptyClassesAdmin")
                            : tTable("emptyClasses")}
                        </p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {classes.map((c) => (
                            <li
                              key={c._id}
                              className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div className="flex items-start gap-3">
                                <span className="inline-flex min-w-[58px] items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                                  {c.name}
                                </span>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                    <span>
                                      {tTable("classTeacher")}:{" "}
                                      <span className="font-medium text-foreground">
                                        {c.classTeacherName || tTable("notAssigned")}
                                      </span>
                                    </span>
                                    <span>
                                      {tTable("studentsCount")}: <span className="font-medium text-foreground">{c.studentCount || 0}</span>
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{getClassTrendReason(c, tTable)}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-start gap-2 lg:flex-col lg:items-end">
                                <div className="text-xs text-muted-foreground">
                                  {tTable("rank")}:{" "}
                                  <span className="font-medium text-foreground">
                                    {c.monthlyRank ? tTable("rankPosition", { rank: c.monthlyRank }) : "—"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getClassTrendClassName(c.monthlyTrend)}`}
                                  >
                                    {getClassTrendLabel(c.monthlyTrend, tTable)}
                                  </span>
                                  {typeof c.monthlyGrowth === "number" && (
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      {c.monthlyGrowth > 0 ? "+" : ""}
                                      {c.monthlyGrowth.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSchoolAdmin && (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={c.classTeacherId || ""}
                                    onChange={async (e) => {
                                      const value = e.target.value;
                                      if (!token) return;
                                      try {
                                        const res = await apiFetch(
                                          `${API_BASE_URL}/api/director/classes/${c._id}`,
                                          {
                                            method: "PATCH",
                                            headers: {
                                              "Content-Type": "application/json",
                                              Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                              classTeacherId: value || undefined,
                                            }),
                                          },
                                        );
                                        const data = await res.json();
                                        if (!res.ok) {
                                          throw new Error(
                                            data.message || t("errors.classTeacherAssign"),
                                          );
                                        }
                                        setClasses((prev) =>
                                          prev.map((cls) =>
                                            cls._id === c._id
                                              ? {
                                                ...cls,
                                                classTeacherId: data.classTeacherId,
                                                classTeacherName: data.classTeacherName,
                                              }
                                              : cls,
                                          ),
                                        );
                                        toast({
                                          title: "Saqlandi",
                                          description: t("messages.classTeacherUpdated"),
                                        });
                                      } catch (err: unknown) {
                                        toast({
                                          title: t("errorTitle"),
                                          description:
                                            err instanceof Error
                                              ? err.message
                                              : t("errors.classTeacherAssign"),
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="flex h-8 w-40 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  >
                                    <option value="">{tTable("selectTeacher")}</option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">{tTable("subjects")}</h3>
                    {isSchoolAdmin ? (
                      <form onSubmit={handleCreateSubject} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="subject-name">{tTable("newSubjectName")}</Label>
                          <Input
                            id="subject-name"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder={tTable("newSubjectExample")}
                            required
                          />
                        </div>
                        <Button type="submit" className="mt-2 sm:mt-0 sm:ml-2">
                          {tTable("addSubject")}
                        </Button>
                      </form>
                    ) : null}
                    <div className="space-y-1">
                      {loadingSubjects ? (
                        <ListSkeleton rows={4} />
                      ) : subjects.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {isSchoolAdmin
                            ? tTable("emptySubjectsAdmin")
                            : tTable("emptySubjects")}
                        </p>
                      ) : (
                        <ul className="text-sm">
                          {subjects.map((s) => (
                            <li key={s._id} className="flex items-center justify-between border-b py-1.5">
                              <span>{s.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {section === "schedule" && (
                <Card>
                  <CardHeader className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{t("schedule.title")}</h3>
                      <CardDescription>{t("schedule.description")}</CardDescription>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="schedule-class">{tTable("class")}</Label>
                      <select
                        id="schedule-class"
                        value={selectedTimetableClassId}
                        onChange={(e) => {
                          setSelectedTimetableClassId(e.target.value);
                          resetTimetableForm();
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {isSchoolAdmin && <option value={ALL_CLASSES_VALUE}>{t("allClasses")}</option>}
                        <option value="">{tTable("selectClass")}</option>
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isSchoolAdmin && selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE && (
                      <form
                        onSubmit={handleCreateTimetableEntry}
                        className="grid gap-2 rounded-md border bg-muted/40 p-3 text-xs md:grid-cols-2 lg:grid-cols-3"
                      >
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-day">
                            {t("schedule.day")}
                          </label>
                          <select
                            id="tt-day"
                            value={ttDayOfWeek}
                            onChange={(e) => setTtDayOfWeek(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {dayOptions.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-subject">
                            {tTable("subject")}
                          </label>
                          <select
                            id="tt-subject"
                            value={ttSubjectId}
                            onChange={(e) => setTtSubjectId(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">{tTable("selectSubject")}</option>
                            {subjects.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-teacher">
                            {tTable("teacher")}
                          </label>
                          <select
                            id="tt-teacher"
                            value={ttTeacherId}
                            onChange={(e) => setTtTeacherId(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">{tTable("selectTeacherGeneric")}</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-start">
                            {t("schedule.startTime")}
                          </label>
                          <input
                            id="tt-start"
                            type="time"
                            value={ttStartTime}
                            onChange={(e) => setTtStartTime(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-end">
                            {t("schedule.endTime")}
                          </label>
                          <input
                            id="tt-end"
                            type="time"
                            value={ttEndTime}
                            onChange={(e) => setTtEndTime(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-muted-foreground" htmlFor="tt-room-admin">
                            {t("schedule.roomOptional")}
                          </label>
                          <input
                            id="tt-room-admin"
                            value={ttRoom}
                            onChange={(e) => setTtRoom(e.target.value)}
                            placeholder={t("schedule.roomExample")}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="submit" size="sm">
                              {editingTimetableEntryId ? t("schedule.saveEntry") : t("schedule.addEntry")}
                            </Button>
                            {editingTimetableEntryId && (
                              <Button type="button" variant="outline" size="sm" onClick={resetTimetableForm}>
                                {t("cancel")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </form>
                    )}

                    {isSchoolAdmin && selectedTimetableClassId === ALL_CLASSES_VALUE && (
                      <p className="text-xs text-muted-foreground">
                        {t("schedule.watchMode")}
                      </p>
                    )}

                    {!selectedTimetableClassId ? (
                      <p className="text-sm text-muted-foreground">{t("schedule.selectClassToView")}</p>
                    ) : loadingTimetable ? (
                      <div className="grid gap-3 md:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div key={idx} className="space-y-2 rounded-lg border bg-muted/40 p-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : timetableEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("schedule.empty")}</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-5">
                        {dayOptions.map((day, idx) => {
                          const lessons = timetableEntries
                            .filter((entry) => entry.dayOfWeek === Number(day.value))
                            .sort((a, b) => a.startTime.localeCompare(b.startTime));

                          return (
                            <motion.div
                              key={day.value}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`rounded-lg border bg-muted/40 p-2 ${Number(day.value) === todayDay ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-foreground">{day.label}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {lessons.length > 0 ? t("schedule.lessonsCount", { count: lessons.length }) : t("schedule.noLessons")}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {lessons.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground">{t("schedule.noLessonsThisDay")}</p>
                                ) : (
                                  lessons.map((lesson) => (
                                    <div key={lesson.id} className="rounded-md bg-background px-2 py-1.5 shadow-sm">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          {lesson.startTime} - {lesson.endTime}
                                        </span>
                                        {Number(day.value) === todayDay && (
                                          <Badge variant="outline" className="text-[10px]">{t("today")}</Badge>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-[11px] font-medium text-foreground line-clamp-2">
                                        {lesson.subjectName}
                                      </p>
                                      <div>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] border ${getClassBadgeClassName(lesson.classId, lesson.className)}`}
                                        >
                                          {lesson.className || t("schedule.unknownClass")}
                                        </Badge>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">{lesson.teacherName}</p>
                                      <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <p className="text-[10px] text-muted-foreground">
                                          {lesson.room ? t("schedule.roomWithValue", { room: lesson.room }) : t("schedule.roomNotSet")}
                                        </p>
                                        {isSchoolAdmin && (
                                          <div className="flex items-center gap-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => handleEditTimetableEntry(lesson)}
                                              title={tr("edit")}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-destructive hover:text-destructive"
                                              onClick={() => handleDeleteTimetableEntry(lesson.id)}
                                              title={tr("delete")}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {section === "exams" && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{t("exams.title")}</h3>
                        <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                            {t("exams.description")}
                        </p>
                      </div>

                      {isSchoolAdmin && (
                        <form
                          onSubmit={handleCreateExam}
                          className="grid gap-2 rounded-md border bg-muted/40 p-3 text-xs md:grid-cols-2 lg:grid-cols-3"
                        >
                          <div className="space-y-1">
                            <Label htmlFor="exam-title">{t("exams.examTitle")}</Label>
                            <Input
                              id="exam-title"
                              value={newExamTitle}
                              onChange={(e) => setNewExamTitle(e.target.value)}
                              placeholder={t("exams.examTitleExample")}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="exam-class">{tTable("class")}</Label>
                            <select
                              id="exam-class"
                              value={newExamClassId}
                              onChange={(e) => setNewExamClassId(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              required
                            >
                              <option value="">{tTable("selectClass")}</option>
                              {classes.map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="exam-subject">{tTable("subject")}</Label>
                            <select
                              id="exam-subject"
                              value={newExamSubjectId}
                              onChange={(e) => setNewExamSubjectId(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              required
                            >
                              <option value="">{tTable("selectSubject")}</option>
                              {subjects.map((s) => (
                                <option key={s._id} value={s._id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="exam-duration">{t("exams.duration")}</Label>
                            <Input
                              id="exam-duration"
                              type="number"
                              min={1}
                              max={600}
                              value={newExamDuration}
                              onChange={(e) => setNewExamDuration(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="exam-start">{t("schedule.startTime")}</Label>
                            <Input
                              id="exam-start"
                              type="datetime-local"
                              value={newExamStartTime}
                              onChange={(e) => setNewExamStartTime(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="exam-end">{t("schedule.endTime")}</Label>
                            <Input
                              id="exam-end"
                              type="datetime-local"
                              value={newExamEndTime}
                              onChange={(e) => setNewExamEndTime(e.target.value)}
                              required
                            />
                          </div>
                          <div className="md:col-span-2 lg:col-span-3">
                            <Button type="submit" size="sm" disabled={creatingExam}>
                              {creatingExam ? t("creating") : t("exams.create")}
                            </Button>
                          </div>
                        </form>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="exam-filter-class">{t("exams.classFilter")}</Label>
                          <select
                            id="exam-filter-class"
                            value={selectedTimetableClassId}
                            onChange={(e) => {
                              setSelectedTimetableClassId(e.target.value);
                              setSelectedClassInsightsStudentId("");
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {isSchoolAdmin && <option value={ALL_CLASSES_VALUE}>{t("allClasses")}</option>}
                            <option value="">{tTable("selectClass")}</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end justify-start md:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void fetchExams(selectedTimetableClassId && selectedTimetableClassId !== ALL_CLASSES_VALUE ? selectedTimetableClassId : undefined)}
                          >
                            {t("refresh")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("exams.table.title")}</TableHead>
                              <TableHead>{t("exams.table.class")}</TableHead>
                              <TableHead>{t("exams.table.subject")}</TableHead>
                              <TableHead>{t("exams.table.duration")}</TableHead>
                              <TableHead>{t("exams.table.timeRange")}</TableHead>
                              <TableHead>{t("exams.table.status")}</TableHead>
                              <TableHead className="text-right">{t("exams.table.action")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingExams ? (
                              <TableSkeleton rows={5} columns={7} />
                            ) : exams.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="h-16 text-center text-sm text-muted-foreground">
                                  {t("exams.empty")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              exams.map((exam) => {
                                const canDeleteExam = new Date(exam.endTime).getTime() <= Date.now();
                                return (
                                <TableRow key={exam.id}>
                                  <TableCell className="font-medium text-foreground">{exam.title}</TableCell>
                                  <TableCell>{exam.className || "—"}</TableCell>
                                  <TableCell>{exam.subjectName || "—"}</TableCell>
                                  <TableCell>{exam.duration} {t("exams.minuteShort")}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={exam.isPublished ? "default" : "outline"}>
                                      {exam.isPublished ? t("exams.active") : t("exams.draft")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-wrap justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void fetchExamResults(exam.id, exam.title)}
                                      >
                                        {t("exams.results")}
                                      </Button>
                                      {isSchoolAdmin && (
                                        <>
                                          <Button
                                            type="button"
                                            variant={exam.isPublished ? "secondary" : "default"}
                                            size="sm"
                                            disabled={publishingExamId === exam.id}
                                            onClick={() => void handleToggleExamPublish(exam)}
                                          >
                                            {publishingExamId === exam.id
                                              ? t("saving")
                                              : exam.isPublished
                                              ? t("exams.backToDraft")
                                              : t("exams.activate")}
                                          </Button>
                                          {canDeleteExam && (
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="sm"
                                              disabled={deletingExamId === exam.id}
                                              onClick={() => void handleDeleteExam(exam)}
                                            >
                                              {deletingExamId === exam.id ? t("deleting") : t("delete")}
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {selectedExamId && (
                        <div className="space-y-3 rounded-lg border bg-card p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-foreground">
                              {t("exams.resultsOf", { title: selectedExamTitle || t("exams.examFallback") })}
                            </h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExamId("");
                                setSelectedExamTitle("");
                                setExamResults([]);
                              }}
                            >
                              {t("close")}
                            </Button>
                          </div>

                          <div className="overflow-x-auto rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t("exams.resultsTable.student")}</TableHead>
                                  <TableHead>{t("exams.resultsTable.status")}</TableHead>
                                  <TableHead>{t("exams.resultsTable.score")}</TableHead>
                                  <TableHead>{t("exams.resultsTable.percent")}</TableHead>
                                  <TableHead>{t("exams.resultsTable.checked")}</TableHead>
                                  <TableHead>{t("exams.resultsTable.pending")}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {examResultsLoading ? (
                                  <TableSkeleton rows={5} columns={6} />
                                ) : examResults.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="h-16 text-center text-sm text-muted-foreground">
                                      {t("exams.resultsEmpty")}
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  examResults.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                      <TableCell>
                                        <div className="space-y-1">
                                          <p className="font-medium text-foreground">{attempt.studentName || "—"}</p>
                                          <p className="text-xs text-muted-foreground">{attempt.studentEmail || "—"}</p>
                                        </div>
                                      </TableCell>
                                      <TableCell>{attempt.status}</TableCell>
                                      <TableCell>
                                        {Number(attempt.score || 0)} / {Number(attempt.maxScore || 0)}
                                      </TableCell>
                                      <TableCell>{Number(attempt.gradePercent || 0)}%</TableCell>
                                      <TableCell>{Number(attempt.checkedAnswers || 0)}</TableCell>
                                      <TableCell>{Number(attempt.pendingManual || 0)}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="space-y-3">
                      <div>
                        <CardTitle>{t("analysis.title")}</CardTitle>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="class-insights-class">{tTable("class")}</Label>
                          <select
                            id="class-insights-class"
                            value={selectedTimetableClassId}
                            onChange={(e) => {
                              setSelectedTimetableClassId(e.target.value);
                              setSelectedClassInsightsStudentId("");
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {isSchoolAdmin && <option value={ALL_CLASSES_VALUE}>{t("allClasses")}</option>}
                            <option value="">{tTable("selectClass")}</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="class-insights-student">{t("analysis.student")}</Label>
                          <select
                            id="class-insights-student"
                            value={selectedClassInsightsStudentId}
                            onChange={(e) => setSelectedClassInsightsStudentId(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            disabled={!selectedTimetableClassId || selectedTimetableClassId === ALL_CLASSES_VALUE}
                          >
                            <option value="">{t("analysis.allStudents")}</option>
                            {classInsights?.studentRankings.map((student) => (
                              <option key={student.studentId} value={student.studentId || ""}>
                                {student.studentName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {loadingClassInsights ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, idx) => (
                              <div key={idx} className="rounded-lg border bg-card px-4 py-3">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="mt-2 h-5 w-24" />
                              </div>
                            ))}
                          </div>
                          <ListSkeleton rows={4} />
                        </div>
                      ) : !selectedTimetableClassId ? (
                        <p className="text-sm text-muted-foreground">{t("analysis.selectClass")}</p>
                      ) : selectedTimetableClassId === ALL_CLASSES_VALUE ? (
                        <p className="text-sm text-muted-foreground">
                          {t("analysis.selectSpecificClass")}
                        </p>
                      ) : classInsights?.selectedClass ? (
                        <>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border bg-card px-4 py-3">
                              <p className="text-xs text-muted-foreground">{tTable("class")}</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{classInsights.selectedClass.name}</p>
                            </div>
                            <div className="rounded-lg border bg-card px-4 py-3">
                              <p className="text-xs text-muted-foreground">{t("analysis.studentsCount")}</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">{classInsights.selectedClass.studentCount}</p>
                            </div>
                            <div className="rounded-lg border bg-card px-4 py-3">
                              <p className="text-xs text-muted-foreground">{tTable("classTeacher")}</p>
                              <p className="mt-1 text-lg font-semibold text-foreground">
                                {classInsights.selectedClass.classTeacherName || tTable("notAssigned")}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border bg-card">
                              <div className="border-b px-4 py-3">
                                <h3 className="font-medium text-foreground">{t("analysis.subjectRanking")}</h3>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("analysis.subject")}</TableHead>
                                    <TableHead>{t("analysis.averageGrade")}</TableHead>
                                    <TableHead>{t("analysis.gradesCount")}</TableHead>
                                    <TableHead>{t("analysis.bestStudent")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {classInsights.subjectRankings.length > 0 ? (
                                    classInsights.subjectRankings.map((subject) => (
                                      <TableRow key={subject.subjectId || subject.subjectName}>
                                        <TableCell className="font-medium">{subject.subjectName}</TableCell>
                                        <TableCell>{subject.averageGrade}</TableCell>
                                        <TableCell>{subject.gradesCount}</TableCell>
                                        <TableCell>{subject.bestStudentName || "—"}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                                        {t("analysis.noClassGrades")}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>

                            <div className="rounded-lg border bg-card">
                              <div className="border-b px-4 py-3">
                                <h3 className="font-medium text-foreground">{t("analysis.studentRanking")}</h3>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("analysis.student")}</TableHead>
                                    <TableHead>{t("analysis.averageGrade")}</TableHead>
                                    <TableHead>{t("analysis.gradesCount")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {classInsights.studentRankings.length > 0 ? (
                                    classInsights.studentRankings.map((student) => (
                                      <TableRow key={student.studentId || student.studentName}>
                                        <TableCell>
                                          <div className="space-y-1">
                                            <div className="font-medium text-foreground">{student.studentName}</div>
                                            <div className="text-xs text-muted-foreground">{student.email || "—"}</div>
                                          </div>
                                        </TableCell>
                                        <TableCell>{student.averageGrade}</TableCell>
                                        <TableCell>{student.gradesCount}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={3} className="h-20 text-center text-sm text-muted-foreground">
                                        {t("analysis.noStudentGrades")}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>

                          {classInsights.selectedStudent && (
                            <div className="rounded-lg border bg-card">
                              <div className="border-b px-4 py-3">
                                <h3 className="font-medium text-foreground">
                                  {t("analysis.studentSubjectsTitle", { student: classInsights.selectedStudent.studentName })}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t("analysis.studentSubjectsDesc")}
                                </p>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t("analysis.subject")}</TableHead>
                                    <TableHead>{t("analysis.averageGrade")}</TableHead>
                                    <TableHead>{t("analysis.bestGrade")}</TableHead>
                                    <TableHead>{t("analysis.lastGrade")}</TableHead>
                                    <TableHead>{t("analysis.gradesCount")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {classInsights.selectedStudent.subjectGrades.length > 0 ? (
                                    classInsights.selectedStudent.subjectGrades.map((subject) => (
                                      <TableRow key={subject.subjectId || subject.subjectName}>
                                        <TableCell className="font-medium">{subject.subjectName}</TableCell>
                                        <TableCell>{subject.averageGrade}</TableCell>
                                        <TableCell>{subject.bestGrade}</TableCell>
                                        <TableCell>{subject.lastGrade}</TableCell>
                                        <TableCell>{subject.gradesCount}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                                        Bu o&apos;quvchi uchun hali baholar mavjud emas.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Tanlangan sinf uchun tahlil topilmadi.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Dialog
                    open={Boolean(questionExamId)}
                    onOpenChange={(open) => {
                      if (!open) {
                        setQuestionExamId(null);
                        setQuestionExamTitle("");
                      }
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Savol qo&apos;shish: {questionExamTitle}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddQuestion} className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="q-text">Savol matni</Label>
                          <Input
                            id="q-text"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            placeholder="Savol matnini kiriting"
                            required
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label htmlFor="q-type">Savol turi</Label>
                            <select
                              id="q-type"
                              value={questionType}
                              onChange={(e) => setQuestionType(e.target.value as "test" | "text")}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="test">Test</option>
                              <option value="text">Matnli javob</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="q-points">Ball</Label>
                            <Input
                              id="q-points"
                              type="number"
                              min={1}
                              max={100}
                              value={questionPoints}
                              onChange={(e) => setQuestionPoints(e.target.value)}
                              required
                            />
                          </div>
                          {questionType === "test" && (
                            <div className="space-y-1">
                              <Label htmlFor="q-correct">To&apos;g&apos;ri javob</Label>
                              <select
                                id="q-correct"
                                value={correctOptionKey}
                                onChange={(e) => setCorrectOptionKey(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {questionType === "test" && (
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor="q-a">A varianti</Label>
                              <Input id="q-a" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="q-b">B varianti</Label>
                              <Input id="q-b" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="q-c">C varianti</Label>
                              <Input id="q-c" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="q-d">D varianti</Label>
                              <Input id="q-d" value={optionD} onChange={(e) => setOptionD(e.target.value)} />
                            </div>
                          </div>
                        )}

                        <DialogFooter>
                          <Button type="submit" disabled={addingQuestion}>
                            {addingQuestion ? "Saqlanmoqda..." : "Savolni qo&apos;shish"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {section === "school_admins" && !isSchoolAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-[18px] font-bold text-[#212b36]">{tUi("schoolAdminsTitle")}</CardTitle>
                <CardDescription className="text-sm font-medium text-[#FE9F43]">
                  {t("alertsMessages.noSchoolAdmin")}
                </CardDescription>
              </div>
              <Dialog open={schoolAdminDialogOpen} onOpenChange={setSchoolAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={schoolAdmins.length > 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tUi("addNewAdmin")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tUi("createSchoolAdminTitle")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSchoolAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-name">{t("form.name")}</Label>
                      <Input
                        id="school-admin-name"
                        value={schoolAdminName}
                        onChange={(e) => setSchoolAdminName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-email">{t("form.email")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="school-admin-email"
                          type="email"
                          value={schoolAdminEmail}
                          onChange={(e) => setSchoolAdminEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-phone">{t("phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="school-admin-phone"
                          value={schoolAdminPhone}
                          onChange={(e) => setSchoolAdminPhone(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-admin-password">{t("password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="school-admin-password"
                          type={showSchoolAdminPassword ? "text" : "password"}
                          value={schoolAdminPassword}
                          onChange={(e) => setSchoolAdminPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSchoolAdminPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSchoolAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={creatingSchoolAdmin}>
                        {creatingSchoolAdmin ? t("saving") : t("save")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("form.name")}</TableHead>
                    <TableHead>{t("form.email")}</TableHead>
                    <TableHead>{t("form.phone")}</TableHead>
                    <TableHead>{t("table.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schoolAdminsLoading ? (
                    <TableSkeleton rows={2} columns={4} />
                  ) : schoolAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                        {t("alertsMessages.noSchoolAdmin")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    schoolAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{admin.phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(locale) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {section === "branches" && !isSchoolAdmin && !selectedBranchDashboard && (
          <><Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-[18px] font-bold text-[#212b36]">Filiallar</CardTitle>
                <CardDescription className="text-sm font-medium text-[#FE9F43]">
                  Maktab filiallari ro'yxati va yangi filial qo'shish.
                </CardDescription>
              </div>
              <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Filial qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yangi filial</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateBranch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="branch-name">Filial nomi</Label>
                      <Input
                        id="branch-name"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branch-address">Manzil (ixtiyoriy)</Label>
                      <Input
                        id="branch-address"
                        value={branchAddress}
                        onChange={(e) => setBranchAddress(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={creatingBranch}>
                        {creatingBranch ? t("saving") : t("save")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filial</TableHead>
                    <TableHead>Manzil</TableHead>
                    <TableHead>Mas'ul</TableHead>
                    <TableHead>{t("table.createdAt")}</TableHead>
                    <TableHead className="w-[120px]">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchesLoading ? (
                    <TableSkeleton rows={2} columns={5} />
                  ) : branches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        Hozircha filial yo'q.
                      </TableCell>
                    </TableRow>
                  ) : (
                    branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell>{branch.address || "—"}</TableCell>
                        <TableCell>
                          {branch.managerUser ? (
                            <span className="text-sm">
                              {branch.managerUser.name}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({branch.managerUser.role === "school_admin" ? "Admin" : "O'qituvchi"})
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {branch.createdAt ? new Date(branch.createdAt).toLocaleDateString(locale) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedBranchAnalytics(null);
                                setBranchAnalyticsOpen(true);
                                void fetchBranchAnalytics(branch.id);
                              }}
                              title="Filial analitikasi"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedBranchDashboard({ id: branch.id, name: branch.name })}
                              title="Filial dashboardi"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditBranch(branch)}
                              title="Tahrirlash"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleAssignManager(branch)}
                              title="Mas'ul biriktirish"
                            >
                              <UserCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteBranch(branch)}
                              title="O'chirish"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Filial reytingi */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[16px] font-bold text-[#212b36] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Filial reytingi
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Filiallarning umumiy ko'rsatkichlar bo'yicha reytingi
                  </CardDescription>
                </div>
                {branchRankingsLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw className="h-3 w-3 animate-spin" />
                    Yangilanmoqda...
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead className="text-right">O'quvchilar</TableHead>
                    <TableHead className="text-right">O'qituvchilar</TableHead>
                    <TableHead className="text-right">Guruhlar</TableHead>
                    <TableHead className="text-right">Davomat</TableHead>
                    <TableHead className="text-right">Tushum (oy)</TableHead>
                    <TableHead className="text-right">Reyting</TableHead>
                    <TableHead className="w-16">Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchRankings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        {branchRankingsLoading ? "Yuklanmoqda..." : "Reyting ma'lumotlari mavjud emas."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    branchRankings.map((r, i) => {
                      const prevRank = i > 0 ? branchRankings[i - 1].rank : r.rank;
                      const isUp = i === 0 || r.rank < prevRank;
                      const isDown = i > 0 && r.rank > prevRank;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-bold text-lg">{r.rank}</TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right">{r.studentCount}</TableCell>
                          <TableCell className="text-right">{r.teacherCount}</TableCell>
                          <TableCell className="text-right">{r.classCount ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${r.attendanceRate >= 80 ? "text-emerald-600" : r.attendanceRate >= 60 ? "text-amber-600" : "text-red-600"}`}>
                              {r.attendanceRate ?? 0}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {(r.monthlyIncome ?? 0).toLocaleString()} so'm
                          </TableCell>
                          <TableCell className="text-right font-semibold">{r.score}</TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              {isUp ? (
                                <ChevronUp className="h-4 w-4 text-emerald-500" />
                              ) : isDown ? (
                                <ChevronDown className="h-4 w-4 text-red-500" />
                              ) : (
                                <Minus className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Branch Analytics Dialog */}
          <Dialog open={branchAnalyticsOpen} onOpenChange={setBranchAnalyticsOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Filial Analytics
                  {selectedBranchAnalytics && (
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      — {selectedBranchAnalytics.branch.name}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {branchAnalyticsLoading ? (
                <div className="py-12 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              ) : selectedBranchAnalytics ? (
                <div className="space-y-6">
                  {/* Students */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Talabalar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">{selectedBranchAnalytics.students.total}</p>
                          <p className="text-xs text-muted-foreground">Jami o'quvchilar</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{selectedBranchAnalytics.students.active}</p>
                          <p className="text-xs text-muted-foreground">Faol o'quvchilar</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-primary">{selectedBranchAnalytics.students.newThisMonth}</p>
                          <p className="text-xs text-muted-foreground">Yangi qo'shilganlar (oy)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teachers */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        O'qituvchilar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">{selectedBranchAnalytics.teachers.total}</p>
                          <p className="text-xs text-muted-foreground">Jami o'qituvchilar</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{selectedBranchAnalytics.teachers.active}</p>
                          <p className="text-xs text-muted-foreground">Faol o'qituvchilar</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Finance */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        Moliya
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{selectedBranchAnalytics.finance.monthIncome.toLocaleString()} so'm</p>
                          <p className="text-xs text-muted-foreground">Oylik tushum</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-destructive">{selectedBranchAnalytics.finance.nonPayers}</p>
                          <p className="text-xs text-muted-foreground">To'lov qilmaganlar</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-lg font-bold text-amber-600">{selectedBranchAnalytics.finance.debt.toLocaleString()} so'm</p>
                          <p className="text-xs text-muted-foreground">Qarzdorlik</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attendance */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Davomat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{selectedBranchAnalytics.attendance.averagePercent}%</p>
                        <p className="text-xs text-muted-foreground">O'rtacha davomat</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedBranchAnalytics.attendance.bestGroup && (
                          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{selectedBranchAnalytics.attendance.bestGroup.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedBranchAnalytics.attendance.bestGroup.percent}% — Eng faol guruh</p>
                          </div>
                        )}
                        {selectedBranchAnalytics.attendance.worstGroup && (
                          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{selectedBranchAnalytics.attendance.worstGroup.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedBranchAnalytics.attendance.worstGroup.percent}% — Eng past davomat</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Courses */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Kurslar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedBranchAnalytics.courses.popularCourse && (
                          <div className="rounded-lg bg-muted/40 p-3 text-center">
                            <p className="text-sm font-semibold text-foreground">{selectedBranchAnalytics.courses.popularCourse.name}</p>
                            <p className="text-xs text-muted-foreground">Eng ommabop kurs</p>
                            {selectedBranchAnalytics.courses.popularCourse.teacherName && (
                              <p className="text-xs text-muted-foreground mt-1">{selectedBranchAnalytics.courses.popularCourse.teacherName}</p>
                            )}
                          </div>
                        )}
                        <div className="rounded-lg bg-muted/40 p-3 text-center">
                          <p className="text-2xl font-bold text-foreground">{selectedBranchAnalytics.courses.totalGroups}</p>
                          <p className="text-xs text-muted-foreground">Guruhlar soni</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Recommendations (Pro / Premium) */}
                  {selectedBranchAnalytics.aiRecommendations.length > 0 && (
                    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${selectedBranchAnalytics.isPremium ? "border-purple-400/30 from-purple-500/5" : ""}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {selectedBranchAnalytics.isPremium ? (
                            <Sparkles className="h-4 w-4 text-purple-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          {selectedBranchAnalytics.isPremium ? "AI Powered Tahlil" : "AI Tavsiyalari"}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ml-auto ${selectedBranchAnalytics.isPremium ? "border-purple-400 text-purple-600 dark:text-purple-400" : ""}`}
                          >
                            {selectedBranchAnalytics.isPremium ? "Premium" : "Pro"}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {selectedBranchAnalytics.isPremium
                            ? "Kengaytirilgan AI tahlil va prognozlar"
                            : "Asosiy tahlillar va tavsiyalar"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedBranchAnalytics.aiRecommendations.map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              {selectedBranchAnalytics.isPremium ? (
                                <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                              ) : (
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              )}
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

          {/* Edit dialog */}
          <Dialog open={editBranchDialogOpen} onOpenChange={setEditBranchDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filialni tahrirlash</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveBranchEdit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-branch-name">Filial nomi</Label>
                  <Input
                    id="edit-branch-name"
                    value={editBranchName}
                    onChange={(e) => setEditBranchName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-branch-address">Manzil (ixtiyoriy)</Label>
                  <Input
                    id="edit-branch-address"
                    value={editBranchAddress}
                    onChange={(e) => setEditBranchAddress(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={savingBranchEdit}>
                    {savingBranchEdit ? t("saving") : t("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Assign manager dialog */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Mas'ul biriktirish — {assigningBranch?.name || ""}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-user">Mas'ul foydalanuvchi</Label>
                  <select
                    id="assign-user"
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Mas'ul yo'q</option>
                    {assignableUsersLoading ? (
                      <option disabled>Yuklanmoqda...</option>
                    ) : (
                      assignableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} {u.phone ? `— ${u.phone}` : ""} ({u.role === "school_admin" ? "Admin" : "O'qituvchi"})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveAssignManager} disabled={savingBranchAssignment}>
                    {savingBranchAssignment ? t("saving") : t("save")}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
          </>)}

          {/* Branch Dashboard (individual) */}
          {section === "branches" && !isSchoolAdmin && selectedBranchDashboard && (
            <div className="pb-6">
              <BranchDashboard
                branchId={selectedBranchDashboard.id}
                branchName={selectedBranchDashboard.name}
                schoolPlan={schoolPlan}
                onBack={() => setSelectedBranchDashboard(null)}
              />
            </div>
          )}

        {(section === "teachers" || section === "students") && (
          <Card>

            {section === "teachers" && (
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-[#212b36] text-bold text-[18px]">O'qituvchilar ro'yxati</CardTitle>
                  <CardDescription className="text-[#FE9F43] font-medium gap-1 md:text-[12px] md:text-sm">Maktabingizdagi o'qituvchilar ro'yxati.</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isSchoolAdmin && (
                    <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">Yangi o&apos;qituvchi qo&apos;shish</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("dialogs.createTeacherTitle")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTeacher} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="teacher-name">{t("form.name")}</Label>
                            <Input
                              id="teacher-name"
                              value={teacherName}
                              onChange={(e) => setTeacherName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="teacher-email">{t("form.email")}</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="teacher-email"
                                type="email"
                                value={teacherEmail}
                                onChange={(e) => setTeacherEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="teacher-password">{t("password")}</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="teacher-password"
                                type={showTeacherPassword ? "text" : "password"}
                                value={teacherPassword}
                                onChange={(e) => setTeacherPassword(e.target.value)}
                                className="pl-10 pr-10"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowTeacherPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showTeacherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="teacher-subject">{tTable("subject")}</Label>
                            <select
                              id="teacher-subject"
                              value={teacherSubjectId}
                              onChange={(e) => setTeacherSubjectId(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="">{tTable("selectSubject")}</option>
                              {subjects.map((subj) => (
                                <option key={subj._id} value={subj._id}>
                                  {subj.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <DialogFooter>
                            <Button type="submit">{t("save")}</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
            )}
            <CardContent className="space-y-8">
              {section === "students" && (
                <CardHeader className="space-y-4 ">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="student">
                      <CardTitle className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{studentsHeaderTitle}</CardTitle>
                      <CardDescription className="flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-[12px] md:text-sm">{studentsHeaderDescription}</CardDescription>
                    </div>
                    {isSchoolAdmin && (studentsView === "base" || studentsView === "list") && (
                      <>
                        <input
                          ref={studentImportInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            void handleImportStudentsCsv(file);
                            e.currentTarget.value = "";
                          }}
                        />

                        <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                          {studentsView === "base" ? (
                            <div className="flex w-full flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-1 lg:w-auto">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-10 shrink-0"
                                onClick={async () => {
                                  await Promise.all([
                                    fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch }),
                                    fetchStudentsForParents(),
                                  ]);
                                }}
                                title="Yangilash"
                              >
                                <RotateCcw className="h-5 w-5" />
                              </Button>

                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-9 w-10 shrink-0"
                                onClick={() => setStudentsBaseFiltersOpen((prev) => !prev)}
                                title="Filtrlarni yig'ish/ochish"
                              >
                                <ChevronUp className={`h-4 w-4 transition-transform ${studentsBaseFiltersOpen ? "" : "rotate-180"}`} />
                              </Button>

                              <PlanFeatureLockedOverlay locked={schoolPlan.planName === "Standard"} inline buttonLock>
                                <Button
                                  type="button"
                                  className="h-9 shrink-0 bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
                                  disabled={studentImporting}
                                  onClick={() => studentImportInputRef.current?.click()}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  {studentImporting ? "Import qilinmoqda..." : "Import"}
                                </Button>
                              </PlanFeatureLockedOverlay>

                              <Button
                                type="button"
                                className="h-9 w-10 shrink-0 bg-emerald-600 px-0 text-white hover:bg-emerald-700"
                                onClick={handleExportStudentsBase}
                                title="Eksport"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </Button>

                              <PlanFeatureLockedOverlay locked={schoolPlan.planName === "Standard"} inline buttonLock>
                                <Button
                                  type="button"
                                  className="h-9 shrink-0 bg-orange-500 px-4 text-sm text-white hover:bg-orange-600"
                                  onClick={handleDownloadStudentTemplate}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Import shabloni
                                </Button>
                              </PlanFeatureLockedOverlay>

                              <Link to="/school-admin/dashboard/add-student">
                                <Button className="h-9 shrink-0 bg-emerald-700 px-4 text-sm text-white hover:bg-emerald-800">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Qo&apos;shish
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <DialogTrigger asChild>
                              <Button size="sm" className="self-start">{t("students.add")}</Button>
                            </DialogTrigger>
                          )}

                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("dialogs.createStudentTitle")}</DialogTitle>
                            <CardDescription>{t("dialogs.createStudentDescription")}</CardDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="student-name">{t("form.name")}</Label>
                              <Input
                                id="student-name"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder={t("form.studentNameExample")}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="student-email">{t("form.email")}</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="student-email"
                                  type="email"
                                  value={studentEmail}
                                  onChange={(e) => setStudentEmail(e.target.value)}
                                  className="pl-10"
                                  placeholder={t("form.studentEmailExample")}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="student-password">{t("password")}</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="student-password"
                                  type={showStudentPassword ? "text" : "password"}
                                  value={studentPassword}
                                  onChange={(e) => setStudentPassword(e.target.value)}
                                  className="pl-10 pr-10"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowStudentPassword((prev) => !prev)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showStudentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="student-phone">{t("phone")}</Label>
                              <Input
                                id="student-phone"
                                value={studentPhone}
                                onChange={(e) => setStudentPhone(e.target.value)}
                                placeholder={t("form.phoneExampleSpaced")}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="student-parent-name">{t("parents.parentName")}</Label>
                              <Input
                                id="student-parent-name"
                                value={studentParentName}
                                onChange={(e) => setStudentParentName(e.target.value)}
                                placeholder={t("parents.parentNameExample")}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="student-class">{tTable("class")}</Label>
                              <select
                                id="student-class"
                                value={studentClassId}
                                onChange={(e) => setStudentClassId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                required
                              >
                                <option value="">{tTable("selectClass")}</option>
                                {classes.map((c) => (
                                  <option key={c._id} value={c._id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <DialogFooter>
                              <Button type="submit">{t("students.create")}</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </CardHeader>
              )}

              {section === "students" && (studentsView === "base" || studentsView === "list") && (
                <CardContent className="p-0">
                  <div className="space-y-3">

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        // Sizning qidiruv logikangiz shu yerga ulanadi.
                      }}
                      onReset={(e) => {
                        e.preventDefault();
                        setDirectorUsersSearch("");
                        setStudentsClassFilter("all");
                        setDirectorUsersRoleFilter("student");
                        setDirectorUsersPage(1);
                      }}
                      className="rounded-xl border bg-background"
                    >
                      {studentsBaseFiltersOpen && (
                        <div className="grid gap-3 border-b p-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-search">Qidirish</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="student-search"
                              name="q"
                              value={directorUsersSearch}
                              onChange={(e) => {
                                setDirectorUsersSearch(e.target.value);
                                setDirectorUsersPage(1);
                              }}
                              placeholder="O&apos;quvchi to&apos;liq ismi va IDsi,"
                              className="h-11 pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-class">Sinf</Label>
                          <select
                            id="student-class"
                            value={studentsClassFilter}
                            onChange={(e) => {
                              setStudentsClassFilter(e.target.value);
                              setDirectorUsersPage(1);
                            }}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="all">Barcha sinflar</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-status">Holati</Label>
                          <select
                            id="student-status"
                            value={directorUsersRoleFilter}
                            onChange={(e) => {
                              const value = e.target.value as "student" | "parent";
                              setDirectorUsersRoleFilter(value);
                              setDirectorUsersPage(1);
                            }}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="student">O&apos;quvchilar</option>
                            <option value="parent">Ota-ona / Vasiylar</option>
                          </select>
                        </div>

                        <div className="flex items-end gap-3 lg:justify-end">
                          <Button type="reset" variant="secondary" className="h-11 px-4">
                            <Eraser className="mr-2 h-4 w-4" />
                            Tozalash
                          </Button>
                        </div>
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[56px]">#</TableHead>
                              <TableHead>FISH</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Aloqa</TableHead>
                              <TableHead>Ota-ona ismi</TableHead>
                              <TableHead>SINF</TableHead>
                              <TableHead>Qo&apos;shimcha</TableHead>
                              <TableHead>Yaratilgan</TableHead>
                              {isSchoolAdmin && <TableHead className="text-right">Amallar</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {directorUsersLoading ? (
                              <TableSkeleton rows={5} columns={isSchoolAdmin ? 8 : 7} />
                            ) : paginatedFilteredStudentUsers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={isSchoolAdmin ? 8 : 7} className="h-24 text-center text-sm text-muted-foreground">
                                  {t("users.notFound")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedFilteredStudentUsers.map((user, index) => (
                                <TableRow key={user.id}>
                                  <TableCell>{filteredStudentUsersPageStart + index + 1}</TableCell>
                                  <TableCell>
                                    <div className="font-medium text-foreground">{decodeHtmlEntities(user.name)}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {user.role === "student" ? "O'quvchi" : "Ota-ona"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm text-muted-foreground">{user.phone || "—"}</div>
                                  </TableCell>
                                  <TableCell>
                                    {decodeHtmlEntities(user.parentName) || (user.role === "student" ? "Bog'lanmagan" : "—")}
                                  </TableCell>
                                  <TableCell>{decodeHtmlEntities(user.relatedLabel) || "—"}</TableCell>
                                  <TableCell>{typeof user.debtAmount === "number" ? `${Math.round(user.debtAmount)} so'm` : "—"}</TableCell>
                                  <TableCell>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : "—"}
                                  </TableCell>
                                  {isSchoolAdmin && (
                                    <TableCell className="text-right">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openDirectorUserDialog(user.id)}
                                        title={tr("edit")}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t px-3 py-3 text-sm">
                        <p className="text-muted-foreground">
                          {filteredStudentUsersTotal === 0
                            ? "0-0"
                            : `${filteredStudentUsersPageStart + 1}-${filteredStudentUsersPageEnd}`} / Jami: {filteredStudentUsersTotal}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            disabled={safeFilteredStudentUsersPage <= 1}
                            onClick={() => setDirectorUsersPage((prev) => Math.max(1, prev - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>

                          {studentPaginationPages.map((page) => (
                            <Button
                              key={page}
                              type="button"
                              variant={safeFilteredStudentUsersPage === page ? "default" : "outline"}
                              size="icon"
                              className="h-9 w-9 rounded-full"
                              onClick={() => setDirectorUsersPage(page)}
                            >
                              {page}
                            </Button>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            disabled={safeFilteredStudentUsersPage >= filteredStudentUsersTotalPages}
                            onClick={() => setDirectorUsersPage((prev) => Math.min(filteredStudentUsersTotalPages, prev + 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </CardContent>
              )}

              {section === "teachers" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("form.name")}</TableHead>
                      <TableHead>{t("form.email")}</TableHead>
                      <TableHead>{tTable("subject")}</TableHead>
                      <TableHead>{t("table.classes")}</TableHead>
                      {isSchoolAdmin && <TableHead className="w-[140px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTeachers ? (
                      <TableSkeleton rows={5} columns={isSchoolAdmin ? 5 : 4} />
                    ) : teachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSchoolAdmin ? 5 : 4} className="py-6 text-center text-sm text-muted-foreground">
                          {t("teachers.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      teachers.map((teacherRow) => (
                        <TableRow key={teacherRow.id}>
                          <TableCell className="font-medium">{teacherRow.name}</TableCell>
                          <TableCell>{teacherRow.email}</TableCell>
                          <TableCell>{teacherRow.subjectName || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {teacherRow.classes && teacherRow.classes.length > 0 ? (
                                teacherRow.classes.map((cls) => (
                                  <Badge key={cls.id} variant="secondary" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                                    {cls.name} ({cls.studentCount})
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          </TableCell>
                          {isSchoolAdmin && (
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditTeacher(teacherRow)}
                                  title={tr("edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteTeacher(teacherRow)}
                                  title={tr("delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {isSchoolAdmin && section === "students" && studentsView === "attach" && (
                <div className="mt-6 border-t pt-4">
                  <div className="mb-6 rounded-2xl bg-card p-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                      <div className="rounded-[5px] border bg-muted/10 p-4">
                        <h3 className="text-sm font-semibold text-foreground">Biriktirilgan o&apos;quvchilar ro&apos;yxati</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Tartib raqami bilan biriktirilgan o&apos;quvchilar.</p>
                        {loadingStudentsForParents ? (
                          <div className="mt-4">
                            <ListSkeleton rows={4} />
                          </div>
                        ) : attachedStudents.length === 0 ? (
                          <p className="mt-4 text-xs text-muted-foreground">Hozircha biriktirilgan o&apos;quvchilar yo&apos;q.</p>
                        ) : (
                          <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
                            <ul className="space-y-2">
                              {attachedStudents.map((s, index) => {
                                if (!s.userId) return null;
                                return (
                                  <li key={s.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAttachStudentUserId(s.userId || "");
                                        setShowParentLoginAfterAttach(false);
                                        setParentStudentId("");
                                      }}
                                      className={`w-full rounded-[5px] border bg-background p-3 text-left transition ${attachStudentUserId === s.userId ? "border-primary/60 ring-1 ring-primary/30" : "border-border hover:border-primary/30"}`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                                          {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-foreground">{decodeHtmlEntities(s.name) || "—"}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {decodeHtmlEntities(s.className) || "Sinf biriktirilmagan"}
                                            {s.academicYear ? ` • ${s.academicYear}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>

                      <form
                        onSubmit={handleAttachStudentToClass}
                        onReset={(e) => {
                          e.preventDefault();
                          setAttachStudentUserId("");
                          setAttachTargetClassId("");
                          setAttachAcademicYear("");
                          setAttachEducationLanguage("");
                          setAttachAdmissionOrderDate("");
                          setAttachClassAcceptedDate("");
                          setShowParentLoginAfterAttach(false);
                          setParentStudentId("");
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="attach-student">O&apos;quvchi</Label>
                          <select
                            id="attach-student"
                            value={attachStudentUserId}
                            onChange={(e) => {
                              setAttachStudentUserId(e.target.value);
                              setShowParentLoginAfterAttach(false);
                              setParentStudentId("");
                            }}
                            className="flex h-11 w-full rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                          >
                            <option value="">Tanlang</option>
                            {loadingStudentsForParents ? (
                              <option value="" disabled>{t("loading")}</option>
                            ) : (
                              studentsForParents.filter((s) => Boolean(s.userId)).map((s) => (
                                <option key={s.id} value={s.userId}>
                                  {decodeHtmlEntities(s.name) || "—"}
                                  {s.className ? ` (${decodeHtmlEntities(s.className)})` : ""}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-academic-year">O&apos;quv yili</Label>
                          <Input
                            id="attach-academic-year"
                            value={attachAcademicYear}
                            onChange={(e) => setAttachAcademicYear(e.target.value)}
                            placeholder="2025-2026"
                            className="rounded-[5px]"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-education-language">Ta&apos;lim tili</Label>
                          <select
                            id="attach-education-language"
                            value={attachEducationLanguage}
                            onChange={(e) => setAttachEducationLanguage(e.target.value)}
                            className="flex h-11 w-full rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                          >
                            <option value="">Tanlang</option>
                            <option value="uzbek">O&apos;zbek</option>
                            <option value="russian">Rus</option>
                            <option value="english">Ingliz</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-current-class">Sinf</Label>
                          <Input
                            id="attach-current-class"
                            value={selectedAttachStudent?.className || "—"}
                            className="rounded-[5px]"
                            readOnly
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-target-class">Biriktirilgan sinf</Label>
                          <select
                            id="attach-target-class"
                            value={attachTargetClassId}
                            onChange={(e) => setAttachTargetClassId(e.target.value)}
                            className="flex h-11 w-full rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                          >
                            <option value="">Tanlang</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-target-class-count">O&apos;quvchilar soni</Label>
                          <Input
                            id="attach-target-class-count"
                            value={selectedAttachTargetClass?.studentCount ?? 0}
                            className="rounded-[5px]"
                            readOnly
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-order-date">Qabul buyrug&apos;i sanasi</Label>
                          <Input
                            id="attach-order-date"
                            type="date"
                            value={attachAdmissionOrderDate}
                            onChange={(e) => setAttachAdmissionOrderDate(e.target.value)}
                            className="rounded-[5px]"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-accepted-date">O&apos;quvchini sinfga qabul qilish sanasi</Label>
                          <Input
                            id="attach-accepted-date"
                            type="date"
                            value={attachClassAcceptedDate}
                            onChange={(e) => setAttachClassAcceptedDate(e.target.value)}
                            className="rounded-[5px]"
                            required
                          />
                        </div>

                        {selectedAttachStudent && (
                          <div className="rounded-[5px] border bg-muted/20 p-4">
                          <h4 className="text-sm font-semibold text-foreground">Joriy biriktirilgan ma&apos;lumot</h4>
                          <div className="mt-3 grid gap-3 text-xs md:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-muted-foreground">O&apos;quvchi</p>
                              <p className="font-medium text-foreground">{decodeHtmlEntities(selectedAttachStudent.name) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Biriktirilgan sinf</p>
                              <p className="font-medium text-foreground">{decodeHtmlEntities(selectedAttachStudent.className) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">O&apos;quv yili</p>
                              <p className="font-medium text-foreground">{selectedAttachStudent.academicYear || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ta&apos;lim tili</p>
                              <p className="font-medium text-foreground">{selectedAttachStudent.educationLanguage || "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Qabul buyrug&apos;i sanasi</p>
                              <p className="font-medium text-foreground">
                                {selectedAttachStudent.admissionOrderDate
                                  ? new Date(selectedAttachStudent.admissionOrderDate).toLocaleDateString(locale)
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sinfga qabul sanasi</p>
                              <p className="font-medium text-foreground">
                                {selectedAttachStudent.classAcceptedDate
                                  ? new Date(selectedAttachStudent.classAcceptedDate).toLocaleDateString(locale)
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                          <Button type="reset" variant="secondary" className="h-11 px-6 rounded-[5px]">
                            Tozalash
                          </Button>
                          <Button type="submit" className="h-11 px-6 rounded-[5px]">
                            Biriktirish
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {showParentLoginAfterAttach && (
                    <>
                      <div className="mb-3 mt-2">
                        <h3 className="text-sm font-medium text-foreground">{t("parents.createLoginTitle")}</h3>
                        <p className="text-xs text-muted-foreground">
                          {t("parents.createLoginDescription")}
                        </p>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!token) {
                            toast({
                              title: t("errorTitle"),
                              description: schoolManagerLoginMessage,
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!parentStudentId || !parentName || !parentEmail || !parentPhone || !parentPassword) {
                            toast({
                              title: t("insufficientDataTitle"),
                              description: t("validation.parentRequired"),
                              variant: "destructive",
                            });
                            return;
                          }
                          try {
                            const res = await apiFetch(`${API_BASE_URL}/api/director/parents`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                name: parentName,
                                email: parentEmail,
                                phone: parentPhone,
                                password: parentPassword,
                                studentId: parentStudentId,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.message || t("errors.parentCreate"));
                            }
                            toast({
                              title: t("successTitle"),
                              description: t("messages.parentCreated"),
                            });
                            setParentStudentId("");
                            setParentName("");
                            setParentEmail("");
                            setParentPhone("");
                            setParentPassword("");
                            setDirectorUsersSearch("");
                            setDirectorUsersRoleFilter("parent");
                            await fetchDirectorUsers({ role: "parent", search: "" });
                            await fetchOverview();
                          } catch (err: unknown) {
                            toast({
                              title: t("errorTitle"),
                              description:
                                err instanceof Error ? err.message : t("errors.parentCreateDesc"),
                              variant: "destructive",
                            });
                          }
                        }}
                        className="grid gap-3 text-xs md:grid-cols-2 lg:grid-cols-3"
                      >
                    <div className="space-y-1">
                      <Label className="text-[11px]" htmlFor="parent-student">
                        {t("analysis.student")}
                      </Label>
                      <select
                        id="parent-student"
                        value={parentStudentId}
                        onChange={(e) => setParentStudentId(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">{t("parents.selectStudent")}</option>
                        {loadingStudentsForParents ? (
                          <option value="">{t("loading")}</option>
                        ) : (
                          studentsForParents.map((s) => (
                            <option key={s.id} value={s.id}>
                              {decodeHtmlEntities(s.name)} {s.className ? `(${decodeHtmlEntities(s.className)})` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]" htmlFor="parent-name">
                        {t("parents.parentName")}
                      </Label>
                      <Input
                        id="parent-name"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="h-8 text-xs"
                        placeholder={t("parents.parentNameExample")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]" htmlFor="parent-email">
                        {t("form.email")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          id="parent-email"
                          type="email"
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          className="h-8 pl-7 text-xs"
                          placeholder={t("parents.parentEmailExample")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]" htmlFor="parent-phone">
                        {t("phone")}
                      </Label>
                      <Input
                        id="parent-phone"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="h-8 text-xs"
                        placeholder={t("form.phoneExampleSpaced")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]" htmlFor="parent-password">
                        {t("password")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          id="parent-password"
                          type={showParentPassword ? "text" : "password"}
                          value={parentPassword}
                          onChange={(e) => setParentPassword(e.target.value)}
                          className="h-8 pl-7 pr-7 text-xs"
                          placeholder={t("form.passwordMin")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowParentPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showParentPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" size="sm" className="w-full">
                        {t("parents.createLogin")}
                      </Button>
                    </div>
                      </form>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
        }

        {section === "payments" && (
          <DirectorFinanceSection
            onDataChanged={fetchOverview}
            locked={schoolPlan.planName === "Standard"}
          />
        )}

        {
          section === "settings" && (
            <div className="space-y-6">
              <UnifiedProfileSection
                token={token}
                user={currentUser}
                storageKey="director_profile_meta"
                roleLabel={profileRoleLabel}
              />

              {RENDER_LEGACY_PROFILE && (
              <Card className="border-slate-200 bg-slate-50/40">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl font-semibold">{t("profile.information")}</CardTitle>
                    <input
                      ref={directorPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file?.type.startsWith("image/") || !token) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const dataUrl = reader.result as string;
                          setSavingDirectorProfile(true);
                          try {
                            const faceDescriptor = await (await loadFaceApiModule()).getDescriptorFromImage(dataUrl);
                            const res = await apiFetch(`${API_BASE_URL}/api/auth/profile`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ photoUrl: dataUrl, faceDescriptor: faceDescriptor ?? undefined }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.message || t("errors.profilePhotoSave"));
                            setDirectorPhotoUrl(data.photoUrl || null);
                            updateAuthUserInStorage({ photoUrl: data.photoUrl || null });
                            toast({ title: t("messages.profilePhotoSaved") });
                          } catch (err) {
                            toast({
                              title: t("errorTitle"),
                              description: err instanceof Error ? err.message : t("errors.saveFailed"),
                              variant: "destructive",
                            });
                          } finally {
                            setSavingDirectorProfile(false);
                          }
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 rounded-2xl border bg-background p-5">
                  <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-center">
                    <div className="flex items-start justify-center lg:justify-start">
                      <div className="group relative h-[260px] w-[260px]">
                        <Avatar className="h-[260px] w-[260px] border-4 border-teal-600/90 bg-background">
                          {directorPhotoUrl ? (
                            <AvatarImage src={directorPhotoUrl} alt="" className="object-cover" />
                          ) : null}
                          <AvatarFallback className="bg-slate-100 text-muted-foreground">
                            <UserCircle className="h-40 w-40" />
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => directorPhotoInputRef.current?.click()}
                          disabled={savingDirectorProfile || savingProfileDetails}
                          aria-label={t("profile.changePhoto")}
                          title={t("profile.changePhoto")}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                        >
                          <Camera className="h-9 w-9 text-teal-400" />
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>FISH</Label>
                        <Input
                          value={`${profileForm.firstName} ${profileForm.lastName}`.trim()}
                          onChange={(e) => {
                            const parts = e.target.value.split(" ").filter(Boolean);
                            handleProfileFieldChange("firstName", parts[0] || "");
                            handleProfileFieldChange("lastName", parts.slice(1).join(" "));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>JSHSHIR</Label>
                        <Input value={profileForm.taxId} onChange={(e) => handleProfileFieldChange("taxId", e.target.value)} placeholder="Kiriting" />
                      </div>
                      <div className="space-y-2">
                        <Label>Foydalanuvchi roli</Label>
                        <Input value={profileRoleLabel} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Passport seriyasi va raqami</Label>
                        <Input value={profileForm.nationalId} onChange={(e) => handleProfileFieldChange("nationalId", e.target.value)} placeholder="Kiriting" />
                      </div>
                      <div className="space-y-2">
                        <Label>Foydalanuvchi nomi</Label>
                        <Input value={(profileForm.email || currentUser?.email || "user").split("@")[0]} readOnly />
                      </div>
                      <div className="space-y-2">
                        <div className="mb-2 flex items-center gap-3">
                          <Label htmlFor="director-change-password" className="mb-0">Parolni o&apos;zgartirish</Label>
                          <input
                            id="director-change-password"
                            type="checkbox"
                            checked={changePasswordEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setChangePasswordEnabled(enabled);
                              if (!enabled) {
                                setNewProfilePassword("");
                                setConfirmProfilePassword("");
                                setShowProfilePassword(false);
                                setShowProfilePasswordConfirm(false);
                              }
                            }}
                            className="h-5 w-5 cursor-pointer rounded border-muted-foreground/40 accent-teal-700"
                          />
                        </div>
                        <div className="relative">
                          <Input
                            type={showProfilePassword ? "text" : "password"}
                            value={newProfilePassword}
                            onChange={(e) => setNewProfilePassword(e.target.value)}
                            placeholder="********"
                            className="pr-10"
                            disabled={!changePasswordEnabled}
                          />
                          <button
                            type="button"
                            onClick={() => setShowProfilePassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            disabled={!changePasswordEnabled}
                          >
                            {showProfilePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Parolni tasdiqlash</Label>
                        <div className="relative">
                          <Input
                            type={showProfilePasswordConfirm ? "text" : "password"}
                            value={confirmProfilePassword}
                            onChange={(e) => setConfirmProfilePassword(e.target.value)}
                            placeholder="********"
                            className="pr-10"
                            disabled={!changePasswordEnabled}
                          />
                          <button
                            type="button"
                            onClick={() => setShowProfilePasswordConfirm((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            disabled={!changePasswordEnabled}
                          >
                            {showProfilePasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfileForm(buildProfileFormFromAuth());
                        setChangePasswordEnabled(false);
                        setNewProfilePassword("");
                        setConfirmProfilePassword("");
                        setShowProfilePassword(false);
                        setShowProfilePasswordConfirm(false);
                      }}
                      disabled={savingProfileDetails}
                      className="px-7"
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveProfileDetails}
                      disabled={savingProfileDetails}
                      className="px-7"
                    >
                      {savingProfileDetails ? t("saving") : t("save")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )}

              <Card>
                  <CardHeader>
                    <CardTitle>{t("face.title")}</CardTitle>
                    <CardDescription>
                      {t("face.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("face.classOptional")}</Label>
                      <select
                        value={faceClassId}
                        onChange={(e) => setFaceClassId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">{t("allClasses")}</option>
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <video
                        ref={faceVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="max-h-[320px] w-full rounded-lg border bg-muted object-cover"
                        style={{ display: faceCameraOn ? "block" : "none" }}
                      />
                      {!faceCameraOn ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                              faceStreamRef.current = stream;
                              if (faceVideoRef.current) {
                                faceVideoRef.current.srcObject = stream;
                              }
                              setFaceCameraOn(true);
                              setFaceResult(null);
                            } catch (e) {
                              setFaceResult({ type: "error", message: t("face.cameraDenied") });
                            }
                          }}
                        >
                          {t("face.turnOnCamera")}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            disabled={faceLoading}
                            onClick={async () => {
                              if (!token || !faceVideoRef.current) return;
                              setFaceResult(null);
                              setFaceLoading(true);
                              try {
                                const { loadFaceApiModels, getDescriptorFromVideo } = await loadFaceApiModule();
                                const ok = await loadFaceApiModels();
                                if (!ok) {
                                  setFaceResult({ type: "error", message: t("face.modelLoadFailed") });
                                  return;
                                }
                                const descriptor = await getDescriptorFromVideo(faceVideoRef.current);
                                if (!descriptor || descriptor.length !== 128) {
                                  setFaceResult({ type: "error", message: t("face.notDetected") });
                                  return;
                                }
                                const res = await apiFetch(`${API_BASE_URL}/api/director/attendance/face`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ descriptor, classId: faceClassId || undefined }),
                                });
                                const data = await res.json();
                                if (!res.ok) {
                                  setFaceResult({
                                    type: "error",
                                    message: data.message || t("face.markFailed"),
                                  });
                                  return;
                                }
                                setFaceResult({
                                  type: "success",
                                  message: data.message || t("face.markSuccess", { student: data.studentName }),
                                });
                              } catch (e) {
                                setFaceResult({
                                  type: "error",
                                  message: e instanceof Error ? e.message : t("face.genericError"),
                                });
                              } finally {
                                setFaceLoading(false);
                              }
                            }}
                          >
                            {faceLoading ? t("face.processing") : t("face.markAttendance")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              faceStreamRef.current?.getTracks().forEach((t) => t.stop());
                              faceStreamRef.current = null;
                              setFaceCameraOn(false);
                              setFaceResult(null);
                            }}
                          >
                            {t("face.turnOffCamera")}
                          </Button>
                        </div>
                      )}
                    </div>
                    {faceResult && (
                      <p className={faceResult.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
                        {faceResult.message}
                      </p>
                    )}
                  </CardContent>
                </Card>
            </div>
          )
        }

        {section === "support" && (
          <TicketSystem
            token={token}
            userRole={isSchoolAdmin ? "school_admin" : "director"}
            API_BASE_URL={API_BASE_URL}
          />
        )}



        {
          studentForPhoto && (
            <Dialog
              open={studentPhotoDialogOpen}
              onOpenChange={(open) => {
                setStudentPhotoDialogOpen(open);
                if (!open) setStudentForPhoto(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("studentPhoto.title", { name: studentForPhoto.name })}</DialogTitle>
                  <CardDescription>
                    {t("studentPhoto.description")}
                  </CardDescription>
                </DialogHeader>
                <div className="flex items-center gap-4 py-4">
                  <Avatar className="h-20 w-20">
                    {studentPhotoUrl ? (
                      <AvatarImage src={studentPhotoUrl} alt="" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-muted">
                      <UserCircle className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <input
                      ref={studentPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file?.type.startsWith("image/")) return;
                        const r = new FileReader();
                        r.onload = () => setStudentPhotoUrl(r.result as string);
                        r.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => studentPhotoInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      {t("profilePhoto.upload")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setStudentPhotoUrl(null)}>
                      {t("delete")}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={async () => {
                      if (!token) return;
                      try {
                        const faceDescriptor = studentPhotoUrl
                          ? await (await loadFaceApiModule()).getDescriptorFromImage(studentPhotoUrl)
                          : null;
                        const res = await apiFetch(`${API_BASE_URL}/api/director/students/${studentForPhoto.id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            photoUrl: studentPhotoUrl,
                            faceDescriptor: studentPhotoUrl ? (faceDescriptor ?? undefined) : null,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || t("errors.studentPhotoSave"));
                        toast({ title: t("messages.studentPhotoSaved") });
                        setStudentPhotoDialogOpen(false);
                        setStudentForPhoto(null);
                        fetchStudentsForParents();
                      } catch (err) {
                        toast({
                          title: t("errorTitle"),
                          description: err instanceof Error ? err.message : t("errors.saveFailed"),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {t("save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }

        <Dialog
          open={directorUserDialogOpen}
          onOpenChange={(open) => {
            setDirectorUserDialogOpen(open);
            if (!open) {
              setSelectedDirectorUser(null);
            }
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedDirectorUser
                  ? t("dialogs.editUserByRole", { role: directorRoleLabels[selectedDirectorUser.role] })
                  : t("dialogs.editUser")}
              </DialogTitle>
            </DialogHeader>
            {selectedDirectorUser && (
              <form onSubmit={handleUpdateDirectorUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="director-user-name">{t("form.name")}</Label>
                  <Input
                    id="director-user-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="director-user-email">{t("form.email")}</Label>
                  <Input
                    id="director-user-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("table.role")}</Label>
                  <Input value={directorRoleLabels[selectedDirectorUser.role]} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t("table.related")}</Label>
                  {selectedDirectorUser.role === "student" ? (
                    <select
                      value={editRelatedId}
                      onChange={(e) => setEditRelatedId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Sinfni tanlang</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  ) : selectedDirectorUser.role === "teacher" ? (
                    <select
                      value={editRelatedId}
                      onChange={(e) => setEditRelatedId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Fan tanlang</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={editRelatedId}
                      onChange={(e) => setEditRelatedId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">O&apos;quvchini tanlang</option>
                      {studentsForParents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {decodeHtmlEntities(student.name) || "—"}
                          {student.className ? ` (${student.className})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="director-user-phone">{t("phone")}</Label>
                  <Input
                    id="director-user-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+998901234567"
                  />
                </div>
                {(selectedDirectorUser.role === "student" || selectedDirectorUser.role === "parent") && (
                  <div className="space-y-2">
                    <Label>{t("table.debt")}</Label>
                    <Input
                      value={
                        typeof selectedDirectorUser.debtAmount === "number" &&
                          (selectedDirectorUser.role === "student" || selectedDirectorUser.role === "parent")
                          ? formatMoney(selectedDirectorUser.debtAmount)
                          : "—"
                      }
                      disabled
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="director-user-password">{t("form.newPasswordOptional")}</Label>
                  <Input
                    id="director-user-password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={t("form.leaveBlankToKeep")}
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="destructive" onClick={handleDeleteDirectorUser}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("delete")}
                  </Button>
                  <Button type="submit">{t("save")}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {
          editingTeacher && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("dialogs.editTeacher")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateTeacher} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-teacher-name">{t("form.name")}</Label>
                    <Input
                      id="edit-teacher-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-teacher-email">{t("form.email")}</Label>
                    <Input
                      id="edit-teacher-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-teacher-password">{t("form.newPasswordOptional")}</Label>
                    <Input
                      id="edit-teacher-password"
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={t("form.enterIfChanging")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-teacher-subject">{tTable("subject")}</Label>
                    <select
                      id="edit-teacher-subject"
                      value={editSubjectId}
                      onChange={(e) => setEditSubjectId(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">{t("form.noChange")}</option>
                      {subjects.map((subj) => (
                        <option key={subj._id} value={subj._id}>
                          {subj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DialogFooter>
                    <Button type="submit">{t("save")}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      </div >
    </DirectorLayout >
  );
};

export default DirectorDashboard;
// Nested routes chiqishi uchun layout oxirida Outlet qo'shildi
// ...existing code...
  <Outlet />


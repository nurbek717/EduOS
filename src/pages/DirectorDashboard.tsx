import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DirectorLayout from "@/components/DirectorLayout";
import DirectorFinanceSection from "@/components/director/DirectorFinanceSection";
import TicketSystem from "@/components/director/TicketSystem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRef } from "react";
import { BookOpen, Users, GraduationCap, UserCircle, Mail, Lock, Eye, EyeOff, Pencil, Trash2, Upload, Plus, Wallet, TrendingUp, TrendingDown, AlertTriangle, Info, ShieldAlert, Phone, MapPin, Camera, Calendar, Search, Eraser } from "lucide-react";
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

type DirectorSection = "dashboard" | "students" | "teachers" | "school_admins" | "classes" | "schedule" | "payments" | "exams" | "settings" | "support";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const ALL_CLASSES_VALUE = "__all__";
const DIRECTOR_USERS_PAGE_SIZE = 5;

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
  subscription?: {
    startAt: string | null;
    endAt: string | null;
    daysLeft: number | null;
    isExpired: boolean;
  } | null;
};

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
  photoUrl?: string | null;
  classId?: string;
  className?: string;
};

type DirectorManageableRole = "teacher" | "student" | "parent" | "school_admin";

type DirectorManagedUser = {
  id: string;
  name: string;
  email: string;
  role: DirectorManageableRole;
  photoUrl?: string | null;
  phone?: string | null;
  debtAmount?: number | null;
  relatedLabel?: string | null;
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const locale = useAppLocale();
  const moneyFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatMoney = (value: number) => `${moneyFormatter.format(Math.round(value || 0))} so'm`;

  const directorRoleLabels: Record<DirectorManageableRole, string> = {
    teacher: tFilters("teacher"),
    student: tFilters("student"),
    parent: tFilters("parent"),
    school_admin: tFilters("schoolAdmin"),
  };

  const directorRoleFilterOptions = useMemo<Array<{ value: "all" | DirectorManageableRole; label: string }>>(
    () => [
      { value: "all", label: tFilters("all") },
      { value: "teacher", label: tFilters("teacher") },
      { value: "student", label: tFilters("student") },
      { value: "parent", label: tFilters("parent") },
      { value: "school_admin", label: tFilters("schoolAdmin") },
    ],
    [tFilters],
  );
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const isSchoolAdmin = currentUser?.role === "school_admin";
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
  const profileDisplayName = decodeHtmlEntities(currentUser?.name) || (isSchoolAdmin ? tLayout("schoolAdmin.fallbackName") : tLayout("director.fallbackName"));
  const [section, setSection] = useState<DirectorSection>("dashboard");
  const [studentsView, setStudentsView] = useState<"list" | "attach">("list");
  const [overview, setOverview] = useState<DirectorOverview | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<DirectorHeaderNotification[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [schoolAdminDialogOpen, setSchoolAdminDialogOpen] = useState(false);
  const [directorUsersLoading, setDirectorUsersLoading] = useState(false);
  const [directorUsers, setDirectorUsers] = useState<DirectorManagedUser[]>([]);
  const [directorUsersSearch, setDirectorUsersSearch] = useState("");
  const [directorUsersRoleFilter, setDirectorUsersRoleFilter] = useState<"all" | DirectorManageableRole>("all");
  const [directorUsersPage, setDirectorUsersPage] = useState(1);
  const [directorUserDialogOpen, setDirectorUserDialogOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [schoolAdminName, setSchoolAdminName] = useState("");
  const [schoolAdminEmail, setSchoolAdminEmail] = useState("");
  const [schoolAdminPassword, setSchoolAdminPassword] = useState("");
  const [schoolAdminPhone, setSchoolAdminPhone] = useState("");
  const [showSchoolAdminPassword, setShowSchoolAdminPassword] = useState(false);

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
  const [editPassword, setEditPassword] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");

  const [statRange, setStatRange] = useState<"today" | "week" | "month">("today");

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const handleAuthExpiry = (message?: string) => {
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
  };

  const apiFetch = async (...args: Parameters<typeof fetch>) => {
    const res = await fetch(...args);
    if (res.status === 401) {
      const data = await res.clone().json().catch(() => null);
      const message = data?.message || "Invalid or expired token";
      handleAuthExpiry(message);
      throw new Error(message);
    }
    return res;
  };

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

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [showStudentPassword, setShowStudentPassword] = useState(false);

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
  const studentPhotoInputRef = useRef<HTMLInputElement>(null);

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
  });
  const directorUsersRequestIdRef = useRef(0);

  const updateAuthUserInStorage = (patch: Partial<{ name: string; email: string; phone: string | null; photoUrl: string | null }>) => {
    const auth = localStorage.getItem("auth_user");
    if (!auth) return;
    const parsed = JSON.parse(auth);
    const next = { ...parsed, ...patch };
    localStorage.setItem("auth_user", JSON.stringify(next));
  };

  const buildProfileFormFromAuth = () => {
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
  };

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
      setOverview(data);
      const timestamp = new Date().toLocaleString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
      const mappedAlerts: DirectorHeaderNotification[] = (data?.alerts || []).map(
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
    if (section === "school_admins") {
      return [];
    }
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

    return isSchoolAdmin
      ? directorRoleFilterOptions.filter((filter) => filter.value !== "school_admin")
      : directorRoleFilterOptions;
  }, [directorRoleFilterOptions, isSchoolAdmin, section]);

  const directorUsersTotal = directorUsers.length;
  const directorUsersTotalPages = Math.max(1, Math.ceil(directorUsersTotal / DIRECTOR_USERS_PAGE_SIZE));
  const safeDirectorUsersPage = Math.min(directorUsersPage, directorUsersTotalPages);
  const directorUsersPageStartIndex = directorUsersTotal === 0 ? 0 : (safeDirectorUsersPage - 1) * DIRECTOR_USERS_PAGE_SIZE;
  const directorUsersPageEndIndex = Math.min(directorUsersPageStartIndex + DIRECTOR_USERS_PAGE_SIZE, directorUsersTotal);

  const paginatedDirectorUsers = useMemo(
    () => directorUsers.slice(directorUsersPageStartIndex, directorUsersPageEndIndex),
    [directorUsers, directorUsersPageStartIndex, directorUsersPageEndIndex],
  );

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
  }, [section]);

  useEffect(() => {
    if (section !== "settings") {
      faceStreamRef.current?.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
      setFaceCameraOn(false);
    }

    const isPeopleSection = section === "teachers" || section === "students" || section === "school_admins";
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
        if (isSchoolAdmin && section === "students" && !loadedDirectorDataRef.current.students) {
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
    };

    void loadSectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isSchoolAdmin, selectedTimetableClassId]);

  useEffect(() => {
    if (section !== "teachers" && section !== "students" && section !== "school_admins") return;

    if (section === "school_admins" && directorUsersRoleFilter !== "school_admin") {
      setDirectorUsersRoleFilter("school_admin");
      return;
    }

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
    if (section !== "teachers" && section !== "students" && section !== "school_admins") return;
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

  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
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
      const res = await apiFetch(`${API_BASE_URL}/api/director/school-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: schoolAdminName,
          email: schoolAdminEmail,
          phone: schoolAdminPhone,
          password: schoolAdminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("errors.schoolAdminCreate"));
      }

      toast({
        title: t("successTitle"),
        description: t("messages.schoolAdminCreated"),
      });

      setSchoolAdminDialogOpen(false);
      setSchoolAdminName("");
      setSchoolAdminEmail("");
      setSchoolAdminPhone("");
      setSchoolAdminPassword("");

      await fetchDirectorUsers({ role: directorUsersRoleFilter, search: directorUsersSearch });
      await fetchOverview();
    } catch (err: unknown) {
      toast({
        title: t("errorTitle"),
        description: err instanceof Error ? err.message : t("errors.schoolAdminCreateDesc"),
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
        createdAt: data.createdAt,
      };

      setSelectedDirectorUser(loaded);
      setEditName(loaded.name);
      setEditEmail(loaded.email);
      setEditPhone(loaded.phone || "");
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
      section: u.role === "teacher" || u.role === "school_admin" ? ("teachers" as const) : ("students" as const),
    })),
    ...timetableEntries.map((e) => ({
      id: e.id,
      title: `${e.subjectName} (${e.teacherName})`,
      subtitle: `${e.startTime}-${e.endTime}`,
      section: "schedule" as const,
    })),
  ];

  return (
    <DirectorLayout
      currentSection={section}
      onSectionChange={setSection}
      currentStudentsView={studentsView}
      onStudentsViewChange={setStudentsView}
      headerNotifications={headerNotifications}
      searchItems={searchItems}
      subscriptionInfo={{
        planName: "TEST",
        startDate: overview?.subscription?.startAt || null,
        endDate: overview?.subscription?.endAt || null,
        contractNumber: localStorage.getItem("subscription_contract_number") || "MYS-133891/26",
        status: overview?.subscription?.isExpired ? "expired" : "active",
        daysLeft: overview?.subscription?.daysLeft ?? null,
      }}
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
                  <div className="text-2xl font-bold">
                    {overview ? overview.classes : "—"}
                  </div>
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
                    {overview && overview.teacherStats
                      ? overview.teacherStats[statRange]
                      : overview
                        ? overview.teachers
                        : "—"}
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
                    {overview && overview.studentStats
                      ? overview.studentStats[statRange]
                      : overview
                        ? overview.students
                        : "—"}
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
                  <div className="text-2xl font-bold">
                    {overview ? overview.parents : "—"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{tStats("parentsDesc")}</p>
                </CardContent>
              </Card>

              <div className="md:col-span-2 lg:col-span-4">
                <p className=" text-gray-500 text-sm font-semibold text-foreground"> MOLIYAVIY FAOLLIK</p>
              </div>

              <Card
                className="cursor-pointer transition hover:ring-2 hover:ring-primary/30 lg:col-span-2"
                onClick={() => setSection("payments")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("monthIncome")}</CardTitle>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMoney(overview?.finance?.monthIncome || 0)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tStats("monthIncomeDesc")}</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition hover:ring-2 hover:ring-primary/30 lg:col-span-2"
                onClick={() => setSection("payments")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{tStats("monthExpense")}</CardTitle>
                  <div className="rounded-lg bg-rose-500/10 p-2">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMoney(overview?.finance?.monthExpense || 0)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tStats("monthExpenseDesc")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("recentActivity")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {overview && overview.recentActivities.length > 0 ? (
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
                    <p className="text-xs text-muted-foreground">
                      {t("recentActivityEmpty")}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("alertsTitle")}</CardTitle>
                  <CardDescription>{t("alertsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {overview && overview.alerts.length > 0 ? (
                    overview.alerts.map((alert, idx) => (
                      <div
                        key={`${alert.level}-${idx}`}
                        className={`rounded-md border px-3 py-2 text-xs ${alert.level === "warning"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-sky-200 bg-sky-50 text-sky-900"
                          }`}
                      >
                        {alert.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("alertsEmpty")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {(section === "classes" || section === "schedule" || section === "exams") && (
          <Card className={section === "schedule" ? "border-0 bg-transparent shadow-none" : undefined}>
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
                        <p className="text-xs text-muted-foreground">{tTable("loadingClasses")}</p>
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
                        <p className="text-xs text-muted-foreground">{tTable("loadingSubjects")}</p>
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
                      <CardTitle>{t("schedule.title")}</CardTitle>
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
                      <p className="text-sm text-muted-foreground">{t("schedule.loading")}</p>
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
                        <CardTitle>{t("exams.title")}</CardTitle>
                        <CardDescription>
                            {t("exams.description")}
                        </CardDescription>
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
                              <TableRow>
                                <TableCell colSpan={7} className="h-16 text-center text-sm text-muted-foreground">
                                  {t("exams.loading")}
                                </TableCell>
                              </TableRow>
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
                                  <TableRow>
                                    <TableCell colSpan={6} className="h-16 text-center text-sm text-muted-foreground">
                                      {t("exams.resultsLoading")}
                                    </TableCell>
                                  </TableRow>
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
                        <p className="text-sm text-muted-foreground">{t("analysis.loading")}</p>
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

        {(section === "teachers" || section === "students" || section === "school_admins") && (
          <Card className={isSchoolAdmin ? undefined : "border-0 bg-transparent shadow-none"}>
            {section === "school_admins" && !isSchoolAdmin && (
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Maktab adminlari</CardTitle>
                  <CardDescription>Maktabni boshqarishda yordam beruvchi adminlar ro&apos;yxati.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={schoolAdminDialogOpen} onOpenChange={setSchoolAdminDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Yangi admin qo&apos;shish</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yangi maktab admini yaratish</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateSchoolAdmin} className="space-y-4">
                        <div className="space-y-2 lg:col-span-3">
                          <Label htmlFor="admin-name">Ism</Label>
                          <Input
                            id="admin-name"
                            value={schoolAdminName}
                            onChange={(e) => setSchoolAdminName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-3">
                          <Label htmlFor="admin-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="admin-email"
                              type="email"
                              value={schoolAdminEmail}
                              onChange={(e) => setSchoolAdminEmail(e.target.value)}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2 lg:col-span-3">
                          <Label htmlFor="admin-phone">Telefon</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="admin-phone"
                              value={schoolAdminPhone}
                              onChange={(e) => setSchoolAdminPhone(e.target.value)}
                              placeholder="+998901234567"
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2 lg:col-span-3">
                          <Label htmlFor="admin-password">Parol</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="admin-password"
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
                          <Button type="submit">Saqlash</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            )}

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
            <CardContent className={isSchoolAdmin ? "space-y-8" : "space-y-8 p-0"}>
              {section === "students" && (
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>{t("students.title")}</CardTitle>
                      <CardDescription>{t("students.description")}</CardDescription>
                    </div>
                    {isSchoolAdmin && studentsView === "list" && (
                      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="self-start">{t("students.add")}</Button>
                        </DialogTrigger>
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
                    )}
                  </div>
                </CardHeader>
              )}

              {section === "students" && studentsView === "list" && (
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
                      }}
                      className="rounded-xl border bg-background"
                    >
                      <div className="grid gap-3 border-b p-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-search">Qidirish</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="student-search"
                              name="q"
                              value={directorUsersSearch}
                              onChange={(e) => setDirectorUsersSearch(e.target.value)}
                              placeholder="O&apos;quvchi to&apos;liq ismi va IDsi,"
                              className="h-11 pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-class-code">Sinf kodi bo&apos;yicha izlash</Label>
                          <Input
                            id="student-class-code"
                            name="classCode"
                            placeholder="Kiriting"
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-class">Sinf</Label>
                          <select
                            id="student-class"
                            name="classId"
                            defaultValue=""
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-class-type">Sinf turi</Label>
                          <select
                            id="student-class-type"
                            name="classType"
                            defaultValue=""
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-language">Ta&apos;lim tili</Label>
                          <select
                            id="student-language"
                            name="language"
                            defaultValue=""
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-status">Holati</Label>
                          <select
                            id="student-status"
                            name="status"
                            defaultValue=""
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="student-year">O&apos;quv yili</Label>
                          <select
                            id="student-year"
                            name="year"
                            defaultValue=""
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="student-shift">Smena</Label>
                            <select
                              id="student-shift"
                              name="shift"
                              defaultValue=""
                              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <option value="" disabled>Tanlang</option>
                            </select>
                          </div>
                          <Button type="reset" variant="secondary" className="h-11 px-4">
                            <Eraser className="mr-2 h-4 w-4" />
                            Tozalash
                          </Button>
                          <Button type="submit" className="h-11 px-4">
                            <Search className="mr-2 h-4 w-4" />
                            Qidirish
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[56px]">#</TableHead>
                              <TableHead>FISH</TableHead>
                              <TableHead>PASSPORT / GUVOHNOMA</TableHead>
                              <TableHead>TUG&apos;ILGAN SANA</TableHead>
                              <TableHead>OTA-ONA / VASIY</TableHead>
                              <TableHead>SINF</TableHead>
                              <TableHead>SINF TURI</TableHead>
                              <TableHead>SMENA</TableHead>
                              <TableHead>QABUL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={9} className="h-40 text-center text-sm text-muted-foreground">
                                Qidiruv natijalari shu yerda chiqadi.
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </form>
                  </div>
                </CardContent>
              )}

              {section === "school_admins" && (
                <>
                  <div className="w-full px-6 py-4 border-b">
                    <div className="flex w-full items-center gap-2 overflow-x-auto pb-1">
                      <Input
                        value={directorUsersSearch}
                        onChange={(e) => setDirectorUsersSearch(e.target.value)}
                        placeholder={t("search.usersPlaceholder")}
                        className="w-full min-w-[260px] max-w-[280px] shrink-0"
                      />

                      <div className="flex gap-2 shrink-0">
                        {visibleDirectorRoleFilters.map((filter) => (
                          <Button
                            key={filter.value}
                            type="button"
                            size="sm"
                            className="shrink-0"
                            variant={directorUsersRoleFilter === filter.value ? "default" : "outline"}
                            onClick={() => setDirectorUsersRoleFilter(filter.value)}
                          >
                            {filter.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardContent className="px-6 pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("table.user")}</TableHead>
                          <TableHead>{t("table.role")}</TableHead>
                          <TableHead>{t("table.related")}</TableHead>
                          <TableHead>{t("phone")}</TableHead>
                          <TableHead>{t("table.createdAt")}</TableHead>
                          {isSchoolAdmin && <TableHead className="w-[50px]" />}
                          <TableHead className="w-[88px] text-center">{t("table.photo")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {directorUsersLoading ? (
                          <TableRow>
                            <TableCell colSpan={isSchoolAdmin ? 7 : 6} className="h-24 text-center text-sm text-muted-foreground">
                              {t("users.loading")}
                            </TableCell>
                          </TableRow>
                        ) : directorUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={isSchoolAdmin ? 7 : 6} className="h-28 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <Users className="h-10 w-10 opacity-40" />
                                <p className="text-sm font-medium">{t("users.notFound")}</p>
                                <p className="text-xs">{t("users.noAdminsYet")}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedDirectorUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-foreground">{decodeHtmlEntities(user.name)}</div>
                                  <div className="text-sm text-muted-foreground">{decodeHtmlEntities(user.email)}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{directorRoleLabels[user.role]}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {decodeHtmlEntities(user.relatedLabel) || "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {user.phone || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : "—"}
                              </TableCell>
                              {isSchoolAdmin && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openDirectorUserDialog(user.id)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex justify-center">
                                  <Avatar className="h-9 w-9">
                                    {user.photoUrl ? (
                                      <AvatarImage src={user.photoUrl} alt={decodeHtmlEntities(user.name)} className="object-cover" />
                                    ) : null}
                                    <AvatarFallback className="text-xs">
                                      <UserCircle className="h-4 w-4" />
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </>
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
                      <TableRow>
                        <TableCell colSpan={isSchoolAdmin ? 5 : 4} className="py-6 text-center text-sm text-muted-foreground">
                          {t("loading")}
                        </TableCell>
                      </TableRow>
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
                  <div className="mb-6 rounded-2xl border bg-card p-6">
                    <h3 className="text-base font-semibold text-foreground">O&apos;quvchini biriktirish</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O&apos;quvchini sinfga biriktirish uchun ma&apos;lumotlarni kiriting.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}
                      onReset={(e) => {
                        e.preventDefault();
                      }}
                      className="mt-5 space-y-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="attach-academic-year">O&apos;quv yili</Label>
                          <select
                            id="attach-academic-year"
                            name="academicYear"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            defaultValue=""
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-education-language">Ta&apos;lim tili</Label>
                          <select
                            id="attach-education-language"
                            name="educationLanguage"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            defaultValue=""
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-class">Sinf</Label>
                          <select
                            id="attach-class"
                            name="classId"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            defaultValue=""
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-class-type">Sinf turi</Label>
                          <select
                            id="attach-class-type"
                            name="classType"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            defaultValue=""
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="attach-target-class">Biriktiriladigan sinf</Label>
                          <select
                            id="attach-target-class"
                            name="targetClassId"
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            defaultValue=""
                          >
                            <option value="" disabled>Tanlang</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="attach-order-date">Qabul buyrug&apos;i sanasi</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="attach-order-date"
                              name="orderDate"
                              type="date"
                              className="h-11 pl-10"
                              placeholder="Sana kiriting"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attach-accepted-date">O&apos;quvchini sinfga qabul qilish sanasi</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="attach-accepted-date"
                              name="acceptedDate"
                              type="date"
                              className="h-11 pl-10"
                              placeholder="Sana kiriting"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                        <Button type="reset" variant="secondary" className="h-11 px-6">
                          Tozalash
                        </Button>
                        <Button type="submit" className="h-11 px-6">
                          Biriktirish
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="mb-3">
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
                </div>
              )}
            </CardContent>
          </Card>
        )
        }

        {section === "payments" && <DirectorFinanceSection onDataChanged={fetchOverview} />}

        {
          section === "settings" && (
            <div className="space-y-6">
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
            userRole={currentUser?.role as "director" | "school_admin"}
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
                  <Input value={selectedDirectorUser.relatedLabel || "—"} disabled />
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
                {selectedDirectorUser.role !== "school_admin" && (
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


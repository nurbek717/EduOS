import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppLocale } from "@/context/LanguageContext";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Users,
  ShieldAlert,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  School,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { Eye, EyeOff, Lock } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TABLE_PAGE_SIZE = 5;
const AdminSchoolsChart = lazy(() => import("@/components/admin/AdminSchoolsChart"));

type Director = {
  _id: string;
  name: string;
  email: string;
};

type School = {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at?: string;
  director?: Director | null;
  status?: "active" | "inactive";
};

type Stats = {
  totalSchools: number;
  totalUsers: number;
  byRole: {
    director: number;
    school_admin: number;
    teacher: number;
    student: number;
    parent: number;
  };
  schoolsByStatus?: {
    active: number;
    inactive: number;
  };
  platformOverview?: {
    schoolsWithoutDirector: number;
    schoolsWithoutDirectorSubscriptions?: Array<{
      schoolId: string;
      schoolName: string;
      endAt: string;
    }>;
    schoolsWithoutSchoolAdmin: number;
    newSchoolsLast7Days: number;
    attentionItems: string[];
  };
  schoolsLast7Days?: {
    date: string;
    count: number;
  }[];
  range?: {
    start: string;
    end: string;
    weekOffset: number;
  };
};

type UserRole = "director" | "school_admin" | "teacher" | "student" | "parent";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId?: string | null;
  schoolName?: string | null;
  createdAt?: string;
};

type SubscriptionItem = {
  id: string;
  schoolId: string;
  schoolName: string;
  endAt: string;
};

type AdminHeaderNotification = {
  id: string;
  text: string;
  at: string;
  section: "overview" | "schools" | "users" | "subscriptions" | "exams";
};

type AdminExam = {
  id: string;
  title: string;
  className: string;
  subjectName: string;
  duration: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
  createdByRole?: string;
};

type AdminExamResult = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number;
  maxScore: number;
  gradePercent: number;
  pendingManual: number;
  isFinalScore: boolean;
};

const roleLabelKeys: Record<UserRole, string> = {
  director: "roles.director",
  school_admin: "roles.schoolAdmin",
  teacher: "roles.teacher",
  student: "roles.student",
  parent: "roles.parent",
};

const overviewStatCards = [
  {
    titleKey: "overview.cards.totalSchools.title",
    key: "schools" as const,
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    descriptionKey: "overview.cards.totalSchools.description",
  },
  {
    titleKey: "overview.cards.activeSchools.title",
    key: "activeSchools" as const,
    icon: School,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    descriptionKey: "overview.cards.activeSchools.description",
  },
  {
    titleKey: "overview.cards.subscriptionEnding.title",
    key: "schoolsWithoutDirector" as const,
    icon: ShieldAlert,
    color: "text-rose-600",
    bgColor: "bg-rose-500/10",
    descriptionKey: "overview.cards.subscriptionEnding.description",
  },
  {
    titleKey: "overview.cards.withoutSchoolAdmin.title",
    key: "schoolsWithoutSchoolAdmin" as const,
    icon: UserCog,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    descriptionKey: "overview.cards.withoutSchoolAdmin.description",
  },
  {
    titleKey: "overview.cards.totalUsers.title",
    key: "users" as const,
    icon: Users,
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    descriptionKey: "overview.cards.totalUsers.description",
  },
  {
    titleKey: "overview.cards.newSchoolsLast7Days.title",
    key: "newSchoolsLast7Days" as const,
    icon: TrendingUp,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10",
    descriptionKey: "overview.cards.newSchoolsLast7Days.description",
  },
];

const AdminDashboard = () => {
  const { toast } = useToast();
  const locale = useAppLocale();
  const { t } = useTranslation("dashboard");
  const { t: ad } = useTranslation("admin-dashboard");

  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [section, setSection] = useState<"overview" | "schools" | "users" | "subscriptions" | "exams">("schools");
  const [weekOffset, setWeekOffset] = useState(0);
  const [examsLoading, setExamsLoading] = useState(false);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [examResults, setExamResults] = useState<AdminExamResult[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [assignDirectorDialogOpen, setAssignDirectorDialogOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [examsPage, setExamsPage] = useState(1);
  const [examResultsPage, setExamResultsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [directorPassword, setDirectorPassword] = useState("");
  const [assignDirectorName, setAssignDirectorName] = useState("");
  const [assignDirectorEmail, setAssignDirectorEmail] = useState("");
  const [assignDirectorPassword, setAssignDirectorPassword] = useState("");
  const [targetSchoolForDirector, setTargetSchoolForDirector] = useState<School | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmEditPassword, setConfirmEditPassword] = useState("");
  const [changePasswordEnabled, setChangePasswordEnabled] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPasswordConfirm, setShowEditPasswordConfirm] = useState(false);
  const [showDirectorPassword, setShowDirectorPassword] = useState(false);
  const usersRequestIdRef = useRef(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // Subscription (obuna) management
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsSubmitting, setSubscriptionsSubmitting] = useState(false);
  const [subscriptionSchoolId, setSubscriptionSchoolId] = useState<string>("");
  const [subscriptionDays, setSubscriptionDays] = useState<number>(30);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const subscriptionsForOverviewUI = subscriptions
    .slice()
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());

  const getPagination = <T,>(items: T[], page: number) => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = total === 0 ? 0 : (safePage - 1) * TABLE_PAGE_SIZE;
    const end = Math.min(start + TABLE_PAGE_SIZE, total);
    return {
      total,
      totalPages,
      safePage,
      start,
      end,
      rows: items.slice(start, end),
    };
  };

  const schoolsPagination = getPagination(schools, schoolsPage);
  const subscriptionsPagination = getPagination(subscriptions, subscriptionsPage);
  const examsPagination = getPagination(exams, examsPage);
  const examResultsPagination = getPagination(examResults, examResultsPage);
  const usersPagination = getPagination(users, usersPage);

  const fetchSchools = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/schools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(ad("errors.fetchSchools"));
      const data = await res.json();
      setSchools(data);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchSchools"),
        variant: "destructive",
      });
    }
  };

  const fetchStats = async (offset: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats?weekOffset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(ad("errors.fetchStats"));
      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchStats"),
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async (options?: {
    role?: UserRole;
    search?: string;
  }) => {
    if (!token) return;

    const role = options?.role ?? "director";
    const search = options?.search ?? usersSearch;

    const requestId = ++usersRequestIdRef.current;
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("role", role);
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const queryString = params.toString();
      const res = await fetch(`${API_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.fetchUsers"));
      if (requestId !== usersRequestIdRef.current) return;
      setUsers(data);
    } catch (err: unknown) {
      if (requestId !== usersRequestIdRef.current) return;
      toast({
        title: ad("toasts.error"),
        description:
          err instanceof Error ? err.message : ad("errors.fetchUsers"),
        variant: "destructive",
      });
    } finally {
      if (requestId === usersRequestIdRef.current) {
        setUsersLoading(false);
      }
    }
  };

  const fetchSubscriptions = async () => {
    if (!token) return;

    setSubscriptionsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.fetchSubscriptions"));
      setSubscriptions(data);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchSubscriptions"),
        variant: "destructive",
      });
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const fetchExams = async () => {
    if (!token) return;
    setExamsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.fetchExams"));
      setExams(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchExams"),
        variant: "destructive",
      });
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchExamResults = async (examId: string, examTitle?: string) => {
    if (!token || !examId) return;
    setExamResultsLoading(true);
    setSelectedExamId(examId);
    setSelectedExamTitle(examTitle || ad("exams.results.defaultTitle"));
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.fetchExamResults"));
      setExamResults(Array.isArray(data?.attempts) ? data.attempts : []);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchExamResults"),
        variant: "destructive",
      });
      setExamResults([]);
    } finally {
      setExamResultsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
    // Overview kartalarida ham "kun qoldi" chiqishi uchun subscriptionlarni ham yuklab qo'yamiz.
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStats(weekOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    if (section !== "users") return;

    const timeoutId = window.setTimeout(() => {
      fetchUsers();
    }, 150);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, usersSearch]);

  useEffect(() => {
    setUsersPage(1);
  }, [usersSearch]);

  useEffect(() => {
    setExamResultsPage(1);
  }, [selectedExamId]);

  useEffect(() => {
    if (section !== "subscriptions") return;
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (section !== "exams") return;
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Live countdown uchun bitta interval: qaysi bo'limda bo'lishingizdan qat'i nazar real vaqt yangilanadi.
  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleChangeWeek = (direction: "prev" | "next") => {
    setWeekOffset((current) => {
      const next = direction === "prev" ? current + 1 : Math.max(0, current - 1);
      return next;
    });
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: ad("toasts.error"),
        description: ad("errors.superAdminLoginRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!subscriptionSchoolId) {
      toast({
        title: ad("toasts.insufficient"),
        description: ad("subscriptions.validation.selectSchool"),
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(subscriptionDays) || subscriptionDays < 1) {
      toast({
        title: ad("toasts.insufficient"),
        description: ad("subscriptions.validation.days"),
        variant: "destructive",
      });
      return;
    }

    setSubscriptionsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schoolId: subscriptionSchoolId,
          days: subscriptionDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.createSubscription"));

      toast({
        title: ad("toasts.success"),
        description: ad("subscriptions.created"),
      });

      setSubscriptionSchoolId("");
      setSubscriptionDays(30);
      await fetchSubscriptions();
      // "Umumiy ko'rinish" dagi kartalarda ham obuna tugash kunlari yangilanishi uchun
      await fetchStats(weekOffset);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.createSubscription"),
        variant: "destructive",
      });
    } finally {
      setSubscriptionsSubmitting(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: ad("toasts.error"),
        description: ad("errors.superAdminLoginRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/schools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: schoolName,
          address: schoolAddress || undefined,
          phone: schoolPhone || undefined,
          directorName: directorName || undefined,
          directorEmail: directorEmail || undefined,
          directorPassword: directorPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.createSchool"));

      toast({
        title: ad("toasts.success"),
        description: ad("schools.created"),
      });

      setDialogOpen(false);
      setSchoolName("");
      setSchoolAddress("");
      setSchoolPhone("");
      setDirectorName("");
      setDirectorEmail("");
      setDirectorPassword("");

      await fetchSchools();
      await fetchStats(weekOffset);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.createSchool"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openUserDialog = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.fetchUserDetails"));
      const loaded: AdminUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        schoolId: data.schoolId,
        schoolName: data.schoolName,
      };
      setSelectedUser(loaded);
      setEditName(loaded.name);
      setEditEmail(loaded.email);
      setEditPassword("");
      setConfirmEditPassword("");
      setChangePasswordEnabled(false);
      setShowEditPassword(false);
      setShowEditPasswordConfirm(false);
      setUserDialogOpen(true);
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.fetchUserDetails"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;

    if (changePasswordEnabled) {
      if (!editPassword.trim()) {
        toast({
          title: ad("toasts.insufficient"),
          description: ad("users.edit.newPasswordRequired"),
          variant: "destructive",
        });
        return;
      }
      if (editPassword !== confirmEditPassword) {
        toast({
          title: ad("toasts.error"),
          description: ad("users.edit.passwordMismatch"),
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: changePasswordEnabled ? editPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.updateUser"));
      toast({
        title: ad("toasts.saved"),
        description: ad("users.updated"),
      });
      setUserDialogOpen(false);
      setEditPassword("");
      setConfirmEditPassword("");
      setChangePasswordEnabled(false);
      await fetchSchools();
      await fetchUsers();
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.updateUser"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!token || !selectedUser) return;
    if (!window.confirm(ad("users.confirmDelete"))) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.deleteUser"));
      toast({
        title: ad("toasts.deleted"),
        description: ad("users.deleted"),
      });
      setUserDialogOpen(false);
      await fetchSchools();
      await fetchStats(weekOffset);
      await fetchUsers();
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.deleteUser"),
        variant: "destructive",
      });
    }
  };

  const openAssignDirectorDialog = (school: School) => {
    setTargetSchoolForDirector(school);
    setAssignDirectorName("");
    setAssignDirectorEmail("");
    setAssignDirectorPassword("");
    setAssignDirectorDialogOpen(true);
  };

  const handleAssignDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !targetSchoolForDirector) return;
    if (!assignDirectorName || !assignDirectorEmail || !assignDirectorPassword) {
      toast({
        title: ad("toasts.insufficient"),
        description: ad("schools.assignDirector.validation.required"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/schools/${targetSchoolForDirector._id}/director`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          directorName: assignDirectorName,
          directorEmail: assignDirectorEmail,
          directorPassword: assignDirectorPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.assignDirector"));

      toast({
        title: ad("toasts.success"),
        description: ad("schools.assignDirector.success"),
      });
      setAssignDirectorDialogOpen(false);
      setTargetSchoolForDirector(null);
      await fetchSchools();
      await fetchStats(weekOffset);
      if (section === "users") {
        await fetchUsers();
      }
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.assignDirector"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (school: School) => {
    if (!token) return;
    if (!window.confirm(ad("schools.confirmDelete", { schoolName: school.name }))) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/schools/${school._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || ad("errors.deleteSchool"));

      toast({
        title: ad("toasts.deleted"),
        description: ad("schools.deleted", { schoolName: school.name }),
      });

      await fetchSchools();
      await fetchStats(weekOffset);
      if (section === "users") {
        await fetchUsers();
      }
    } catch (err: unknown) {
      toast({
        title: ad("toasts.error"),
        description: err instanceof Error ? err.message : ad("errors.deleteSchool"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatValue = (key: string) => {
    if (!stats) return 0;
    if (key === "schools") return stats.totalSchools;
    if (key === "activeSchools") return stats.schoolsByStatus?.active ?? 0;
    if (key === "schoolsWithoutDirector") return stats.platformOverview?.schoolsWithoutDirector ?? 0;
    if (key === "schoolsWithoutSchoolAdmin") return stats.platformOverview?.schoolsWithoutSchoolAdmin ?? 0;
    if (key === "users") return stats.totalUsers;
    if (key === "newSchoolsLast7Days") return stats.platformOverview?.newSchoolsLast7Days ?? 0;
    return 0;
  };

  const attentionItems = useMemo(() => {
    if (!stats) return [];
    const items: string[] = [];
    const withoutDirector = stats.platformOverview?.schoolsWithoutDirector ?? 0;
    const withoutSchoolAdmin = stats.platformOverview?.schoolsWithoutSchoolAdmin ?? 0;
    const lowActivity = Math.max((stats.totalSchools || 0) - (stats.schoolsByStatus?.active || 0), 0);

    if (withoutDirector > 0) {
      items.push(ad("overview.attention.items.withoutDirector", { count: withoutDirector }));
    }
    if (withoutSchoolAdmin > 0) {
      items.push(ad("overview.attention.items.withoutSchoolAdmin", { count: withoutSchoolAdmin }));
    }
    if (lowActivity > 0) {
      items.push(ad("overview.attention.items.lowActivity", { count: lowActivity }));
    }

    return items;
  }, [ad, stats]);

  const headerNotifications = useMemo<AdminHeaderNotification[]>(() => {
    const next: AdminHeaderNotification[] = [];
    const ts = new Date(nowMs).toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    attentionItems.slice(0, 4).forEach((item, index) => {
      next.push({
        id: `admin:attention:${index}:${item}`,
        text: item,
        at: ts,
        section: "overview",
      });
    });

    const now = nowMs;
    subscriptionsForOverviewUI.slice(0, 4).forEach((subscription) => {
      const endTime = new Date(subscription.endAt).getTime();
      const diffMs = endTime - now;
      const expired = diffMs <= 0;
      const daysLeft = expired ? 0 : Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
      next.push({
        id: `admin:subscription:${subscription.schoolId}:${subscription.endAt}`,
        text: expired
          ? ad("notifications.subscriptionExpired", { schoolName: subscription.schoolName })
          : ad("notifications.subscriptionEnding", { schoolName: subscription.schoolName, daysLeft }),
        at: ts,
        section: "subscriptions",
      });
    });

    if ((stats?.platformOverview?.schoolsWithoutSchoolAdmin || 0) > 0) {
      next.push({
        id: `admin:schools-without-school-admin:${stats?.platformOverview?.schoolsWithoutSchoolAdmin}`,
        text: ad("notifications.withoutSchoolAdmin", {
          count: stats?.platformOverview?.schoolsWithoutSchoolAdmin,
        }),
        at: ts,
        section: "schools",
      });
    }

    if ((stats?.platformOverview?.schoolsWithoutDirector || 0) > 0) {
      next.push({
        id: `admin:schools-without-director:${stats?.platformOverview?.schoolsWithoutDirector}`,
        text: ad("notifications.withoutDirector", {
          count: stats?.platformOverview?.schoolsWithoutDirector,
        }),
        at: ts,
        section: "schools",
      });
    }

    return next.slice(0, 8);
  }, [ad, attentionItems, locale, nowMs, stats, subscriptionsForOverviewUI]);

  const searchItems = [
    ...schools.map((s) => ({
      id: s._id,
      title: s.name,
      subtitle: s.address || ad("schools.fallback"),
      section: "schools" as const,
    })),
    ...exams.map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: `${e.className} • ${e.subjectName}`,
      section: "exams" as const,
    })),
    ...users.map((u) => ({
      id: u.id,
      title: u.name,
      subtitle: `${ad(roleLabelKeys[u.role])} • ${u.email}`,
      section: "users" as const,
    })),
  ];

  const topSubscription = subscriptionsForOverviewUI[0];
  const topSubscriptionEnd = topSubscription?.endAt ? new Date(topSubscription.endAt).getTime() : null;
  const topSubscriptionDaysLeft =
    typeof topSubscriptionEnd === "number"
      ? Math.max(0, Math.ceil((topSubscriptionEnd - nowMs) / (24 * 60 * 60 * 1000)))
      : null;
  return (
    <AdminLayout
      title={t("dashboard.admin.title")}
      subtitle={t("dashboard.admin.subtitle")}
      currentSection={section}
      onSectionChange={setSection}
      headerNotifications={headerNotifications}
      searchItems={searchItems}
      subscriptionInfo={{
        planName: topSubscription?.schoolName || "TEST",
        startDate: null,
        endDate: topSubscription?.endAt || null,
        contractNumber: topSubscription ? `SUB-${topSubscription.schoolId?.slice?.(-6) || "000000"}` : "MYS-133891/26",
        status: topSubscriptionDaysLeft === 0 ? "expired" : "active",
        daysLeft: topSubscriptionDaysLeft,
      }}
    >
      <div className="space-y-8">
        {/* Stats cards */}
        {stats && section === "overview" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overviewStatCards.map((card) => (
              <Card
                key={card.key}
                className={`overflow-hidden shadow-sm ${
                  card.key === "schoolsWithoutDirector"
                    ? "cursor-pointer border border-transparent transition-colors hover:border-blue-500"
                    : "border-0"
                }`}
                onClick={card.key === "schoolsWithoutDirector" ? () => setSection("subscriptions") : undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {ad(card.titleKey)}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {card.key !== "schoolsWithoutDirector" && (
                    <div className="text-2xl font-bold">{getStatValue(card.key)}</div>
                  )}
                  {card.key === "schools" && stats?.schoolsByStatus ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ad("overview.active")}: <span className="font-medium text-emerald-600">{stats.schoolsByStatus.active}</span>{" "}
                      · {ad("overview.inactive")}:{" "}
                      <span className="font-medium text-red-500">{stats.schoolsByStatus.inactive}</span>
                    </p>
                  ) : card.key === "schoolsWithoutDirector" && subscriptionsForOverviewUI.length ? (
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {subscriptionsForOverviewUI.slice(0, 2).map((s) => {
                        const endTime = new Date(s.endAt).getTime();
                        const diffMs = endTime - nowMs;
                        const expired = diffMs <= 0;
                        const daysLeft = expired ? 0 : Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

                        return (
                          <div key={s.schoolId}>
                            <span className="text-foreground">{s.schoolName}</span>:{" "}
                            {expired ? <span className="text-red-500">{ad("subscriptions.expired")}</span> : <span>{ad("subscriptions.daysShort", { count: daysLeft })}</span>}
                          </div>
                        );
                      })}
                      {subscriptionsForOverviewUI.length > 2 ? (
                        <div className="text-[11px] text-muted-foreground/80">
                          {ad("common.moreCount", { count: subscriptionsForOverviewUI.length - 2 })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{ad(card.descriptionKey)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Overview content */}
        {section === "overview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{ad("common.statistics")}</h3>
                <p className="text-xs text-muted-foreground">
                  {ad("overview.summaryDescription")}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.6fr,2.4fr]">
              <Card>
              <CardHeader>
                <CardTitle>{ad("overview.title")}</CardTitle>
                <CardDescription>
                  {ad("overview.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {ad("overview.intro")}
                </p>
                {stats?.schoolsByStatus && stats?.platformOverview && (
                  <ul className="mt-3 space-y-1 text-xs">
                    <li>
                      {ad("overview.totalSchools")}:{" "}
                      <span className="font-semibold text-foreground">{stats.totalSchools}</span>
                    </li>
                    <li>
                      {ad("overview.activeSchools")}:{" "}
                      <span className="font-semibold text-emerald-600">
                        {stats.schoolsByStatus.active}
                      </span>
                    </li>
                    <li>
                      {ad("overview.inactiveSchools")}:{" "}
                      <span className="font-semibold text-red-500">
                        {stats.schoolsByStatus.inactive}
                      </span>
                    </li>
                    <li
                      className="cursor-pointer"
                      onClick={() => setSection("subscriptions")}
                      title={ad("overview.goToSubscriptions")}
                    >
                      {ad("overview.subscriptionCount")}:{" "}
                      <span className="font-semibold text-rose-600">{subscriptionsForOverviewUI.length}</span>
                      {subscriptionsForOverviewUI.length ? (
                        <div className="mt-2 space-y-1">
                          {subscriptionsForOverviewUI.slice(0, 2).map((s) => {
                            const endTime = new Date(s.endAt).getTime();
                            const diffMs = endTime - nowMs;
                            const expired = diffMs <= 0;
                            const daysLeft = expired ? 0 : Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

                            return (
                              <div key={s.id} className="text-xs">
                                {s.schoolName}:{" "}
                                {expired ? <span className="text-red-500">{ad("subscriptions.expired")}</span> : ad("subscriptions.daysLeft", { count: daysLeft })}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-muted-foreground">{ad("subscriptions.empty")}</div>
                      )}
                    </li>
                    <li>
                      {ad("overview.withoutAdminSchools")}:{" "}
                      <span className="font-semibold text-amber-600">
                        {stats.platformOverview.schoolsWithoutSchoolAdmin}
                      </span>
                    </li>
                    <li>
                      {ad("overview.newSchoolsLast7Days")}:{" "}
                      <span className="font-semibold text-cyan-600">
                        {stats.platformOverview.newSchoolsLast7Days}
                      </span>
                    </li>
                    <li>
                      {ad("overview.totalUsers")}:{" "}
                      <span className="font-semibold text-foreground">{stats.totalUsers}</span>
                    </li>
                    <li>
                      {ad("overview.totalDirectors")}:{" "}
                      <span className="font-semibold text-foreground">{stats.byRole.director}</span>
                    </li>
                    <li>
                      {ad("overview.totalSchoolAdmins")}:{" "}
                      <span className="font-semibold text-foreground">{stats.byRole.school_admin}</span>
                    </li>
                  </ul>
                )}
              </CardContent>
              </Card>

              <Suspense fallback={<Card><CardContent className="h-64 flex items-center justify-center text-sm text-muted-foreground">{ad("overview.chartLoading")}</CardContent></Card>}>
                <AdminSchoolsChart
                  data={stats?.schoolsLast7Days || []}
                  range={stats?.range}
                  weekOffset={weekOffset}
                  onChangeWeek={handleChangeWeek}
                />
              </Suspense>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{ad("overview.attention.title")}</CardTitle>
                <CardDescription>
                  {ad("overview.attention.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attentionItems.length ? (
                  <div className="space-y-2">
                    {attentionItems.map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {ad("overview.attention.empty")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schools table */}
        {section === "schools" && (
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{ad("schoolsList")}</CardTitle>
              <CardDescription>
                {ad("schools.description")}
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {ad("schools.addNew")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <School className="h-5 w-5" />
                    {ad("schools.createTitle")}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSchool} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">{ad("schools.form.name")}</Label>
                    <Input
                      id="school-name"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder={ad("schools.form.namePlaceholder")}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-address">{ad("schools.form.address")}</Label>
                      <Input
                        id="school-address"
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        placeholder={ad("schools.form.addressPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-phone">{ad("schools.form.phone")}</Label>
                      <Input
                        id="school-phone"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-medium">{ad("schools.form.directorInfo")}</p>
                    <p className="text-xs text-muted-foreground">
                      {ad("schools.form.directorInfoHint")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="director-name">{ad("schools.form.directorName")}</Label>
                        <Input
                          id="director-name"
                          value={directorName}
                          onChange={(e) => setDirectorName(e.target.value)}
                          placeholder={ad("schools.form.directorNamePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="director-email">{ad("common.email")}</Label>
                        <Input
                          id="director-email"
                          type="email"
                          value={directorEmail}
                          onChange={(e) => setDirectorEmail(e.target.value)}
                          placeholder="email@maktab.uz"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="director-password">{ad("common.password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="director-password"
                          type={showDirectorPassword ? "text" : "password"}
                          value={directorPassword}
                          onChange={(e) => setDirectorPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDirectorPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showDirectorPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      {ad("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? ad("common.saving") : ad("common.save")}
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
                  <TableHead>{ad("schools.table.name")}</TableHead>
                  <TableHead>{ad("schools.table.address")}</TableHead>
                  <TableHead>{ad("schools.table.phone")}</TableHead>
                  <TableHead>{ad("schools.table.director")}</TableHead>
                  <TableHead>{ad("schools.table.createdAt")}</TableHead>
                  <TableHead className="w-[120px] text-right">{ad("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <School className="h-12 w-12 opacity-40" />
                        <p className="text-sm font-medium">{ad("schools.empty.title")}</p>
                        <p className="text-xs">{ad("schools.empty.hint")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  schoolsPagination.rows.map((school) => (
                    <TableRow key={school._id} className="group">
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {school.address || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {school.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {school.director ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-normal text-primary hover:bg-transparent hover:underline"
                            onClick={() => openUserDialog((school.director as Director)._id)}
                          >
                            {school.director.name}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="font-normal">
                            {ad("schools.noDirector")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {school.created_at ? new Date(school.created_at).toLocaleDateString(locale) : "—"}
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <div className="flex items-center justify-end gap-1">
                          {school.director ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openUserDialog((school.director as Director)._id)}
                              title={ad("schools.actions.editDirector")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openAssignDirectorDialog(school)}
                              title={ad("schools.actions.assignDirector")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteSchool(school)}
                            title={ad("schools.actions.delete")}
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

            {schoolsPagination.total > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {schoolsPagination.start + 1} - {schoolsPagination.end} / {ad("common.total")}: {schoolsPagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setSchoolsPage((prev) => Math.max(1, prev - 1))}
                    disabled={schoolsPagination.safePage <= 1}
                  >
                    ‹
                  </Button>
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                    {schoolsPagination.safePage}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setSchoolsPage((prev) => Math.min(schoolsPagination.totalPages, prev + 1))}
                    disabled={schoolsPagination.safePage >= schoolsPagination.totalPages}
                  >
                    ›
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <Dialog open={assignDirectorDialogOpen} onOpenChange={setAssignDirectorDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {targetSchoolForDirector
                    ? ad("schools.assignDirector.titleWithSchool", { schoolName: targetSchoolForDirector.name })
                    : ad("schools.assignDirector.title")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAssignDirector} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-director-name">{ad("schools.assignDirector.name")}</Label>
                  <Input
                    id="assign-director-name"
                    value={assignDirectorName}
                    onChange={(e) => setAssignDirectorName(e.target.value)}
                    placeholder={ad("schools.assignDirector.namePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-director-email">{ad("schools.assignDirector.email")}</Label>
                  <Input
                    id="assign-director-email"
                    type="email"
                    value={assignDirectorEmail}
                    onChange={(e) => setAssignDirectorEmail(e.target.value)}
                    placeholder="director@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-director-password">{ad("schools.assignDirector.password")}</Label>
                  <Input
                    id="assign-director-password"
                    type="password"
                    value={assignDirectorPassword}
                    onChange={(e) => setAssignDirectorPassword(e.target.value)}
                    placeholder={ad("schools.assignDirector.passwordPlaceholder")}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? ad("common.saving") : ad("schools.assignDirector.submit")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </Card>
        )}

        {/* Subscriptions */}
        {section === "subscriptions" && (
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>{ad("subscriptions.form.submit")}</CardTitle>
                <CardDescription>{ad("subscriptions.description")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCreateSubscription} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subscription-school">{ad("subscriptions.form.school")}</Label>
                  <select
                    id="subscription-school"
                    value={subscriptionSchoolId}
                    onChange={(e) => setSubscriptionSchoolId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="" disabled>
                      {ad("subscriptions.form.schoolPlaceholder")}
                    </option>
                    {schools.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscription-days">{ad("subscriptions.form.days")}</Label>
                  <Input
                    id="subscription-days"
                    type="number"
                    min={1}
                    step={1}
                    value={subscriptionDays}
                    onChange={(e) => setSubscriptionDays(Number.parseInt(e.target.value || "0", 10))}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={subscriptionsSubmitting || !subscriptionSchoolId || subscriptionDays < 1 || schools.length === 0}
                >
                  {subscriptionsSubmitting ? ad("common.saving") : ad("subscriptions.form.submit")}
                </Button>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{ad("subscriptions.listTitle")}</h3>
                  {subscriptionsLoading && <p className="text-xs text-muted-foreground">{ad("common.loading")}</p>}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ad("subscriptions.table.school")}</TableHead>
                      <TableHead>{ad("subscriptions.table.endDate")}</TableHead>
                      <TableHead className="text-right">{ad("subscriptions.table.daysLeft")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                          {ad("subscriptions.loading")}
                        </TableCell>
                      </TableRow>
                    ) : subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <School className="h-10 w-10 opacity-40" />
                            <p className="text-sm font-medium">{ad("subscriptions.empty")}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptionsPagination.rows.map((sub) => {
                        const endTime = new Date(sub.endAt).getTime();
                        const diffMs = endTime - nowMs;
                        const expired = diffMs <= 0;
                        const daysLeft = expired ? 0 : Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.schoolName}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {sub.endAt ? new Date(sub.endAt).toLocaleDateString(locale) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {expired ? (
                                <span className="text-red-500">{ad("subscriptions.expired")}</span>
                              ) : (
                                ad("subscriptions.daysLeft", { count: daysLeft })
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {!subscriptionsLoading && subscriptionsPagination.total > 0 && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      {subscriptionsPagination.start + 1} - {subscriptionsPagination.end} / {ad("common.total")}: {subscriptionsPagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => setSubscriptionsPage((prev) => Math.max(1, prev - 1))}
                        disabled={subscriptionsPagination.safePage <= 1}
                      >
                        ‹
                      </Button>
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                        {subscriptionsPagination.safePage}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => setSubscriptionsPage((prev) => Math.min(subscriptionsPagination.totalPages, prev + 1))}
                        disabled={subscriptionsPagination.safePage >= subscriptionsPagination.totalPages}
                      >
                        ›
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {section === "exams" && (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{ad("exams.title")}</CardTitle>
                  <CardDescription>
                    {ad("exams.description")}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void fetchExams()}>
                  {ad("common.refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ad("exams.table.exam")}</TableHead>
                    <TableHead>{ad("table.class")}</TableHead>
                    <TableHead>{ad("table.subject")}</TableHead>
                    <TableHead>{ad("exams.table.duration")}</TableHead>
                    <TableHead>{ad("exams.table.status")}</TableHead>
                    <TableHead className="text-right">{ad("exams.table.results")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        {ad("exams.loading")}
                      </TableCell>
                    </TableRow>
                  ) : exams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        {ad("exams.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    examsPagination.rows.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{exam.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(exam.startTime).toLocaleString(locale)} - {new Date(exam.endTime).toLocaleString(locale)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{exam.className || "—"}</TableCell>
                        <TableCell>{exam.subjectName || "—"}</TableCell>
                        <TableCell>{ad("exams.durationMin", { value: exam.duration })}</TableCell>
                        <TableCell>
                          <Badge variant={exam.isPublished ? "default" : "outline"}>
                            {exam.isPublished ? ad("exams.status.published") : ad("exams.status.draft")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void fetchExamResults(exam.id, exam.title)}
                          >
                            {ad("common.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!examsLoading && examsPagination.total > 0 && (
                <div className="flex items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {examsPagination.start + 1} - {examsPagination.end} / {ad("common.total")}: {examsPagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setExamsPage((prev) => Math.max(1, prev - 1))}
                      disabled={examsPagination.safePage <= 1}
                    >
                      ‹
                    </Button>
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                      {examsPagination.safePage}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setExamsPage((prev) => Math.min(examsPagination.totalPages, prev + 1))}
                      disabled={examsPagination.safePage >= examsPagination.totalPages}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}

              {selectedExamId ? (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-foreground">{ad("exams.results.title", { exam: selectedExamTitle })}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedExamId("");
                        setExamResults([]);
                      }}
                    >
                      {ad("common.close")}
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ad("exams.results.student")}</TableHead>
                        <TableHead>{ad("table.status")}</TableHead>
                        <TableHead>{ad("table.score")}</TableHead>
                        <TableHead>{ad("table.percent")}</TableHead>
                        <TableHead>{ad("exams.results.manualPending")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examResultsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                            {ad("exams.results.loading")}
                          </TableCell>
                        </TableRow>
                      ) : examResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                            {ad("exams.results.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        examResultsPagination.rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{row.studentName}</p>
                                <p className="text-xs text-muted-foreground">{row.studentEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{row.score}/{row.maxScore}</TableCell>
                            <TableCell>{row.gradePercent}%</TableCell>
                            <TableCell>{row.pendingManual}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {!examResultsLoading && examResultsPagination.total > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        {examResultsPagination.start + 1} - {examResultsPagination.end} / {ad("common.total")}: {examResultsPagination.total}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => setExamResultsPage((prev) => Math.max(1, prev - 1))}
                          disabled={examResultsPagination.safePage <= 1}
                        >
                          ‹
                        </Button>
                        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                          {examResultsPagination.safePage}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => setExamResultsPage((prev) => Math.min(examResultsPagination.totalPages, prev + 1))}
                          disabled={examResultsPagination.safePage >= examResultsPagination.totalPages}
                        >
                          ›
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Users table */}
        {section === "users" && (
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>{ad("users.title")}</CardTitle>
                <CardDescription>
                  {ad("users.description")}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full flex-col gap-3 lg:max-w-sm lg:flex-row lg:items-center">
                  <Input
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder={ad("users.searchPlaceholder")}
                    className="w-full lg:max-w-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ad("users.table.user")}</TableHead>
                    <TableHead>{ad("users.table.role")}</TableHead>
                    <TableHead>{ad("users.table.school")}</TableHead>
                    <TableHead>{ad("users.table.createdAt")}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                        {ad("users.loading")}
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Users className="h-10 w-10 opacity-40" />
                          <p className="text-sm font-medium">{ad("users.empty.title")}</p>
                          <p className="text-xs">{ad("users.empty.hint")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersPagination.rows.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ad(roleLabelKeys[user.role])}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.schoolName || ad("users.unassigned")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openUserDialog(user.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!usersLoading && usersPagination.total > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {usersPagination.start + 1} - {usersPagination.end} / {ad("common.total")}: {usersPagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                      disabled={usersPagination.safePage <= 1}
                    >
                      ‹
                    </Button>
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-emerald-600 px-3 text-sm font-medium text-emerald-600">
                      {usersPagination.safePage}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => setUsersPage((prev) => Math.min(usersPagination.totalPages, prev + 1))}
                      disabled={usersPagination.safePage >= usersPagination.totalPages}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* User edit dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="w-[96vw] max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? ad("users.edit.titleWithRole", { role: ad(roleLabelKeys[selectedUser.role]) }) : ad("users.edit.title")}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div className="rounded-2xl border bg-muted/20 p-5">
                <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                  <div className="flex items-start justify-center lg:justify-start">
                    <div className="flex h-[260px] w-[260px] items-center justify-center rounded-full border-4 border-teal-600/90 bg-background">
                      <UserCircle className="h-44 w-44 text-muted-foreground/80" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">{ad("common.fullName")}</Label>
                      <Input
                        id="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{ad("users.table.role")}</Label>
                      <Input value={ad(roleLabelKeys[selectedUser.role])} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>{ad("users.table.school")}</Label>
                      <Input value={selectedUser.schoolName || ad("users.unassigned")} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>{ad("common.username")}</Label>
                      <Input
                        value={(editEmail.split("@")[0] || selectedUser.id).trim()}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Label htmlFor="change-password" className="mb-0">{ad("common.changePassword")}</Label>
                        <input
                          id="change-password"
                          type="checkbox"
                          checked={changePasswordEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setChangePasswordEnabled(enabled);
                            if (!enabled) {
                              setEditPassword("");
                              setConfirmEditPassword("");
                              setShowEditPassword(false);
                              setShowEditPasswordConfirm(false);
                            }
                          }}
                          className="h-5 w-5 cursor-pointer rounded border-muted-foreground/40 accent-teal-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-password">{ad("users.edit.newPasswordLabel")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="edit-password"
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="********"
                          className="pl-10 pr-10"
                          disabled={!changePasswordEnabled}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={!changePasswordEnabled}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-password-confirm">{ad("users.edit.confirmPasswordLabel")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="edit-password-confirm"
                          type={showEditPasswordConfirm ? "text" : "password"}
                          value={confirmEditPassword}
                          onChange={(e) => setConfirmEditPassword(e.target.value)}
                          placeholder="********"
                          className="pl-10 pr-10"
                          disabled={!changePasswordEnabled}
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPasswordConfirm((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={!changePasswordEnabled}
                        >
                          {showEditPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="destructive" onClick={handleDeleteUser}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {ad("common.delete")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                  {ad("common.cancel")}
                </Button>
                <Button type="submit">
                  <Pencil className="mr-2 h-4 w-4" />
                  {ad("common.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDashboard;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, TrendingUp, Bell, CheckCircle, AlertCircle, FileText, MapPin, Pencil, Upload, UserCircle, Camera } from "lucide-react";
import LiveDateTimeBadge from "@/components/dashboard/LiveDateTimeBadge";
import { useTranslation } from "react-i18next";
import ParentLayout, { ParentSection } from "@/components/ParentLayout";
import SectionTitle from "@/components/SectionTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type FaceApiModule = typeof import("@/lib/faceApi");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;

const loadFaceApiModule = async (): Promise<FaceApiModule> => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@/lib/faceApi");
  }

  return faceApiModulePromise;
};

type ChildGrade = {
  subject: string;
  grade: number;
  trend: "up" | "down" | "same";
  date: string;
};

type ChildAttendance = {
  date: string;
  status: "present" | "absent" | "late";
};

type ChildHomework = {
  _id: string;
  subject?: { name?: string };
  description: string;
  deadline: string;
  teacherName?: string;
  attachmentUrl?: string | null;
  attachmentOriginalName?: string | null;
};

type ChildExamResult = {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  status: "submitted" | "awaiting_manual_review" | "evaluated" | "expired" | string;
  totalScore: number;
  maxScore: number;
  gradePercent: number;
  isFinalScore: boolean;
  finishedAt?: string | null;
};

type ParentHeaderNotification = {
  id: string;
  text: string;
  type: "info" | "success" | "warning";
  date: string;
  section: ParentSection;
};

type ParentChatTarget = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
};

type ParentChatThread = {
  id: string;
  targetType: "class_teacher" | "subject_teacher";
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  subjectName?: string;
  lastMessageAt?: string;
  lastSenderRole?: "parent" | "teacher" | null;
};

type ParentChatMessage = {
  id: string;
  senderRole: "parent" | "teacher";
  senderName: string;
  text: string;
  createdAt: string;
};

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");
  const { t: tp, i18n } = useTranslation("parent-dashboard");
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    schoolName?: string;
    schoolAddress?: string;
    photoUrl?: string | null;
  } | null>(null);
  const [section, setSection] = useState<ParentSection>("overview");
  const [grades, setGrades] = useState<ChildGrade[]>([]);
  const [attendance, setAttendance] = useState<ChildAttendance[]>([]);
  const [homework, setHomework] = useState<ChildHomework[]>([]);
  const [examResults, setExamResults] = useState<ChildExamResult[]>([]);
  const [examResultsError, setExamResultsError] = useState<string>("");
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [childName, setChildName] = useState<string | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const parentPhotoInputRef = useRef<HTMLInputElement>(null);
  const [savingProfilePhoto, setSavingProfilePhoto] = useState(false);
  const [savingProfileDetails, setSavingProfileDetails] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
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

  const [classTeacherTarget, setClassTeacherTarget] = useState<ParentChatTarget | null>(null);
  const [chatThreads, setChatThreads] = useState<ParentChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ParentChatMessage[]>([]);
  const [chatMessageText, setChatMessageText] = useState("");
  const [chatLoadingTargets, setChatLoadingTargets] = useState(false);
  const [chatLoadingThreads, setChatLoadingThreads] = useState(false);
  const [chatLoadingMessages, setChatLoadingMessages] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatTargetsError, setChatTargetsError] = useState("");
  const [chatThreadsError, setChatThreadsError] = useState("");
  const uiLocale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ";

  const profileDisplayName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
  const profileLocationSource = (user?.schoolAddress || user?.schoolName || "").trim();
  const profileLocationText = useMemo(() => {
    if (profileForm.cityState.trim()) return profileForm.cityState.trim();
    if (!profileLocationSource) return tp("profile.locationDisplay");
    const parts = profileLocationSource
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
    }
    return profileLocationSource;
  }, [profileForm.cityState, profileLocationSource, tp]);
  const profileLocationHref = `https://www.google.com/maps/search/${encodeURIComponent(profileLocationSource || profileLocationText)}`;

  const buildParentProfileFormFromStorage = useCallback(() => {
    const raw = localStorage.getItem("auth_user");
    const parsed = raw ? JSON.parse(raw) : {};
    const fullName = (parsed?.name || "").toString().trim();
    const parts = fullName.split(" ").filter(Boolean);
    const extrasRaw = localStorage.getItem("parent_profile_meta");
    const extras = extrasRaw ? JSON.parse(extrasRaw) : {};

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      email: (parsed?.email || "").toString(),
      phone: (parsed?.phone || "").toString(),
      bio: (extras?.bio || "").toString(),
      gender: (extras?.gender || "").toString(),
      dateOfBirth: (extras?.dateOfBirth || "").toString(),
      nationalId: (extras?.nationalId || "").toString(),
      country: (extras?.country || "").toString(),
      cityState: (extras?.cityState || "").toString(),
      postalCode: (extras?.postalCode || "").toString(),
      taxId: (extras?.taxId || "").toString(),
    };
  }, []);

  const handleProfileFieldChange = (key: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfileDetails = async () => {
    if (!token) return;

    const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
    if (!fullName || !profileForm.email.trim()) {
      toast({
        title: tp("errors.serverRetry"),
        description: tp("profile.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    setSavingProfileDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("profile.saveFailed"));

      const auth = localStorage.getItem("auth_user");
      if (auth) {
        const parsed = JSON.parse(auth);
        parsed.name = data.name;
        parsed.email = data.email;
        parsed.phone = data.phone ?? null;
        localStorage.setItem("auth_user", JSON.stringify(parsed));
      }

      localStorage.setItem(
        "parent_profile_meta",
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

      const parts = (data.name || "").toString().trim().split(" ").filter(Boolean);
      setProfileForm((prev) => ({
        ...prev,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
        email: (data.email || "").toString(),
        phone: (data.phone || "").toString(),
      }));
      setUser((prev) => (prev ? { ...prev, name: data.name, email: data.email || "", phone: data.phone || "" } : prev));
      setProfileEditMode(false);
      toast({ title: tp("profile.saved") });
    } catch (err) {
      toast({
        title: tp("errors.serverRetry"),
        description: err instanceof Error ? err.message : tp("profile.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingProfileDetails(false);
    }
  };

  const fetchChatTargets = async () => {
    if (!token) return;
    setChatLoadingTargets(true);
    setChatTargetsError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/parent/chat/targets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("errors.chatTargetsLoad"));
      setClassTeacherTarget(data.classTeacher || null);
    } catch (err) {
      setClassTeacherTarget(null);
      setChatTargetsError(
        err instanceof Error ? err.message : tp("errors.serverRetry"),
      );
    } finally {
      setChatLoadingTargets(false);
    }
  };

  const fetchChatThreads = async (silent = false) => {
    if (!token) return;
    if (!silent) setChatLoadingThreads(true);
    if (!silent) setChatThreadsError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/parent/chat/threads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("errors.chatThreadsLoad"));
      setChatThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) {
        setChatThreads([]);
      }
      if (!silent) {
        setChatThreadsError(
          err instanceof Error ? err.message : tp("errors.chatThreadsLoadDesc"),
        );
      }
    } finally {
      if (!silent) setChatLoadingThreads(false);
    }
  };

  const fetchThreadMessages = async (threadId: string, silent = false) => {
    if (!token || !threadId) return;
    if (!silent) setChatLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/parent/chat/threads/${threadId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("errors.messagesLoad"));
      setChatMessages(Array.isArray(data) ? data : []);
    } catch {
      setChatMessages([]);
    } finally {
      if (!silent) setChatLoadingMessages(false);
    }
  };

  const openOrCreateThread = async (payload: {
    targetType: "class_teacher" | "subject_teacher";
    teacherId: string;
    subjectId?: string | null;
  }) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/parent/chat/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("errors.chatOpen"));

      await fetchChatThreads();
      setSelectedThreadId(data.id);
      await fetchThreadMessages(data.id);
    } catch {
      // no-op
    }
  };

  const sendChatMessage = async () => {
    if (!token || !selectedThreadId || !chatMessageText.trim()) return;
    setChatSending(true);
    try {
      const textToSend = chatMessageText.trim();
      const res = await fetch(`${API_BASE_URL}/api/parent/chat/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || tp("errors.messageSend"));
      setChatMessageText("");

      // Show sent message immediately, then sync silently in background.
      setChatMessages((prev) => [
        ...prev,
        {
          id: data.id,
          senderRole: data.senderRole,
          senderName: data.senderName,
          text: data.text,
          createdAt: data.createdAt,
        },
      ]);

      void fetchThreadMessages(selectedThreadId, true);
      void fetchChatThreads(true);
    } catch {
      // no-op
    } finally {
      setChatSending(false);
    }
  };

  useEffect(() => {
    const data = localStorage.getItem("auth_user");
    if (!data) {
      navigate("/login");
      return;
    }
    const parsed = JSON.parse(data);
    if (parsed.role !== "parent") {
      navigate("/login");
      return;
    }
    setUser(parsed);
    setProfileForm(buildParentProfileFormFromStorage());
  }, [navigate]);

  useEffect(() => {
    if (section === "profile") {
      setProfileEditMode(false);
      setProfileForm(buildParentProfileFormFromStorage());
    }
  }, [section, buildParentProfileFormFromStorage]);

  useEffect(() => {
    if (!token) return;

    const fetchGrades = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/parent/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || tp("errors.gradesLoad"));
        }
        const sorted = (data as { grade: number; date?: string; subject?: { name?: string } }[]).sort(
          (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
        );
        const mapped: ChildGrade[] = sorted.map((g, index, arr) => {
            const prev = arr[index + 1];
            let trend: ChildGrade["trend"] = "same";
            if (prev) {
              if (g.grade > prev.grade) trend = "up";
              else if (g.grade < prev.grade) trend = "down";
            }
            return {
              subject: g.subject?.name || tp("fallback.subject"),
              grade: g.grade,
              date: g.date ? new Date(g.date).toISOString().slice(0, 10) : "",
              trend,
            };
          });
        setGrades(mapped);
      } catch {
        // demo fallback: hech nima qilmaymiz, oldingi qiymatlar qoladi
      }
    };

    const fetchChildren = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/parent/children`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || tp("errors.childLoad"));
        }
        const arr = data as { user?: { name?: string } }[];
        if (arr.length > 0) {
          const name = arr[0].user?.name;
          if (name) setChildName(name);
        }
      } catch {
        // agar xato bo'lsa, sarlavha eski ko'rinishda qoladi
      }
    };

    const fetchAttendance = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/parent/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || tp("errors.attendanceLoad"));
        }
        const sorted = (data as { date?: string; status: "present" | "absent" | "late" }[]).sort(
          (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
        );
        const mapped: ChildAttendance[] = sorted.map((a) => ({
          date: a.date ? new Date(a.date).toISOString().slice(0, 10) : "",
          status: a.status,
        }));
        setAttendance(mapped);
      } catch {
        // demo fallback
      }
    };

    const fetchHomework = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/parent/homework`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || tp("errors.homeworkLoad"));
        }

        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: ChildHomework, b: ChildHomework) =>
            new Date(a.deadline || "").getTime() - new Date(b.deadline || "").getTime(),
        );
        setHomework(sorted);
      } catch {
        // demo fallback
      }
    };

    const fetchExamResults = async () => {
      try {
        setExamResultsLoading(true);
        setExamResultsError("");
        const res = await fetch(`${API_BASE_URL}/api/parent/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || tp("errors.examResultsLoad"));
        }

        const sorted = (Array.isArray(data) ? data : []).sort(
          (a: ChildExamResult, b: ChildExamResult) =>
            new Date(b.finishedAt || b.endTime || b.startTime || "").getTime() -
            new Date(a.finishedAt || a.endTime || a.startTime || "").getTime(),
        );
        setExamResults(sorted);
      } catch (err) {
        setExamResults([]);
        setExamResultsError(
          err instanceof Error ? err.message : tp("errors.examResultsLoadDesc"),
        );
      } finally {
        setExamResultsLoading(false);
      }
    };

    fetchGrades();
    fetchChildren();
    fetchAttendance();
    fetchHomework();
    fetchExamResults();
  }, []);

  useEffect(() => {
    if (section !== "support" || !token) return;
    void fetchChatTargets();
    void fetchChatThreads();
  }, [section, token]);

  useEffect(() => {
    if (!token) return;

    void fetchChatThreads(true);
    const id = window.setInterval(() => {
      void fetchChatThreads(true);
    }, 2500);

    return () => window.clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (section !== "support" || !selectedThreadId || !token) return;
    void fetchThreadMessages(selectedThreadId);

    const id = window.setInterval(() => {
      void fetchThreadMessages(selectedThreadId, true);
      void fetchChatThreads(true);
    }, 2500);

    return () => window.clearInterval(id);
  }, [section, selectedThreadId, token]);

  const averageGrade =
    grades.length > 0
      ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(1)
      : "—";

  const attendancePercent =
    attendance.length > 0
      ? `${Math.round(
          (attendance.filter((a) => a.status === "present" || a.status === "late").length /
            attendance.length) *
            100,
        )}%`
      : "—";

  const subjectsCount =
    grades.length > 0 ? new Set(grades.map((g) => g.subject)).size.toString() : "—";

  const notifications = useMemo<ParentHeaderNotification[]>(() => {
    const now = new Date().toISOString().slice(0, 10);
    const next: ParentHeaderNotification[] = [];

    if (grades.length > 0) {
      const latestGrade = grades[0];
      next.push({
        id: `parent:grade:${latestGrade.subject}:${latestGrade.date}`,
        text: tp("notifications.newGrade", { subject: latestGrade.subject, grade: latestGrade.grade }),
        type: latestGrade.grade >= 4 ? "success" : "warning",
        date: latestGrade.date || now,
        section: "grades",
      });
    }

    if (attendance.length > 0) {
      const latestAttendance = attendance[0];
      next.push({
        id: `parent:attendance:${latestAttendance.date}:${latestAttendance.status}`,
        text:
          latestAttendance.status === "present"
            ? tp("notifications.attendancePresent")
            : latestAttendance.status === "late"
            ? tp("notifications.attendanceLate")
            : tp("notifications.attendanceAbsent"),
        type: latestAttendance.status === "present" ? "success" : "warning",
        date: latestAttendance.date || now,
        section: "attendance",
      });
    }

    if (grades.length > 0) {
      const average = grades.reduce((sum, gradeItem) => sum + gradeItem.grade, 0) / grades.length;
      next.push({
        id: `parent:average:${average.toFixed(2)}`,
        text:
          average >= 4
            ? tp("notifications.progressGood")
            : tp("notifications.progressWarn"),
        type: average >= 4 ? "info" : "warning",
        date: now,
        section: "overview",
      });
    }

    if (examResults.length > 0) {
      const latestExam = examResults[0];
      next.push({
        id: `parent:exam:${latestExam.id}`,
        text: latestExam.isFinalScore
          ? tp("notifications.examResult", { title: latestExam.examTitle, score: latestExam.totalScore, max: latestExam.maxScore })
          : tp("notifications.examChecking", { title: latestExam.examTitle }),
        type: latestExam.isFinalScore ? "success" : "info",
        date: (latestExam.finishedAt || latestExam.endTime || now).slice(0, 10),
        section: "exams",
      });
    }

    const chatAlerts = [...chatThreads]
      .filter((thread) => Boolean(thread.lastMessageAt) && thread.lastSenderRole === "teacher")
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt || "").getTime() - new Date(a.lastMessageAt || "").getTime(),
      )
      .slice(0, 3);

    chatAlerts.forEach((thread) => {
      const at = thread.lastMessageAt || now;
      next.push({
        id: `parent:chat:${thread.id}:${at}`,
        text: tp("notifications.newMessage", { teacher: thread.teacherName }),
        type: "info",
        date: at,
        section: "support",
      });
    });

    if (next.length === 0) {
      next.push({
        id: "parent:empty",
        text: tp("notifications.empty"),
        type: "info",
        date: now,
        section: "notifications",
      });
    }

    return next.slice(0, 8);
  }, [attendance, grades, examResults, chatThreads]);

  const notificationsCount = notifications.length.toString();
  const searchItems = [
    ...grades.map((g, idx) => ({
      id: `${idx}-${g.date}`,
      title: g.subject,
      subtitle: tp("search.grade", { grade: g.grade }),
      section: "grades" as const,
    })),
    ...attendance.map((a, idx) => ({
      id: `${idx}-${a.date}-${a.status}`,
      title: childName ? tp("search.childAttendance", { child: childName }) : tp("search.attendanceTitle"),
      subtitle: `${a.date} • ${a.status}`,
      section: "attendance" as const,
    })),
    ...notifications.map((n) => ({
      id: n.id,
      title: n.text,
      subtitle: n.date,
      section: "notifications" as const,
    })),
    ...homework.map((h) => ({
      id: h._id,
      title: h.subject?.name || tp("fallback.homework"),
      subtitle: h.description,
      section: "homework" as const,
    })),
    ...examResults.map((exam) => ({
      id: exam.id,
      title: exam.examTitle,
      subtitle: exam.isFinalScore
        ? tp("search.examResult", { score: exam.totalScore, max: exam.maxScore })
        : tp("search.checking"),
      section: "exams" as const,
    })),
    ...chatThreads.map((thread) => ({
      id: `chat-${thread.id}`,
      title: thread.teacherName,
      subtitle: thread.targetType === "class_teacher" ? tp("support.classTeacher") : thread.subjectName || tp("support.subjectTeacher"),
      section: "support" as const,
    })),
  ];

  if (!user) return null;

  return (
    <ParentLayout
      title={t("dashboard.parent.title")}
      subtitle={
        childName
          ? t("dashboard.parent.subtitleWithChild", { child: childName })
          : user.schoolName
            ? t("dashboard.parent.subtitleWithSchool", { school: user.schoolName })
            : t("dashboard.parent.subtitleDefault")
      }
      currentSection={section}
      onSectionChange={setSection}
      headerNotifications={notifications.map((item) => ({
        id: item.id,
        text: item.text,
        at: item.date,
        section: item.section,
      }))}
      searchItems={searchItems}
    >
      <div className="space-y-10">
        {section === "overview" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{tp("overview.statsTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {tp("overview.statsDesc")}
                </p>
              </div>
              <LiveDateTimeBadge />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: TrendingUp, label: tp("overview.avgGrade"), value: averageGrade, color: "gradient-secondary" },
                { icon: CalendarDays, label: tp("overview.attendance"), value: attendancePercent, color: "gradient-primary" },
                { icon: BookOpen, label: tp("overview.subjects"), value: subjectsCount, color: "gradient-accent" },
                { icon: Bell, label: tp("overview.notifications"), value: notificationsCount, color: "gradient-primary" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`${stat.color} rounded-lg p-2.5`}>
                        <stat.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {section === "overview" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Overview preview for Notifications */}
            <div>
              <SectionTitle title={tp("notifications.title")} centered={false} />
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-3 flex items-start gap-3">
                        {n.type === "success" ? (
                          <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                        ) : n.type === "warning" ? (
                          <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{n.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Overview preview for Attendance (today + last 7 days) */}
            <div className="space-y-3">
              <SectionTitle title={tp("attendance.todayTitle")} centered={false} />

              {attendance.length === 0 ? (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                  {tp("attendance.todayEmpty")}
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-lg border bg-muted/40 px-4 py-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      attendance[0].status === "present"
                        ? "bg-emerald-500 text-emerald-50"
                        : attendance[0].status === "absent"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-amber-400 text-amber-950"
                    }`}
                  >
                    {attendance[0].status === "present"
                      ? "✓"
                      : attendance[0].status === "absent"
                        ? "✗"
                        : "K"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {attendance[0].status === "present"
                        ? tp("attendance.statusToday.present")
                        : attendance[0].status === "absent"
                          ? tp("attendance.statusToday.absent")
                          : tp("attendance.statusToday.late")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{tp("attendance.date", { date: attendance[0].date })}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(section === "overview" || section === "grades") && (
          <div>
            <SectionTitle title={section === "overview" ? tp("grades.todayTitle") : tp("grades.title")} centered={false} />
            <div className="space-y-2">
            {(section === "overview" ? grades.slice(0, 3) : grades).map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm">{g.subject}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            g.grade === 5
                              ? "bg-emerald-600 text-emerald-50"
                              : g.grade === 4
                                ? "bg-primary text-primary-foreground"
                                : "bg-destructive text-destructive-foreground"
                          }`}
                        >
                          {g.grade}
                        </span>
                        <span
                          className={`text-xs ${
                            g.trend === "up"
                              ? "text-emerald-600"
                              : g.trend === "down"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {g.trend === "up" ? "↑" : g.trend === "down" ? "↓" : "—"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {section === "homework" && (
          <div className="space-y-3">
            <SectionTitle title={tp("homework.title")} centered={false} />
            {!homework.length ? (
              <p className="text-xs text-muted-foreground">
                {tp("homework.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {homework.map((hw, i) => (
                  <motion.div
                    key={hw._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card>
                      <CardContent className="p-3 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{hw.subject?.name || tp("fallback.subject")}</p>
                          <p className="text-xs text-muted-foreground">{hw.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {tp("homework.teacher", { name: hw.teacherName || "—" })}
                          </p>
                          {hw.attachmentUrl ? (
                            <a
                              href={hw.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              {hw.attachmentOriginalName || tp("homework.openFile")}
                            </a>
                          ) : null}
                        </div>
                        <Badge variant="outline">{tp("homework.deadline", { date: new Date(hw.deadline).toLocaleDateString(uiLocale) })}</Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "exams" && (
          <div className="space-y-3">
            <SectionTitle title={tp("exams.title")} centered={false} />

            {!examResults.length ? (
              examResultsLoading ? (
                <p className="text-xs text-muted-foreground">{tp("exams.loading")}</p>
              ) : examResultsError ? (
                <p className="text-xs text-destructive">{examResultsError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {tp("exams.empty")}
                </p>
              )
            ) : (
              <div className="space-y-2">
                {examResults.map((examResult, i) => (
                  <motion.div
                    key={examResult.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card>
                      <CardContent className="p-3 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{examResult.examTitle}</p>
                          <p className="text-xs text-muted-foreground">{tp("exams.subject", { subject: examResult.subjectName || tp("fallback.subject") })}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(examResult.startTime).toLocaleString(uiLocale)} - {new Date(examResult.endTime).toLocaleString(uiLocale)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={examResult.isFinalScore ? "default" : "outline"}>
                            {examResult.status === "evaluated"
                              ? tp("exams.status.evaluated")
                              : examResult.status === "awaiting_manual_review"
                              ? tp("exams.status.awaiting")
                              : examResult.status === "expired"
                              ? tp("exams.status.expired")
                              : tp("exams.status.completed")}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">
                            {examResult.isFinalScore
                              ? `${examResult.totalScore}/${examResult.maxScore} (${examResult.gradePercent}%)`
                              : tp("exams.resultPending")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "support" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card>
              <CardContent className="p-3 space-y-3">
                <SectionTitle title={tp("support.targetsTitle")} centered={false} />
                {chatLoadingTargets ? (
                  <p className="text-xs text-muted-foreground">{tp("common.loading")}</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{tp("support.classTeacher")}</p>
                      {chatTargetsError ? (
                        <p className="text-xs text-destructive">{chatTargetsError}</p>
                      ) : classTeacherTarget ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() =>
                            void openOrCreateThread({
                              targetType: "class_teacher",
                              teacherId: classTeacherTarget.teacherId,
                            })
                          }
                        >
                          {classTeacherTarget.teacherName}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">{tp("support.classTeacherMissing")}</p>
                      )}
                    </div>

                  </>
                )}

                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">{tp("support.myChats")}</p>
                  {chatLoadingThreads ? (
                    <p className="text-xs text-muted-foreground">{tp("common.loading")}</p>
                  ) : chatThreadsError ? (
                    <p className="text-xs text-destructive">{chatThreadsError}</p>
                  ) : chatThreads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{tp("support.noChats")}</p>
                  ) : (
                    <div className="max-h-48 overflow-auto space-y-2">
                      {chatThreads.map((thread) => (
                        <Button
                          key={thread.id}
                          type="button"
                          variant={selectedThreadId === thread.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => {
                            setSelectedThreadId(thread.id);
                            void fetchThreadMessages(thread.id);
                          }}
                        >
                          {thread.teacherName}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-3">
                <SectionTitle title={tp("support.chatTitle")} centered={false} />
                {!selectedThreadId ? (
                  <p className="text-xs text-muted-foreground">{tp("support.selectTeacher")}</p>
                ) : (
                  <>
                    <div className="h-80 overflow-auto rounded-md border p-2 space-y-2 bg-muted/20">
                      {chatLoadingMessages ? (
                        <p className="text-xs text-muted-foreground">{tp("support.messagesLoading")}</p>
                      ) : chatMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{tp("support.noMessages")}</p>
                      ) : (
                        chatMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                              m.senderRole === "parent"
                                ? "ml-auto bg-primary text-primary-foreground"
                                : "mr-auto bg-background border"
                            }`}
                          >
                            <p className="text-xs opacity-80 mb-1">{m.senderName}</p>
                            <p>{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={chatMessageText}
                        onChange={(e) => setChatMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void sendChatMessage();
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        placeholder={tp("support.messagePlaceholder")}
                      />
                      <Button type="button" disabled={chatSending || !chatMessageText.trim()} onClick={() => void sendChatMessage()}>
                        {chatSending ? tp("common.sending") : tp("support.send")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {section === "notifications" && (
          <div>
            <SectionTitle title={tp("notifications.title")} centered={false} />
            <div className="space-y-2">
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-3 flex items-start gap-3">
                      {n.type === "success" ? (
                        <CheckCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                      ) : n.type === "warning" ? (
                        <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      ) : (
                        <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {section === "attendance" && (
          <div className="space-y-3">
            <SectionTitle title={tp("attendance.title")} centered={false} />

            {!attendance.length ? (
              <p className="text-xs text-muted-foreground">
                {tp("attendance.empty")}
              </p>
            ) : (
              <>
                {/* Bugungi kunning yakuniy statusi (eng so'nggi yozuv) */}
                <div className="flex items-center gap-4 rounded-lg border bg-muted/40 px-4 py-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      attendance[0].status === "present"
                        ? "bg-emerald-500 text-emerald-50"
                        : attendance[0].status === "absent"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-amber-400 text-amber-950"
                    }`}
                  >
                    {attendance[0].status === "present"
                      ? "✓"
                      : attendance[0].status === "absent"
                        ? "✗"
                        : "K"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {attendance[0].status === "present"
                        ? tp("attendance.statusToday.present")
                        : attendance[0].status === "absent"
                          ? tp("attendance.statusToday.absent")
                          : tp("attendance.statusToday.late")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {tp("attendance.date", { date: attendance[0].date })}
                    </p>
                  </div>
                </div>

                {/* So'nggi 7 kun bo'yicha sodda ro'yxat */}
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {tp("attendance.last7days")}
                  </p>
                  <div className="rounded-md border bg-background">
                    {attendance.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 border-b last:border-b-0 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground w-24 text-center whitespace-nowrap">
                          {a.date}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              a.status === "present"
                                ? "bg-emerald-500 text-emerald-50"
                                : a.status === "absent"
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-amber-400 text-amber-950"
                            }`}
                          >
                            {a.status === "present" ? "✓" : a.status === "absent" ? "✗" : "K"}
                          </span>
                          <span className="text-foreground">
                            {a.status === "present"
                              ? tp("attendance.statusShort.present")
                              : a.status === "absent"
                                ? tp("attendance.statusShort.absent")
                                : tp("attendance.statusShort.late")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {section === "profile" && (
          <Card className="border-slate-200 bg-slate-50/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl font-semibold">{tp("profile.information")}</CardTitle>
                <input
                  ref={parentPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file?.type.startsWith("image/") || !token) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const dataUrl = reader.result as string;
                      setSavingProfilePhoto(true);
                      try {
                        const faceDescriptor = await (await loadFaceApiModule()).getDescriptorFromImage(dataUrl);
                        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ photoUrl: dataUrl, faceDescriptor: faceDescriptor ?? undefined }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message || tp("profile.saveFailed"));

                        const auth = localStorage.getItem("auth_user");
                        if (auth) {
                          const parsed = JSON.parse(auth);
                          parsed.photoUrl = data.photoUrl || null;
                          localStorage.setItem("auth_user", JSON.stringify(parsed));
                        }
                        setUser((prev) => (prev ? { ...prev, photoUrl: data.photoUrl || null } : prev));
                        toast({ title: tp("profile.photoSaved") });
                      } catch (err) {
                        toast({
                          title: tp("errors.serverRetry"),
                          description: err instanceof Error ? err.message : tp("profile.saveFailed"),
                          variant: "destructive",
                        });
                      } finally {
                        setSavingProfilePhoto(false);
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />

                {profileEditMode ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfileForm(buildParentProfileFormFromStorage());
                        setProfileEditMode(false);
                      }}
                      disabled={savingProfileDetails}
                      className="rounded-full px-4"
                    >
                      {tp("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveProfileDetails}
                      disabled={savingProfileDetails}
                      className="rounded-full px-4"
                    >
                      {savingProfileDetails ? tp("common.sending") : tp("common.save")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setProfileEditMode(true)}
                    className="rounded-full px-4"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {tp("profile.edit")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 rounded-2xl border bg-background p-5">
              <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-center">
                <div className="flex items-start justify-center lg:justify-start">
                  <div className="group relative h-[260px] w-[260px]">
                    <Avatar className="h-[260px] w-[260px] border-4 border-teal-600/90 bg-background">
                      {user?.photoUrl ? (
                        <AvatarImage src={user.photoUrl} alt={tp("profile.imageAlt")} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-slate-100 text-muted-foreground">
                        <UserCircle className="h-40 w-40" />
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => parentPhotoInputRef.current?.click()}
                      disabled={savingProfilePhoto || savingProfileDetails}
                      aria-label={tp("profile.changePhoto")}
                      title={tp("profile.changePhoto")}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-9 w-9 text-teal-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{profileDisplayName || tp("profile.namePlaceholder")}</p>
                  <p className="mt-1 text-base text-muted-foreground">{profileForm.email || "-"}</p>
                  <a
                    href={profileLocationHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    <MapPin className="h-4 w-4" />
                    {profileLocationText}
                  </a>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{tp("profile.personalDetails")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.firstName")}</label>
                    <input value={profileForm.firstName} onChange={(e) => handleProfileFieldChange("firstName", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.lastName")}</label>
                    <input value={profileForm.lastName} onChange={(e) => handleProfileFieldChange("lastName", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.emailAddress")}</label>
                    <input value={profileForm.email} onChange={(e) => handleProfileFieldChange("email", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.phone")}</label>
                    <input value={profileForm.phone} onChange={(e) => handleProfileFieldChange("phone", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.bio")}</label>
                    <input value={profileForm.bio} onChange={(e) => handleProfileFieldChange("bio", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.gender")}</label>
                    <input value={profileForm.gender} onChange={(e) => handleProfileFieldChange("gender", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.dateOfBirth")}</label>
                    <input value={profileForm.dateOfBirth} onChange={(e) => handleProfileFieldChange("dateOfBirth", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.nationalId")}</label>
                    <input value={profileForm.nationalId} onChange={(e) => handleProfileFieldChange("nationalId", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{tp("profile.address")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.country")}</label>
                    <input value={profileForm.country} onChange={(e) => handleProfileFieldChange("country", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.cityState")}</label>
                    <input value={profileForm.cityState || profileLocationText} onChange={(e) => handleProfileFieldChange("cityState", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.postalCode")}</label>
                    <input value={profileForm.postalCode} onChange={(e) => handleProfileFieldChange("postalCode", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{tp("profile.taxId")}</label>
                    <input value={profileForm.taxId} onChange={(e) => handleProfileFieldChange("taxId", e.target.value)} readOnly={!profileEditMode} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ParentLayout>
  );
};

export default ParentDashboard;

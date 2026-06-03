import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Users, BookOpen, ClipboardList, Clock, CheckSquare, Pencil, Trash2, Eye, EyeOff, Upload, UserCircle, MapPin, Camera } from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import SectionTitle from "@/components/SectionTitle";
import UnifiedProfileSection from "@/components/dashboard/UnifiedProfileSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatSkeleton, ListSkeleton, StatsCardsSkeleton } from "@/components/ui/skeletons";
import LiveDateTimeBadge from "@/components/dashboard/LiveDateTimeBadge";
import TeacherAttendanceOverviewChart from "@/components/teacher/TeacherAttendanceOverviewChart";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TeacherSection = "overview" | "students" | "classes" | "grades" | "homework" | "exams" | "schedule" | "faceAttendance" | "profile" | "support";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const RENDER_LEGACY_PROFILE = Boolean(import.meta.env.VITE_RENDER_LEGACY_PROFILE);
const SUBSCRIPTION_BLOCKED_SECTIONS = new Set<TeacherSection>(["grades", "homework", "exams", "schedule"]);

const timetableDays = [
  { value: 1, labelKey: "days.monday" },
  { value: 2, labelKey: "days.tuesday" },
  { value: 3, labelKey: "days.wednesday" },
  { value: 4, labelKey: "days.thursday" },
  { value: 5, labelKey: "days.friday" },
  { value: 6, labelKey: "days.saturday" },
  { value: 0, labelKey: "days.sunday" },
];

type ClassRow = {
  _id: string;
  name: string;
  studentCount?: number;
  isHomeroom?: boolean;
};

type StudentRow = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string | null;
  classId?: string;
  className?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
};

type GradeRow = {
  id: string;
  studentName: string;
  className: string;
  subjectName: string;
  grade: number;
  date: string;
  rawDate?: string;
  canEdit: boolean;
};

type TimetableRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  className: string;
  subjectName: string;
};

type HomeworkRow = {
  id: string;
  classId?: string | null;
  className: string;
  subjectName: string;
  description: string;
  deadline: string;
  attachmentUrl?: string | null;
  attachmentOriginalName?: string | null;
  canEdit?: boolean;
  submissionCount?: number;
  totalStudents?: number;
  pendingCount?: number;
  lastSubmittedAt?: string | null;
  submissions?: Array<{
    id: string;
    studentId?: string | null;
    studentName: string;
    studentEmail?: string;
    answerText?: string;
    attachmentUrl?: string | null;
    attachmentOriginalName?: string | null;
    submittedAt?: string;
    gradedScore?: number | null;
    gradingComment?: string;
    gradedAt?: string | null;
  }>;
};

type ExamRow = {
  id: string;
  title: string;
  className: string;
  subjectName: string;
  duration: number;
  startTime: string;
  endTime: string;
  isPublished: boolean;
};

type ExamResultAttemptRow = {
  id: string;
  studentId?: string | null;
  studentName: string;
  studentEmail?: string;
  status: string;
  score: number;
  maxScore: number;
  gradePercent: number;
  checkedAnswers: number;
  pendingManual: number;
  isFinalScore: boolean;
};

type ExamReviewAnswerRow = {
  answerId: string | null;
  questionId: string;
  order: number;
  questionText: string;
  type: "test" | "text";
  correctAnswerKey: string | null;
  correctAnswerText: string | null;
  answerText: string;
  awardedScore: number | null;
  maxScore: number;
  needsManualReview: boolean;
  gradingComment: string;
  evaluatedAt: string | null;
};

type ExamQuestionViewRow = {
  id: string;
  order: number;
  questionText: string;
  type: "test" | "text";
  points: number;
  options: Array<{ key: string; text: string }>;
  correctAnswer: string | null;
};

type TeacherHeaderNotification = {
  id: string;
  text: string;
  at: string;
  section: TeacherSection;
};

type TeacherSubscriptionStatus = {
  startAt?: string | null;
  endAt?: string | null;
  daysLeft?: number | null;
  isExpired?: boolean;
};

type TeacherChatThread = {
  id: string;
  targetType: "class_teacher" | "subject_teacher";
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
  subjectName: string;
  lastMessageAt?: string;
  lastSenderRole?: "parent" | "teacher" | null;
};

type TeacherChatMessage = {
  id: string;
  senderRole: "parent" | "teacher";
  senderName: string;
  text: string;
  createdAt: string;
};

type FaceApiModule = typeof import("@/lib/faceApi");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;

const loadFaceApiModule = async (): Promise<FaceApiModule> => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@/lib/faceApi");
  }

  return faceApiModulePromise;
};

const normalizeOptionKey = (value?: string | null) => (value || "").toString().trim().toUpperCase();

const TeacherDashboard = () => {
  const { t } = useTranslation("dashboard");
  const { t: td, i18n } = useTranslation("teacher-dashboard");
  const { toast } = useToast();
  const [isTeacher, setIsTeacher] = useState(false);
  const [section, setSection] = useState<TeacherSection>("overview");
  const [teacherSubscription, setTeacherSubscription] = useState<TeacherSubscriptionStatus | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [attendanceDayDate, setAttendanceDayDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [attendanceRowStatus, setAttendanceRowStatus] = useState<Record<string, "present" | "absent" | "late">>({});
  const [savingClassAttendance, setSavingClassAttendance] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [showNewStudentPassword, setShowNewStudentPassword] = useState(false);

  const [newParentName, setNewParentName] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editClassId, setEditClassId] = useState("");

  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const editStudentPhotoInputRef = React.useRef<HTMLInputElement>(null);

  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string | null>(null);
  const [savingTeacherProfile, setSavingTeacherProfile] = useState(false);
  const [teacherProfileEditMode, setTeacherProfileEditMode] = useState(false);
  const [savingTeacherProfileDetails, setSavingTeacherProfileDetails] = useState(false);
  const [teacherProfileForm, setTeacherProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "teacher",
    gender: "",
    dateOfBirth: "",
    nationalId: "",
    country: "",
    cityState: "",
    postalCode: "",
    taxId: "",
  });
  const teacherPhotoInputRef = React.useRef<HTMLInputElement>(null);

  const faceVideoRef = React.useRef<HTMLVideoElement>(null);
  const faceStreamRef = React.useRef<MediaStream | null>(null);
  const [faceClassId, setFaceClassId] = useState("");
  const [faceResult, setFaceResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceCameraOn, setFaceCameraOn] = useState(false);

  const [classStudentsDialogOpen, setClassStudentsDialogOpen] = useState(false);
  const [classForDialog, setClassForDialog] = useState<ClassRow | null>(null);

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradesClassId, setGradesClassId] = useState<string>("");
  const [newGradeStudentId, setNewGradeStudentId] = useState<string>("");
  const [newGradeValue, setNewGradeValue] = useState<string>("");
  const [newGradeDate, setNewGradeDate] = useState<string>("");
  const [editGradeDialogOpen, setEditGradeDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeRow | null>(null);
  const [editGradeValue, setEditGradeValue] = useState<string>("");
  const [editGradeDate, setEditGradeDate] = useState<string>("");

  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [attendanceStatsRange, setAttendanceStatsRange] = useState<"1d" | "1w" | "1m">("1w");
  const [attendanceStatsSeries, setAttendanceStatsSeries] = useState<
    { bucket: string; presentLate: number; absent: number }[]
  >([]);
  const [attendanceStatsBucket, setAttendanceStatsBucket] = useState<"hour" | "day">("day");
  const [loadingAttendanceStats, setLoadingAttendanceStats] = useState(false);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [homeworkClassId, setHomeworkClassId] = useState<string>("");
  const [newHomeworkClassId, setNewHomeworkClassId] = useState<string>("");
  const [newHomeworkDescription, setNewHomeworkDescription] = useState<string>("");
  const [newHomeworkDeadline, setNewHomeworkDeadline] = useState<string>("");
  const [newHomeworkFile, setNewHomeworkFile] = useState<File | null>(null);
  const [editHomeworkDialogOpen, setEditHomeworkDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkRow | null>(null);
  const [editHomeworkClassId, setEditHomeworkClassId] = useState<string>("");
  const [editHomeworkDescription, setEditHomeworkDescription] = useState<string>("");
  const [editHomeworkDeadline, setEditHomeworkDeadline] = useState<string>("");
  const [editHomeworkFile, setEditHomeworkFile] = useState<File | null>(null);
  const [submissionMonitorOpen, setSubmissionMonitorOpen] = useState(false);
  const [submissionMonitorHomework, setSubmissionMonitorHomework] = useState<HomeworkRow | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionExamId, setQuestionExamId] = useState<string>("");
  const [questionExamTitle, setQuestionExamTitle] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"test" | "text">("test");
  const [questionPoints, setQuestionPoints] = useState("5");
  const [questionOptionA, setQuestionOptionA] = useState("");
  const [questionOptionB, setQuestionOptionB] = useState("");
  const [questionOptionC, setQuestionOptionC] = useState("");
  const [questionOptionD, setQuestionOptionD] = useState("");
  const [questionCorrectOption, setQuestionCorrectOption] = useState("A");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [viewQuestionsDialogOpen, setViewQuestionsDialogOpen] = useState(false);
  const [viewQuestionsExamTitle, setViewQuestionsExamTitle] = useState("");
  const [viewQuestionsRows, setViewQuestionsRows] = useState<ExamQuestionViewRow[]>([]);
  const [viewQuestionsLoading, setViewQuestionsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>("");
  const [examResults, setExamResults] = useState<ExamResultAttemptRow[]>([]);
  const [loadingExamResults, setLoadingExamResults] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewExamId, setReviewExamId] = useState<string>("");
  const [reviewAttemptId, setReviewAttemptId] = useState<string>("");
  const [reviewStudentName, setReviewStudentName] = useState<string>("");
  const [reviewAnswers, setReviewAnswers] = useState<ExamReviewAnswerRow[]>([]);
  const [loadingReviewAnswers, setLoadingReviewAnswers] = useState(false);
  const [savingReviewAll, setSavingReviewAll] = useState(false);
  const [chatThreads, setChatThreads] = useState<TeacherChatThread[]>([]);
  const [chatMessages, setChatMessages] = useState<TeacherChatMessage[]>([]);
  const [chatSelectedThreadId, setChatSelectedThreadId] = useState("");
  const [chatMessageText, setChatMessageText] = useState("");
  const [chatLoadingThreads, setChatLoadingThreads] = useState(false);
  const [chatLoadingMessages, setChatLoadingMessages] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [gradeSubmissionDialogOpen, setGradeSubmissionDialogOpen] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradingSubmissionStudentName, setGradingSubmissionStudentName] = useState("");
  const [gradingSubmissionScore, setGradingSubmissionScore] = useState("");
  const [gradingSubmissionComment, setGradingSubmissionComment] = useState("");
  const [gradingSubmissionSaving, setGradingSubmissionSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const authUserRaw = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
  const profileDisplayName = `${teacherProfileForm.firstName} ${teacherProfileForm.lastName}`.trim();
  const profileFirstName = teacherProfileForm.firstName;
  const profileLastName = teacherProfileForm.lastName;
  const profileEmail = teacherProfileForm.email;
  const profilePhone = teacherProfileForm.phone;
  const profileBio = teacherProfileForm.bio;
  const profileLocationSource = (authUser?.schoolAddress || authUser?.schoolName || "").toString().trim();
  const profileLocationText = (() => {
    const manual = (teacherProfileForm.cityState || "").trim();
    if (manual) return manual;
    if (!profileLocationSource) return td("profile.locationDisplay");
    const parts = profileLocationSource
      .split(",")
      .map((part: string) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
    }
    return profileLocationSource;
  })();
  const profileLocationHref = `https://www.google.com/maps/search/${encodeURIComponent(profileLocationSource || profileLocationText)}`;
  const loadedTeacherDataRef = React.useRef({
    classes: false,
    studentsForClass: "",
    gradesForClass: "",
    timetable: false,
    homeworkForClass: "",
    exams: false,
  });
  const todayDay = new Date().getDay();
  const uiLocale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ";
  const isSubscriptionExpired = Boolean(teacherSubscription?.isExpired);

  const notifySubscriptionBlocked = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("subscription:blocked"));
    }
  }, []);

  const handleSectionChange = React.useCallback(
    (nextSection: TeacherSection) => {
      if (isSubscriptionExpired && SUBSCRIPTION_BLOCKED_SECTIONS.has(nextSection)) {
        notifySubscriptionBlocked();
        return;
      }
      setSection(nextSection);
    },
    [isSubscriptionExpired, notifySubscriptionBlocked],
  );

  useEffect(() => {
    const data = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (!data) return;
    const parsed = JSON.parse(data);
    if (parsed.role === "teacher") {
      setIsTeacher(true);
    }
  }, []);

  const fetchTeacherSubscriptionStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/director/subscription/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { subscription?: TeacherSubscriptionStatus | null };
      setTeacherSubscription(data.subscription || null);
    } catch {
      // Teacher only needs a best-effort warning; keep dashboard usable on transient failures.
    }
  };

  useEffect(() => {
    if (!isTeacher || !token) return;
    void fetchTeacherSubscriptionStatus();
    const intervalId = window.setInterval(() => {
      void fetchTeacherSubscriptionStatus();
    }, 30000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, token]);

  useEffect(() => {
    if (!isSubscriptionExpired) return;
    if (!SUBSCRIPTION_BLOCKED_SECTIONS.has(section)) return;
    setSection("overview");
    notifySubscriptionBlocked();
  }, [isSubscriptionExpired, notifySubscriptionBlocked, section]);

  const hydrateTeacherProfileFromStorage = () => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const fullName = (parsed?.name || "").toString().trim();
      const nameParts = fullName.split(" ").filter(Boolean);
      const extrasRaw = localStorage.getItem("teacher_profile_meta");
      const extras = extrasRaw ? JSON.parse(extrasRaw) : {};
      setTeacherPhotoUrl(parsed?.photoUrl || null);
      setTeacherProfileForm({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" "),
        email: (parsed?.email || "").toString(),
        phone: (parsed?.phone || "").toString(),
        bio: (extras?.bio || parsed?.role || "teacher").toString(),
        gender: (extras?.gender || "").toString(),
        dateOfBirth: (extras?.dateOfBirth || "").toString(),
        nationalId: (extras?.nationalId || "").toString(),
        country: (extras?.country || "").toString(),
        cityState: (extras?.cityState || "").toString(),
        postalCode: (extras?.postalCode || "").toString(),
        taxId: (extras?.taxId || "").toString(),
      });
    } catch {
      // ignore
    }
  };

  const handleTeacherProfileFieldChange = (key: keyof typeof teacherProfileForm, value: string) => {
    setTeacherProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveTeacherProfileDetails = async () => {
    if (!token) return;
    const fullName = `${teacherProfileForm.firstName} ${teacherProfileForm.lastName}`.trim();
    if (!fullName || !teacherProfileForm.email.trim()) {
      toast({
        title: td("toasts.error"),
        description: td("profile.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    setSavingTeacherProfileDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email: teacherProfileForm.email.trim(),
          phone: teacherProfileForm.phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || td("profile.saveFailed"));

      const auth = localStorage.getItem("auth_user");
      if (auth) {
        const parsed = JSON.parse(auth);
        parsed.name = data.name;
        parsed.email = data.email;
        parsed.phone = data.phone ?? null;
        localStorage.setItem("auth_user", JSON.stringify(parsed));
      }

      localStorage.setItem(
        "teacher_profile_meta",
        JSON.stringify({
          bio: teacherProfileForm.bio,
          gender: teacherProfileForm.gender,
          dateOfBirth: teacherProfileForm.dateOfBirth,
          nationalId: teacherProfileForm.nationalId,
          country: teacherProfileForm.country,
          cityState: teacherProfileForm.cityState,
          postalCode: teacherProfileForm.postalCode,
          taxId: teacherProfileForm.taxId,
        }),
      );

      const updatedName = (data.name || "").toString().trim().split(" ").filter(Boolean);
      setTeacherProfileForm((prev) => ({
        ...prev,
        firstName: updatedName[0] || "",
        lastName: updatedName.slice(1).join(" "),
        email: (data.email || "").toString(),
        phone: (data.phone || "").toString(),
      }));
      setTeacherProfileEditMode(false);
      toast({ title: td("toasts.saved") });
    } catch (err) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("profile.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingTeacherProfileDetails(false);
    }
  };

  const fetchClasses = async () => {
    if (!token) return;
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchClasses"));
      }
      setClasses(data);
      loadedTeacherDataRef.current.classes = true;
      if (!selectedClassId && data.length > 0) {
        setSelectedClassId(data[0]._id);
      }
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchClasses"),
        variant: "destructive",
      });
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudents = async (classId?: string) => {
    if (!token) return;
    setLoadingStudents(true);
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/students${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchStudents"));
      }
      setStudents(data);
      loadedTeacherDataRef.current.studentsForClass = classId || "__all__";
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchStudents"),
        variant: "destructive",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const next: Record<string, "present" | "absent" | "late"> = {};
    for (const s of students) {
      next[s.id] = "present";
    }
    setAttendanceRowStatus(next);
  }, [students]);

  const fetchGrades = async (classId?: string) => {
    if (!token) return;
    setLoadingGrades(true);
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/grades${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchGrades"));
      }
      const mapped: GradeRow[] = (data as unknown as Array<{
        _id: string;
        student?: { user?: { name?: string }; class?: { name?: string } };
        subject?: { name?: string };
        grade: number;
        date?: string;
        canEdit?: boolean;
      }>).map((g) => {
        const student = g.student ?? {};
        const studentUser = student.user ?? {};
        const studentClass = student.class ?? {};
        const subject = g.subject ?? {};
        return {
          id: g._id as string,
          studentName: (studentUser.name as string) || "—",
          className: (studentClass.name as string) || "—",
          subjectName: (subject.name as string) || "—",
          grade: g.grade as number,
          date: g.date ? new Date(g.date as string).toLocaleDateString() : "",
          rawDate: (g.date as string) || "",
          canEdit: Boolean(g.canEdit),
        };
      });
      const sorted = [...mapped].sort((a, b) => {
        const aTs = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        const bTs = b.rawDate ? new Date(b.rawDate).getTime() : 0;
        return bTs - aTs;
      });
      setGrades(sorted);
      loadedTeacherDataRef.current.gradesForClass = classId || "__all__";
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchGrades"),
        variant: "destructive",
      });
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchTimetable = async () => {
    if (!token) return;
    setLoadingTimetable(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/timetable`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchSchedule"));
      }
      setTimetable(
        (data as TimetableRow[]).map((e) => ({
          id: e.id,
          dayOfWeek: e.dayOfWeek,
          startTime: e.startTime,
          endTime: e.endTime,
          room: e.room,
          className: e.className,
          subjectName: e.subjectName,
        })),
      );
      loadedTeacherDataRef.current.timetable = true;
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchSchedule"),
        variant: "destructive",
      });
    } finally {
      setLoadingTimetable(false);
    }
  };

  const fetchAttendanceStats = async (range: "1d" | "1w" | "1m") => {
    if (!token) return;
    setLoadingAttendanceStats(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/stats?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchAttendanceStats"));
      }
      setAttendanceStatsSeries(Array.isArray(data.series) ? data.series : []);
      setAttendanceStatsBucket(data.bucket === "hour" ? "hour" : "day");
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchAttendanceStats"),
        variant: "destructive",
      });
      setAttendanceStatsSeries([]);
    } finally {
      setLoadingAttendanceStats(false);
    }
  };

  const fetchHomework = async (classId?: string) => {
    if (!token) return;
    setLoadingHomework(true);
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/homework${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchHomework"));
      }

      const mapped: HomeworkRow[] = (Array.isArray(data) ? data : []).map((item: HomeworkRow) => ({
        id: item.id,
        classId: item.classId || null,
        className: item.className || "—",
        subjectName: item.subjectName || "—",
        description: item.description || "",
        deadline: item.deadline,
        attachmentUrl: item.attachmentUrl || null,
        attachmentOriginalName: item.attachmentOriginalName || null,
        canEdit: Boolean(item.canEdit),
        submissionCount: Number(item.submissionCount || 0),
        totalStudents: Number(item.totalStudents || 0),
        pendingCount: Number(item.pendingCount || 0),
        lastSubmittedAt: item.lastSubmittedAt || null,
        submissions: Array.isArray(item.submissions) ? item.submissions : [],
      }));

      setHomework(mapped);
      loadedTeacherDataRef.current.homeworkForClass = classId || "__all__";
      return mapped;
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchHomework"),
        variant: "destructive",
      });
    } finally {
      setLoadingHomework(false);
    }
    return [] as HomeworkRow[];
  };

  const fetchExams = async () => {
    if (!token) return;
    setLoadingExams(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchExams"));
      }

      const mapped: ExamRow[] = (Array.isArray(data) ? data : []).map((item: ExamRow) => ({
        id: item.id,
        title: item.title,
        className: item.className || "—",
        subjectName: item.subjectName || "—",
        duration: Number(item.duration || 0),
        startTime: item.startTime,
        endTime: item.endTime,
        isPublished: Boolean(item.isPublished),
      }));

      setExams(mapped);
      loadedTeacherDataRef.current.exams = true;
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchExams"),
        variant: "destructive",
      });
    } finally {
      setLoadingExams(false);
    }
  };

  const openQuestionDialog = (exam: ExamRow) => {
    setQuestionDialogOpen(true);
    setQuestionExamId(exam.id);
    setQuestionExamTitle(exam.title);
    setQuestionText("");
    setQuestionType("test");
    setQuestionPoints("5");
    setQuestionOptionA("");
    setQuestionOptionB("");
    setQuestionOptionC("");
    setQuestionOptionD("");
    setQuestionCorrectOption("A");
  };

  const handleSaveExamQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !questionExamId) return;
    if (!questionText.trim()) {
      toast({
        title: td("toasts.error"),
        description: td("questionDialog.validation.questionRequired"),
        variant: "destructive",
      });
      return;
    }

    const points = Number(questionPoints || 0);
    if (!Number.isFinite(points) || points < 1 || points > 100) {
      toast({
        title: td("toasts.error"),
        description: td("questionDialog.validation.pointsRange"),
        variant: "destructive",
      });
      return;
    }

    const optionsRaw = [
      { key: "A", text: questionOptionA.trim() },
      { key: "B", text: questionOptionB.trim() },
      { key: "C", text: questionOptionC.trim() },
      { key: "D", text: questionOptionD.trim() },
    ];
    const options = optionsRaw.filter((o) => o.text.length > 0);

    if (questionType === "test") {
      if (options.length < 2) {
        toast({
          title: td("toasts.error"),
          description: td("questionDialog.validation.minOptions"),
          variant: "destructive",
        });
        return;
      }
      if (!options.some((o) => o.key === questionCorrectOption)) {
        toast({
          title: td("toasts.error"),
          description: td("questionDialog.validation.correctOptionRequired"),
          variant: "destructive",
        });
        return;
      }
    }

    setSavingQuestion(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${questionExamId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText: questionText.trim(),
          type: questionType,
          points,
          options: questionType === "test" ? options : [],
          correctAnswer: questionType === "test" ? questionCorrectOption : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.saveQuestion"));
      }

      toast({
        title: td("toasts.success"),
        description: td("questionDialog.saved"),
      });
      setQuestionDialogOpen(false);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.saveQuestion"),
        variant: "destructive",
      });
    } finally {
      setSavingQuestion(false);
    }
  };

  const openViewQuestionsDialog = async (exam: ExamRow) => {
    if (!token) return;
    setViewQuestionsDialogOpen(true);
    setViewQuestionsExamTitle(exam.title);
    setViewQuestionsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${exam.id}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchQuestions"));
      }

      const rows: ExamQuestionViewRow[] = (Array.isArray(data) ? data : []).map((q) => ({
        id: q.id,
        order: Number(q.order || 0),
        questionText: q.questionText || "",
        type: q.type === "text" ? "text" : "test",
        points: Number(q.points || 0),
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer ? String(q.correctAnswer) : null,
      }));

      setViewQuestionsRows(rows);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchQuestions"),
        variant: "destructive",
      });
      setViewQuestionsRows([]);
    } finally {
      setViewQuestionsLoading(false);
    }
  };

  const fetchExamResults = async (examId: string, title: string) => {
    if (!token) return;
    setLoadingExamResults(true);
    setSelectedExamId(examId);
    setSelectedExamTitle(title);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchExamResults"));
      }
      setExamResults(Array.isArray(data.attempts) ? data.attempts : []);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchExamResults"),
        variant: "destructive",
      });
      setExamResults([]);
    } finally {
      setLoadingExamResults(false);
    }
  };

  const openAttemptReview = async (examId: string, attemptId: string, studentName: string) => {
    if (!token) return;
    setReviewDialogOpen(true);
    setReviewExamId(examId);
    setReviewAttemptId(attemptId);
    setReviewStudentName(studentName);
    setLoadingReviewAnswers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/attempts/${attemptId}/answers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.fetchAnswers"));
      }
      const mapped: ExamReviewAnswerRow[] = (Array.isArray(data.answers) ? data.answers : []).map((a) => ({
        answerId: a.answerId || null,
        questionId: a.questionId,
        order: Number(a.order || 0),
        questionText: a.questionText || "",
        type: a.type === "text" ? "text" : "test",
        correctAnswerKey: a.correctAnswerKey ? String(a.correctAnswerKey) : null,
        correctAnswerText: a.correctAnswerText ? String(a.correctAnswerText) : null,
        answerText: a.answerText || "",
        awardedScore: a.awardedScore === null || a.awardedScore === undefined ? null : Number(a.awardedScore),
        maxScore: Number(a.maxScore || 0),
        needsManualReview: Boolean(a.needsManualReview),
        gradingComment: a.gradingComment || "",
        evaluatedAt: a.evaluatedAt || null,
      }));
      setReviewAnswers(mapped);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.fetchAnswers"),
        variant: "destructive",
      });
      setReviewAnswers([]);
    } finally {
      setLoadingReviewAnswers(false);
    }
  };

  const saveAllReviewedAnswers = async () => {
    if (!token) return;

    const pendingRows = reviewAnswers.filter((a) => !a.evaluatedAt && Boolean(a.answerId));
    if (pendingRows.length === 0) {
      toast({
        title: td("toasts.info"),
        description: td("review.noNewGrades"),
      });
      return;
    }

    for (const row of pendingRows) {
      const scoreValue = row.awardedScore;
      if (scoreValue === null || scoreValue === undefined || Number.isNaN(Number(scoreValue))) {
        toast({
          title: td("toasts.error"),
          description: td("review.scoreRequired", { order: row.order || td("review.questionFallback") }),
          variant: "destructive",
        });
        return;
      }
      const normalizedScore = Number(scoreValue);
      if (normalizedScore < 0 || normalizedScore > Number(row.maxScore || 0)) {
        toast({
          title: td("toasts.error"),
          description: td("review.scoreRange", {
            order: row.order || td("review.questionFallback"),
            max: row.maxScore,
          }),
          variant: "destructive",
        });
        return;
      }
    }

    setSavingReviewAll(true);
    try {
      for (const row of pendingRows) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 12000);
        try {
          const res = await fetch(`${API_BASE_URL}/api/exams/answers/${row.answerId}/manual-grade`, {
            method: "PATCH",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              awardedScore: Number(row.awardedScore),
              gradingComment: row.gradingComment || "",
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || td("errors.gradeAnswer"));
          }
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      toast({
        title: td("toasts.saved"),
        description: td("review.savedCount", { count: pendingRows.length }),
      });

      await openAttemptReview(reviewExamId, reviewAttemptId, reviewStudentName);
      await fetchExamResults(selectedExamId, selectedExamTitle);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description:
          err instanceof Error
            ? err.name === "AbortError"
              ? td("review.timeout")
              : err.message
            : td("errors.gradeAnswer"),
        variant: "destructive",
      });
    } finally {
      setSavingReviewAll(false);
    }
  };

  const fetchTeacherChatThreads = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setChatLoadingThreads(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/chat/threads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || td("errors.fetchSupportThreads"));
      setChatThreads(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (!silent) {
        toast({
          title: td("toasts.error"),
          description: err instanceof Error ? err.message : td("errors.fetchSupportThreads"),
          variant: "destructive",
        });
      }
      setChatThreads([]);
    } finally {
      if (!silent) setChatLoadingThreads(false);
    }
  }, [token, td, toast]);

  const fetchTeacherThreadMessages = useCallback(async (threadId: string, silent = false) => {
    if (!token || !threadId) return;
    if (!silent) setChatLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/chat/threads/${threadId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || td("errors.fetchSupportMessages"));
      setChatMessages(Array.isArray(data) ? data : []);
    } catch {
      setChatMessages([]);
    } finally {
      if (!silent) setChatLoadingMessages(false);
    }
  }, [token, td]);

  const sendTeacherChatMessage = async () => {
    if (!token || !chatSelectedThreadId || !chatMessageText.trim()) return;
    setChatSending(true);
    try {
      const textToSend = chatMessageText.trim();
      const res = await fetch(`${API_BASE_URL}/api/teacher/chat/threads/${chatSelectedThreadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || td("errors.sendSupportMessage"));
      setChatMessageText("");

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

      void fetchTeacherThreadMessages(chatSelectedThreadId, true);
      void fetchTeacherChatThreads(true);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.sendSupportMessage"),
        variant: "destructive",
      });
    } finally {
      setChatSending(false);
    }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: td("toasts.error"),
        description: td("errors.teacherLoginRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!newGradeStudentId || !newGradeValue) {
      toast({
        title: td("toasts.insufficient"),
        description: td("grades.validation.required"),
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: newGradeStudentId,
          grade: Number(newGradeValue),
          date: newGradeDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.createGrade"));
      }
      toast({
        title: td("toasts.success"),
        description: td("grades.created"),
      });
      setNewGradeStudentId("");
      setNewGradeValue("");
      setNewGradeDate("");
      const targetClassId = gradesClassId || undefined;
      await fetchGrades(targetClassId);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.createGrade"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (section === "profile") {
      hydrateTeacherProfileFromStorage();
      setTeacherProfileEditMode(false);
    }
  }, [section]);

  useEffect(() => {
    if (!isTeacher) return;
    if (section !== "faceAttendance") {
      faceStreamRef.current?.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
      setFaceCameraOn(false);
    }

    const loadSectionData = async () => {
      if (isSubscriptionExpired && SUBSCRIPTION_BLOCKED_SECTIONS.has(section)) {
        return;
      }

      if (section === "overview") {
        if (!loadedTeacherDataRef.current.classes) {
          await fetchClasses();
        }
        if (loadedTeacherDataRef.current.gradesForClass !== "__all__") {
          await fetchGrades();
        }
        if (!loadedTeacherDataRef.current.timetable) {
          await fetchTimetable();
        }
      }

      if (
        section === "students" ||
        section === "classes" ||
        section === "grades" ||
        section === "homework" ||
        section === "exams" ||
        section === "schedule" ||
        section === "faceAttendance" ||
        section === "support"
      ) {
        if (!loadedTeacherDataRef.current.classes) {
          await fetchClasses();
        }
      }

      if (section === "students") {
        const targetClassId = selectedClassId || undefined;
        const studentsKey = targetClassId || "__all__";
        if (loadedTeacherDataRef.current.studentsForClass !== studentsKey) {
          await fetchStudents(targetClassId);
        }
      }

      if (section === "grades") {
        const targetClassId = gradesClassId || undefined;
        const gradesKey = targetClassId || "__all__";
        if (loadedTeacherDataRef.current.gradesForClass !== gradesKey) {
          await fetchGrades(targetClassId);
        }
        if (loadedTeacherDataRef.current.studentsForClass !== gradesKey) {
          await fetchStudents(targetClassId);
        }
      }

      if (section === "homework") {
        const targetClassId = homeworkClassId || undefined;
        const homeworkKey = targetClassId || "__all__";
        if (loadedTeacherDataRef.current.homeworkForClass !== homeworkKey) {
          await fetchHomework(targetClassId);
        }
      }

      if (section === "exams" && !loadedTeacherDataRef.current.exams) {
        await fetchExams();
      }

      if (section === "schedule" && !loadedTeacherDataRef.current.timetable) {
        await fetchTimetable();
      }

      if (section === "support") {
        await fetchTeacherChatThreads();
      }
    };

    void loadSectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isTeacher, isSubscriptionExpired]);

  useEffect(() => {
    if (section !== "support" || !chatSelectedThreadId || !token) return;

    void fetchTeacherThreadMessages(chatSelectedThreadId);
    const intervalId = window.setInterval(() => {
      void fetchTeacherThreadMessages(chatSelectedThreadId, true);
      void fetchTeacherChatThreads(true);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [section, chatSelectedThreadId, token, fetchTeacherThreadMessages, fetchTeacherChatThreads]);

  useEffect(() => {
    if (!isTeacher || !token || section !== "overview") return;
    void fetchAttendanceStats(attendanceStatsRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, token, section, attendanceStatsRange]);

  useEffect(() => {
    if (!isTeacher || !token) return;

    void fetchTeacherChatThreads(true);
    const intervalId = window.setInterval(() => {
      void fetchTeacherChatThreads(true);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [isTeacher, token, fetchTeacherChatThreads]);

  const todayLessons = React.useMemo(
    () =>
      timetable
        .filter((lesson) => lesson.dayOfWeek === todayDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetable, todayDay],
  );

  const totalStudentsCount = React.useMemo(
    () => classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0),
    [classes],
  );

  const homeroomClassCount = React.useMemo(
    () => classes.filter((cls) => cls.isHomeroom).length,
    [classes],
  );

  const overviewClasses = React.useMemo(() => {
    return [...classes]
      .map((cls) => {
        const classLessons = todayLessons.filter((lesson) => lesson.className === cls.name);
        const nextLesson = classLessons[0];

        return {
          ...cls,
          lessonsToday: classLessons.length,
          nextLesson,
        };
      })
      .sort((a, b) => {
        if (Boolean(a.isHomeroom) !== Boolean(b.isHomeroom)) {
          return a.isHomeroom ? -1 : 1;
        }

        if ((b.lessonsToday || 0) !== (a.lessonsToday || 0)) {
          return (b.lessonsToday || 0) - (a.lessonsToday || 0);
        }

        return a.name.localeCompare(b.name);
      });
  }, [classes, todayLessons]);

  const recentGradesForOverview = React.useMemo(
    () =>
      [...grades]
        .sort((a, b) => (b.rawDate || "").localeCompare(a.rawDate || ""))
        .slice(0, 8),
    [grades],
  );

  const headerNotifications = React.useMemo<TeacherHeaderNotification[]>(() => {
    const now = new Date();
    const ts = now.toLocaleString(uiLocale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    const next: TeacherHeaderNotification[] = [];

    if (isSubscriptionExpired) {
      next.push({
        id: "teacher:subscription-expired",
        text: td("subscription.expiredBody"),
        at: ts,
        section: "overview",
      });
    }

    if (classes.length === 0) {
      next.push({
        id: "teacher:no-classes",
        text: td("notifications.noClasses"),
        at: ts,
        section: "classes",
      });
    }

    if (students.length === 0 && classes.length > 0) {
      next.push({
        id: "teacher:no-students",
        text: td("notifications.noStudents"),
        at: ts,
        section: "students",
      });
    }

    if (todayLessons.length === 0) {
      next.push({
        id: "teacher:no-lessons-today",
        text: td("notifications.noLessonsToday"),
        at: ts,
        section: "schedule",
      });
    } else {
      const firstLesson = todayLessons[0];
      next.push({
        id: `teacher:first-lesson:${firstLesson.id}`,
        text: td("notifications.firstLesson", { className: firstLesson.className, time: firstLesson.startTime }),
        at: ts,
        section: "schedule",
      });
    }

    if (recentGradesForOverview.length > 0) {
      const lastGrade = recentGradesForOverview[0];
      next.push({
        id: `teacher:last-grade:${lastGrade.id}`,
        text: td("notifications.lastGrade", {
          student: lastGrade.studentName,
          subject: lastGrade.subjectName,
          grade: lastGrade.grade,
        }),
        at: ts,
        section: "grades",
      });
    }

    const homeroomCount = classes.filter((cls) => cls.isHomeroom).length;
    if (homeroomCount > 0) {
      next.push({
        id: `teacher:homeroom:${homeroomCount}`,
        text: td("notifications.homeroomCount", { count: homeroomCount }),
        at: ts,
        section: "classes",
      });
    }

    const chatAlerts = [...chatThreads]
      .filter((thread) => Boolean(thread.lastMessageAt) && thread.lastSenderRole === "parent")
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt || "").getTime() - new Date(a.lastMessageAt || "").getTime(),
      )
      .slice(0, 3);

    chatAlerts.forEach((thread) => {
      const at = thread.lastMessageAt || ts;
      next.push({
        id: `teacher:chat:${thread.id}:${at}`,
        text: td("notifications.newChatMessage", {
          parent: thread.parentName,
          student: thread.studentName,
        }),
        at,
        section: "support",
      });
    });

    return next.slice(0, 8);
  }, [classes, students, todayLessons, recentGradesForOverview, chatThreads, isSubscriptionExpired, td, uiLocale]);

  const searchItems = React.useMemo(
    () => [
      ...classes.map((c) => ({ id: c._id, title: c.name, subtitle: td("search.class"), section: "classes" as const })),
      ...students.map((s) => ({
        id: s.id,
        title: s.name || td("fallback.student"),
        subtitle: `${s.className || td("fallback.noClass")}${s.email ? ` • ${s.email}` : ""}`,
        section: "students" as const,
      })),
      ...grades.map((g) => ({
        id: g.id,
        title: g.studentName,
        subtitle: `${g.subjectName} • ${g.className}`,
        section: "grades" as const,
      })),
      ...homework.map((h) => ({
        id: h.id,
        title: `${h.className} • ${h.subjectName}`,
        subtitle: h.description,
        section: "homework" as const,
      })),
      ...exams.map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: `${e.className} • ${e.subjectName}`,
        section: "exams" as const,
      })),
      ...timetable.map((t) => ({
        id: t.id,
        title: `${t.className} ${t.subjectName}`,
        subtitle: `${t.startTime}-${t.endTime}`,
        section: "schedule" as const,
      })),
    ],
    [classes, students, grades, homework, exams, timetable, td],
  );

  useEffect(() => {
    if (!isTeacher || section !== "grades") return;
    const targetClassId = gradesClassId || undefined;
    fetchGrades(targetClassId);
    fetchStudents(targetClassId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradesClassId]);

  useEffect(() => {
    if (!isTeacher || section !== "homework") return;
    const targetClassId = homeworkClassId || undefined;
    fetchHomework(targetClassId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeworkClassId]);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: td("toasts.error"),
        description: td("errors.teacherLoginRequired"),
        variant: "destructive",
      });
      return;
    }

    if (!newHomeworkClassId || !newHomeworkDescription || !newHomeworkDeadline) {
      toast({
        title: td("toasts.insufficient"),
        description: td("homework.validation.required"),
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("classId", newHomeworkClassId);
      formData.append("description", newHomeworkDescription);
      formData.append("deadline", newHomeworkDeadline);
      if (newHomeworkFile) {
        formData.append("attachment", newHomeworkFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/teacher/homework`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.createHomework"));
      }

      toast({
        title: td("toasts.saved"),
        description: td("homework.created"),
      });

      setNewHomeworkDescription("");
      setNewHomeworkDeadline("");
      setNewHomeworkFile(null);
      await fetchHomework(homeworkClassId || undefined);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.createHomework"),
        variant: "destructive",
      });
    }
  };

  const openEditHomework = (item: HomeworkRow) => {
    setEditingHomework(item);
    setEditHomeworkClassId(item.classId || "");
    setEditHomeworkDescription(item.description || "");
    setEditHomeworkDeadline(item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : "");
    setEditHomeworkFile(null);
    setEditHomeworkDialogOpen(true);
  };

  const handleUpdateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingHomework) return;

    if (!editHomeworkClassId || !editHomeworkDescription || !editHomeworkDeadline) {
      toast({
        title: td("toasts.insufficient"),
        description: td("homework.validation.required"),
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("classId", editHomeworkClassId);
      formData.append("description", editHomeworkDescription);
      formData.append("deadline", editHomeworkDeadline);
      if (editHomeworkFile) {
        formData.append("attachment", editHomeworkFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/teacher/homework/${editingHomework.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.updateHomework"));
      }

      toast({
        title: td("toasts.saved"),
        description: td("homework.updated"),
      });

      setEditHomeworkDialogOpen(false);
      setEditingHomework(null);
      setEditHomeworkFile(null);
      await fetchHomework(homeworkClassId || undefined);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.updateHomework"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteHomework = async (item: HomeworkRow) => {
    if (!token) return;

    const ok = window.confirm(td("homework.confirmDelete"));
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/homework/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.deleteHomework"));
      }

      toast({
        title: td("toasts.deleted"),
        description: td("homework.deleted"),
      });
      await fetchHomework(homeworkClassId || undefined);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.deleteHomework"),
        variant: "destructive",
      });
    }
  };

  const openSubmissionMonitor = (item: HomeworkRow) => {
    setSubmissionMonitorHomework(item);
    setSubmissionMonitorOpen(true);
  };

  const openGradeSubmissionDialog = (submission: NonNullable<HomeworkRow["submissions"]>[number]) => {
    setGradingSubmissionId(submission.id);
    setGradingSubmissionStudentName(submission.studentName || td("fallback.student"));
    setGradingSubmissionScore(
      submission.gradedScore != null && Number.isFinite(submission.gradedScore)
        ? String(submission.gradedScore)
        : "",
    );
    setGradingSubmissionComment(submission.gradingComment || "");
    setGradeSubmissionDialogOpen(true);
  };

  const handleSaveSubmissionGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !gradingSubmissionId) return;

    const score = Number(gradingSubmissionScore);
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      toast({
        title: td("toasts.invalidScore"),
        description: td("homework.grading.scoreRange"),
        variant: "destructive",
      });
      return;
    }

    setGradingSubmissionSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/homework/submissions/${gradingSubmissionId}/grade`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gradedScore: score,
          gradingComment: gradingSubmissionComment || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.gradeHomework"));
      }

      toast({
        title: td("toasts.saved"),
        description: td("homework.grading.saved"),
      });

      setGradeSubmissionDialogOpen(false);
      const updatedHomework = await fetchHomework(homeworkClassId || undefined);
      if (submissionMonitorHomework) {
        const refreshed = updatedHomework.find((h) => h.id === submissionMonitorHomework.id);
        if (refreshed) {
          setSubmissionMonitorHomework(refreshed);
        }
      }
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.gradeHomework"),
        variant: "destructive",
      });
    } finally {
      setGradingSubmissionSaving(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: td("toasts.error"),
        description: td("errors.teacherLoginRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!selectedClassId || !newStudentName || !newStudentEmail || !newStudentPassword) {
      toast({
        title: td("toasts.insufficient"),
        description: td("students.form.validation.required"),
        variant: "destructive",
      });
      return;
    }

    const homeroomClass = classes.find((c) => c._id === selectedClassId)?.isHomeroom;
    if (!homeroomClass) {
      toast({
        title: td("toasts.insufficient"),
        description: td("students.form.homeroomOnlyCreate"),
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newStudentName,
          email: newStudentEmail,
          password: newStudentPassword,
          classId: selectedClassId,
          parentName: newParentName || undefined,
          parentPhone: newParentPhone || undefined,
          address: newAddress || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.createStudent"));
      }
      toast({
        title: td("toasts.success"),
        description: td("students.form.created"),
      });
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
      setNewParentName("");
      setNewParentPhone("");
      setNewAddress("");
      await fetchStudents(selectedClassId);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.createStudent"),
        variant: "destructive",
      });
    }
  };

  const handleSaveClassAttendance = async () => {
    if (!token || !selectedClassId) {
      toast({
        title: td("toasts.insufficient"),
        description: td("students.attendance.pickClass"),
        variant: "destructive",
      });
      return;
    }
    if (students.length === 0) {
      toast({
        title: td("toasts.insufficient"),
        description: td("students.attendance.noStudents"),
        variant: "destructive",
      });
      return;
    }
    setSavingClassAttendance(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        status: attendanceRowStatus[s.id] ?? "present",
      }));
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClassId,
          date: attendanceDayDate,
          entries,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.saveAttendance"));
      }
      toast({
        title: td("toasts.success"),
        description: td("students.attendance.saved"),
      });
      void fetchAttendanceStats(attendanceStatsRange);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.saveAttendance"),
        variant: "destructive",
      });
    } finally {
      setSavingClassAttendance(false);
    }
  };

  const openEditStudent = (student: StudentRow) => {
    setEditingStudent(student);
    setEditName(student.name || "");
    setEditEmail(student.email || "");
    setEditPassword("");
    setEditClassId(student.classId || "");
    setEditParentName(student.parentName || "");
    setEditParentPhone(student.parentPhone || "");
    setEditAddress(student.address || "");
    setEditPhotoUrl(student.photoUrl || null);
    setEditDialogOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingStudent) return;
    try {
      const faceDescriptor = editPhotoUrl
        ? await (await loadFaceApiModule()).getDescriptorFromImage(editPhotoUrl)
        : null;
      const res = await fetch(`${API_BASE_URL}/api/teacher/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
          classId: editClassId || undefined,
          parentName: editParentName,
          parentPhone: editParentPhone,
          address: editAddress,
          photoUrl: editPhotoUrl,
          faceDescriptor: editPhotoUrl ? (faceDescriptor ?? undefined) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.updateStudent"));
      }
      toast({
        title: td("toasts.saved"),
        description: td("students.edit.updated"),
      });
      setEditDialogOpen(false);
      setEditingStudent(null);
      await fetchStudents(selectedClassId || undefined);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.updateStudent"),
        variant: "destructive",
      });
    }
  };

  if (!isTeacher) return null;

  return (
    <TeacherLayout
      currentSection={section}
      onSectionChange={handleSectionChange}
      headerNotifications={headerNotifications}
      searchItems={searchItems}
    >
      <div className="space-y-10">
        {isSubscriptionExpired && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">{td("subscription.expiredTitle")}</p>
                <p className="text-sm leading-relaxed">{td("subscription.expiredBody")}</p>
                <p className="text-xs text-rose-700">{td("subscription.blockedSections")}</p>
              </div>
            </div>
          </div>
        )}

        {section === "overview" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("overview.title")}</h3>
                <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                  {td("overview.desc")}
                </p>
              </div>
              <LiveDateTimeBadge />
            </div>

            {loadingClasses || loadingStudents || loadingTimetable ? (
              <StatsCardsSkeleton count={4} className="lg:grid-cols-4" />
            ) : (
              <div className="grid gap-4 lg:grid-cols-4">
                {[
                  { title: td("overview.stats.assignedClasses"), value: classes.length, hint: td("overview.stats.assignedClassesHint"), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-500/10" },
                  { title: td("overview.stats.totalStudents"), value: totalStudentsCount, hint: td("overview.stats.totalStudentsHint"), icon: Users, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                  { title: td("overview.stats.todayLessons"), value: todayLessons.length, hint: td("overview.stats.todayLessonsHint"), icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
                  { title: td("overview.stats.homeroom"), value: homeroomClassCount, hint: td("overview.stats.homeroomHint"), icon: CheckSquare, color: "text-violet-600", bg: "bg-violet-500/10" },
                ].map((stat) => (
                  <Card key={stat.title} className="cursor-default">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <div className={`rounded-lg p-2 ${stat.bg}`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <TeacherAttendanceOverviewChart
              data={attendanceStatsSeries}
              bucket={attendanceStatsBucket}
              range={attendanceStatsRange}
              onRangeChange={setAttendanceStatsRange}
              loading={loadingAttendanceStats}
              locale={uiLocale}
            />

            {loadingClasses || loadingStudents || loadingTimetable || loadingGrades ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
                  <Card>
                    <CardHeader className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent>
                      <ListSkeleton rows={3} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent>
                      <ListSkeleton rows={3} />
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="grid grid-cols-5 gap-4 rounded-md border p-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="mx-auto h-7 w-7 rounded-full" />
                        <Skeleton className="ml-auto h-4 w-20" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{td("overview.todayScheduleTitle")}</CardTitle>
                      <CardDescription>{td("overview.todayScheduleDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {todayLessons.length > 0 ? (
                        todayLessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3"
                          >
                            <div className="min-w-[90px] text-xs font-mono text-muted-foreground">
                              {lesson.startTime} - {lesson.endTime}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-primary text-primary-foreground whitespace-nowrap">{lesson.className}</Badge>
                                <span className="font-medium text-foreground">{lesson.subjectName}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {lesson.room ? td("common.room", { room: lesson.room }) : td("common.roomMissing")}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {td("overview.noTodaySchedule")}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{td("overview.myClassesTitle")}</CardTitle>
                      <CardDescription>
                        {td("overview.myClassesDesc")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {overviewClasses.length > 0 ? (
                        overviewClasses.map((cls) => (
                          <div
                            key={cls._id}
                            className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-lg px-3 py-2 text-sm font-bold ${cls.isHomeroom ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground"}`}>
                                {cls.name}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {cls.isHomeroom ? td("common.classTeacher") : td("common.subjectTeacher")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {td("overview.classMeta", {
                                    students: cls.studentCount || 0,
                                    lessons: cls.lessonsToday || 0,
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1 text-left sm:text-right">
                              <p className="text-xs font-medium text-foreground">
                                {cls.nextLesson ? td("overview.nextLessonAt", { time: cls.nextLesson.startTime }) : td("overview.noLessonToday")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cls.nextLesson
                                  ? td("overview.nextLessonInfo", {
                                      subject: cls.nextLesson.subjectName,
                                      room: cls.nextLesson.room || "",
                                    })
                                  : td("overview.nextLessonMissing")}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {td("overview.noClasses")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{td("overview.latestGradesTitle")}</CardTitle>
                    <CardDescription>{td("overview.latestGradesDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentGradesForOverview.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                          <thead>
                            <tr className="border-b bg-muted/60">
                              <th className="p-4 text-left font-semibold text-foreground">{td("table.student")}</th>
                              <th className="p-4 text-left font-semibold text-foreground">{td("table.class")}</th>
                              <th className="p-4 text-left font-semibold text-foreground">{td("table.subject")}</th>
                              <th className="p-4 text-center font-semibold text-foreground">{td("table.grade")}</th>
                              <th className="p-4 text-right font-semibold text-foreground">{td("table.date")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentGradesForOverview.map((g) => (
                              <tr key={g.id} className="border-b last:border-0">
                                <td className="p-4 text-foreground">{g.studentName}</td>
                                <td className="p-4">
                                  <Badge variant="outline" className="whitespace-nowrap">{g.className}</Badge>
                                </td>
                                <td className="p-4 text-muted-foreground">{g.subjectName}</td>
                                <td className="p-4 text-center">
                                  <span
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                      g.grade >= 5
                                        ? "bg-secondary text-secondary-foreground"
                                        : g.grade === 4
                                          ? "bg-primary text-primary-foreground"
                                          : "gradient-accent text-accent-foreground"
                                    }`}
                                  >
                                    {g.grade}
                                  </span>
                                </td>
                                <td className="p-4 text-right text-xs text-muted-foreground">{g.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-sm text-muted-foreground">
                        {td("grades.empty")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {section === "students" && (
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("students.title")}</h3>
                {!classes.some((c) => c.isHomeroom) && (
                  <p className="inline-flex max-w-2xl rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-relaxed text-rose-700">
                    {td("students.form.noHomeroomWarning")}
                  </p>
                )}
              </div>

              <form onSubmit={handleCreateStudent} className="grid gap-3 md:grid-cols-4 md:items-end">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {td("students.form.selectClass")}
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedClassId(value);
                      fetchStudents(value || undefined);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("students.form.classPlaceholder")}</option>
                    {[...classes]
                      .sort((a, b) => {
                        if (Boolean(a.isHomeroom) !== Boolean(b.isHomeroom)) {
                          return a.isHomeroom ? -1 : 1;
                        }
                        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
                      })
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                          {c.isHomeroom ? ` — ${td("common.classTeacher")}` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="student-name">
                    {td("students.form.studentName")}
                  </label>
                  <input
                    id="student-name"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={td("students.form.studentNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="student-email">
                    Email
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="student@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="parent-name">
                    {td("students.form.parentName")}
                  </label>
                  <input
                    id="parent-name"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={td("students.form.parentNamePlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="parent-phone">
                    {td("students.form.parentPhone")}
                  </label>
                  <input
                    id="parent-phone"
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={td("students.form.parentPhonePlaceholder")}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="student-address">
                    {td("students.form.address")}
                  </label>
                  <input
                    id="student-address"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={td("students.form.addressPlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="student-password">
                    {td("students.form.password")}
                  </label>
                  <div className="relative">
                    <input
                      id="student-password"
                      type={showNewStudentPassword ? "text" : "password"}
                      value={newStudentPassword}
                      onChange={(e) => setNewStudentPassword(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 pr-9 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder={td("students.form.passwordPlaceholder")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewStudentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                    >
                      {showNewStudentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full md:w-auto mt-2 md:mt-0"
                  >
                    {td("students.form.addStudent")}
                  </Button>
                </div>
              </form>

              {selectedClassId ? (
                <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{td("students.attendance.title")}</h4>
                      <p className="text-xs text-muted-foreground max-w-xl">{td("students.attendance.hint")}</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-muted-foreground" htmlFor="attendance-date">
                          {td("students.attendance.dateLabel")}
                        </label>
                        <input
                          id="attendance-date"
                          type="date"
                          value={attendanceDayDate}
                          onChange={(e) => setAttendanceDayDate(e.target.value)}
                          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingClassAttendance || loadingStudents || students.length === 0}
                        onClick={() => void handleSaveClassAttendance()}
                      >
                        {savingClassAttendance ? td("common.saving") : td("students.attendance.save")}
                      </Button>
                    </div>
                  </div>
                  {!loadingStudents && students.length > 0 && (
                    <div className="space-y-2 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                      {students.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-col gap-2 rounded-md border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-sm font-medium text-foreground">{s.name}</span>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            className="justify-start sm:justify-end"
                            value={attendanceRowStatus[s.id] ?? "present"}
                            onValueChange={(v) => {
                              if (!v) return;
                              setAttendanceRowStatus((prev) => ({
                                ...prev,
                                [s.id]: v as "present" | "absent" | "late",
                              }));
                            }}
                          >
                            <ToggleGroupItem value="present" className="text-xs px-2">
                              {td("students.attendance.present")}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="absent" className="text-xs px-2">
                              {td("students.attendance.absent")}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="late" className="text-xs px-2">
                              {td("students.attendance.late")}
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/60">
                      <th className="text-left p-3 font-semibold text-foreground">{td("table.student")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("students.table.email")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("students.table.parent")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("students.table.phone")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("students.table.address")}</th>
                      <th className="text-center p-3 font-semibold text-foreground">{td("table.class")}</th>
                      <th className="w-[120px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`students-skel-${idx}`} className="border-b last:border-0">
                          {Array.from({ length: 7 }).map((__, cIdx) => (
                            <td key={cIdx} className="p-3">
                              <Skeleton className="h-4 w-full max-w-[140px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-xs text-muted-foreground">
                          {td("students.table.empty")}
                        </td>
                      </tr>
                    ) : (
                      students.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="p-3 text-foreground">{s.name}</td>
                          <td className="p-3 text-foreground text-xs">{s.email}</td>
                          <td className="p-3 text-foreground text-xs">{s.parentName || "—"}</td>
                          <td className="p-3 text-foreground text-xs">{s.parentPhone || "—"}</td>
                          <td className="p-3 text-foreground text-xs">{s.address || "—"}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="whitespace-nowrap">{s.className || "—"}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title={td("students.actions.edit")}
                                onClick={() => openEditStudent(s)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {section === "classes" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("classes.title")}</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {loadingClasses ? (
                <ListSkeleton rows={4} />
              ) : classes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {td("classes.empty")}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {classes.map((c, i) => (
                      <motion.div
                        key={c._id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card
                          className="hover:shadow-card transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedClassId(c._id);
                            setClassForDialog(c);
                            fetchStudents(c._id);
                            setClassStudentsDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-emerald-600 px-4 py-2">
                                <span className="text-sm font-bold text-white">{c.name}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{c.name} sinfi</p>
                                <p className="text-xs text-muted-foreground">
                                  {td("classes.studentCount", { count: c.studentCount ?? 0 })}
                                </p>
                                  {c.isHomeroom && (
                                    <p className="text-[11px] font-medium text-emerald-700">
                                      {td("classes.homeroom")}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {section === "grades" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("grades.title")}</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="space-y-1" />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {td("grades.filters.class")}
                  </label>
                  <select
                    value={gradesClassId}
                    onChange={(e) => setGradesClassId(e.target.value)}
                    className="flex h-8 w-40 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("grades.filters.allClasses")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form
                onSubmit={handleCreateGrade}
                className="mt-2 grid gap-2 rounded-md border bg-muted/40 p-3 text-xs md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_130px_90px]"
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">O&apos;quvchi</label>
                  <select
                    value={newGradeStudentId}
                    onChange={(e) => setNewGradeStudentId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("grades.form.studentPlaceholder")}</option>
                    {students
                      .filter((s) => !gradesClassId || s.classId === gradesClassId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.className || "—"})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("table.class")}</label>
                  <select
                    value={gradesClassId}
                    onChange={(e) => setGradesClassId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("grades.filters.allClasses")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("table.grade")}</label>
                  <select
                    value={newGradeValue}
                    onChange={(e) => setNewGradeValue(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("grades.form.gradePlaceholder")}</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("grades.form.dateOptional")}</label>
                  <input
                    type="date"
                    value={newGradeDate}
                    onChange={(e) => setNewGradeDate(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" className="w-full">
                    {td("grades.form.submit")}
                  </Button>
                </div>
              </form>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-3 font-semibold text-foreground">O&apos;quvchi</th>
                      <th className="text-center p-3 font-semibold text-foreground">{td("table.class")}</th>
                      <th className="text-center p-3 font-semibold text-foreground">Fan</th>
                      <th className="text-center p-3 font-semibold text-foreground">{td("table.grade")}</th>
                      <th className="text-right p-3 font-semibold text-foreground">Sana</th>
                      <th className="w-[90px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGrades ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`grades-skel-${idx}`} className="border-b last:border-0">
                          {Array.from({ length: 6 }).map((__, cIdx) => (
                            <td key={cIdx} className="p-3">
                              <Skeleton className="h-4 w-full max-w-[120px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : grades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                          {td("grades.empty")}
                        </td>
                      </tr>
                    ) : (
                      grades.map((g) => (
                        <tr key={g.id} className="border-b last:border-0">
                          <td className="p-3 text-foreground">{g.studentName}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="whitespace-nowrap">{g.className}</Badge>
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">{g.subjectName}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                g.grade === 5
                                  ? "bg-emerald-700 text-emerald-50"
                                  : g.grade === 4
                                    ? "bg-emerald-500 text-emerald-50"
                                    : g.grade === 3
                                      ? "bg-yellow-400 text-yellow-950"
                                      : "bg-red-500 text-red-50"
                              }`}
                            >
                              {g.grade}
                            </span>
                          </td>
                          <td className="p-3 text-right text-muted-foreground text-xs">{g.date}</td>
                          {g.canEdit && (
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  title={td("grades.actions.edit")}
                                  onClick={() => {
                                    setEditingGrade(g);
                                    setEditGradeValue(String(g.grade));
                                    setEditGradeDate("");
                                    setEditGradeDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  title={td("grades.actions.delete")}
                                  onClick={async () => {
                                    if (!token) return;
                                    if (!window.confirm(td("grades.confirmDelete"))) return;
                                    try {
                                      const res = await fetch(`${API_BASE_URL}/api/teacher/grades/${g.id}`, {
                                        method: "DELETE",
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      const data = await res.json();
                                      if (!res.ok) {
                                        throw new Error(data.message || td("errors.deleteGrade"));
                                      }
                                      toast({
                                        title: td("toasts.deleted"),
                                        description: td("grades.deleted"),
                                      });
                                      const targetClassId = gradesClassId || undefined;
                                      await fetchGrades(targetClassId);
                                    } catch (err: unknown) {
                                      toast({
                                        title: td("toasts.error"),
                                        description:
                                          err instanceof Error
                                            ? err.message
                                            : td("errors.deleteGrade"),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {section === "homework" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("homework.title")}</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="space-y-1" />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {td("homework.filters.class")}
                  </label>
                  <select
                    value={homeworkClassId}
                    onChange={(e) => setHomeworkClassId(e.target.value)}
                    className="flex h-8 w-40 rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="">{td("homework.filters.allClasses")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form
                onSubmit={handleCreateHomework}
                className="mt-2 grid gap-2 rounded-md border bg-muted/40 p-3 text-xs md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_160px_1fr_110px]"
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("table.class")}</label>
                  <select
                    value={newHomeworkClassId}
                    onChange={(e) => setNewHomeworkClassId(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    <option value="">{td("homework.form.classPlaceholder")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("homework.form.description")}</label>
                  <input
                    value={newHomeworkDescription}
                    onChange={(e) => setNewHomeworkDescription(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    placeholder={td("homework.form.descriptionPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("homework.form.deadline")}</label>
                  <input
                    type="date"
                    value={newHomeworkDeadline}
                    onChange={(e) => setNewHomeworkDeadline(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-muted-foreground">{td("homework.form.fileOptional")}</label>
                  <input
                    type="file"
                    onChange={(e) => setNewHomeworkFile(e.target.files?.[0] || null)}
                    className="block w-full text-[11px] text-muted-foreground"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" className="w-full">{td("homework.form.add")}</Button>
                </div>
              </form>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-3 font-semibold text-foreground">{td("table.class")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("table.subject")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("homework.table.description")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("homework.table.deadline")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("homework.table.submissions")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("homework.table.file")}</th>
                      <th className="w-[110px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHomework ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`homework-skel-${idx}`} className="border-b last:border-0">
                          {Array.from({ length: 7 }).map((__, cIdx) => (
                            <td key={cIdx} className="p-3">
                              <Skeleton className="h-4 w-full max-w-[140px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : homework.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-xs text-muted-foreground">
                          {td("homework.empty")}
                        </td>
                      </tr>
                    ) : (
                      homework.map((h) => (
                        <tr key={h.id} className="border-b last:border-0">
                          <td className="p-3 text-foreground">{h.className}</td>
                          <td className="p-3 text-muted-foreground">{h.subjectName}</td>
                          <td className="p-3 text-muted-foreground">{h.description}</td>
                          <td className="p-3 text-muted-foreground">{new Date(h.deadline).toLocaleDateString()}</td>
                          <td className="p-3 text-muted-foreground">
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-foreground">
                                {h.submissionCount || 0}/{h.totalStudents || 0}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {td("homework.table.pending", { count: h.pendingCount || 0 })}
                              </p>
                              {h.lastSubmittedAt ? (
                                <p className="text-[11px] text-emerald-700">
                                  {td("homework.table.last", { date: new Date(h.lastSubmittedAt).toLocaleDateString(uiLocale) })}
                                </p>
                              ) : (
                                <p className="text-[11px] text-amber-600">{td("homework.table.notSubmitted")}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {h.attachmentUrl ? (
                              <a
                                href={h.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {h.attachmentOriginalName || td("homework.table.openFile")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3">
                            {h.canEdit ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={td("homework.actions.viewSubmissions")}
                                  onClick={() => openSubmissionMonitor(h)}
                                >
                                  <ClipboardList className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={td("homework.actions.edit")}
                                  onClick={() => openEditHomework(h)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-destructive border-destructive/40 hover:bg-destructive/10"
                                  title={td("homework.actions.delete")}
                                  onClick={() => {
                                    void handleDeleteHomework(h);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">{td("homework.actions.readOnly")}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {section === "exams" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("exams.title")}</h3>
              <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                {td("exams.desc")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => void fetchExams()}>
                  {td("common.refresh")}
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-3 font-semibold text-foreground">{td("exams.table.title")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("table.class")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("table.subject")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("exams.table.duration")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("exams.table.timeRange")}</th>
                      <th className="text-left p-3 font-semibold text-foreground">{td("exams.table.status")}</th>
                      <th className="text-right p-3 font-semibold text-foreground">{td("exams.table.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingExams ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={`exams-skel-${idx}`} className="border-b last:border-0">
                          {Array.from({ length: 7 }).map((__, cIdx) => (
                            <td key={cIdx} className="p-3">
                              <Skeleton className="h-4 w-full max-w-[140px]" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : exams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-xs text-muted-foreground">
                          {td("exams.empty")}
                        </td>
                      </tr>
                    ) : (
                      exams.map((e) => (
                        <tr key={e.id} className="border-b last:border-0">
                          <td className="p-3 text-foreground">{e.title}</td>
                          <td className="p-3 text-muted-foreground">{e.className}</td>
                          <td className="p-3 text-muted-foreground">{e.subjectName}</td>
                          <td className="p-3 text-muted-foreground">{td("exams.durationMin", { value: e.duration })}</td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {new Date(e.startTime).toLocaleString(uiLocale)} - {new Date(e.endTime).toLocaleString(uiLocale)}
                          </td>
                          <td className="p-3">
                            <Badge variant={e.isPublished ? "default" : "outline"}>
                              {e.isPublished ? td("exams.status.active") : td("exams.status.draft")}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void openViewQuestionsDialog(e)}
                              >
                                {td("exams.actions.questions")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!e.isPublished}
                                onClick={() => openQuestionDialog(e)}
                              >
                                {td("exams.actions.uploadQuestion")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void fetchExamResults(e.id, e.title)}
                              >
                                {td("exams.actions.results")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {selectedExamId && (
                <div className="border rounded-md overflow-hidden">
                  <div className="border-b bg-muted/40 px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{td("exams.results.title", { exam: selectedExamTitle })}</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="text-left p-3 font-semibold text-foreground">{td("table.student")}</th>
                        <th className="text-left p-3 font-semibold text-foreground">{td("exams.table.status")}</th>
                        <th className="text-left p-3 font-semibold text-foreground">{td("exams.results.score")}</th>
                        <th className="text-left p-3 font-semibold text-foreground">{td("exams.results.manualPending")}</th>
                        <th className="text-right p-3 font-semibold text-foreground">{td("exams.results.review")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingExamResults ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={`exam-results-skel-${idx}`} className="border-b last:border-0">
                            {Array.from({ length: 5 }).map((__, cIdx) => (
                              <td key={cIdx} className="p-3">
                                <Skeleton className="h-4 w-full max-w-[120px]" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : examResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                            {td("exams.results.empty")}
                          </td>
                        </tr>
                      ) : (
                        examResults.map((attempt) => (
                          <tr key={attempt.id} className="border-b last:border-0">
                            <td className="p-3">
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground">{attempt.studentName || "—"}</p>
                                <p className="text-xs text-muted-foreground">{attempt.studentEmail || "—"}</p>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{attempt.status}</td>
                            <td className="p-3 text-muted-foreground">
                              {Number(attempt.score || 0)} / {Number(attempt.maxScore || 0)}
                            </td>
                            <td className="p-3">
                              <Badge variant={attempt.pendingManual > 0 ? "outline" : "default"}>
                                {attempt.pendingManual}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant={attempt.pendingManual > 0 ? "default" : "outline"}
                                onClick={() => void openAttemptReview(selectedExamId, attempt.id, attempt.studentName || "")}
                              >
                                {attempt.pendingManual > 0 ? td("exams.results.actions.review") : td("exams.results.actions.view")}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {section === "schedule" && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("schedule.title")}</h3>
              <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                {td("schedule.weeklyDesc")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">{td("schedule.weeklyTitle")}</p>
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {todayLessons.length > 0
                  ? td("schedule.todayLessonAt", { time: todayLessons[0].startTime })
                  : td("schedule.noLessonToday")}
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {timetableDays.map((day, idx) => {
                  const lessons = timetable.filter((e) => e.dayOfWeek === day.value);
                  return (
                    <motion.div
                      key={day.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-lg border bg-muted/40 p-2 ${day.value === todayDay ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground">{td(day.labelKey)}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {lessons.length > 0 ? td("schedule.lessonsCount", { count: lessons.length }) : td("schedule.noLessonShort")}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {loadingTimetable ? (
                          <>
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                          </>
                        ) : lessons.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">{td("schedule.noLessonThisDay")}</p>
                        ) : (
                          lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="rounded-md bg-background px-2 py-1.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {lesson.startTime} – {lesson.endTime}
                                </span>
                                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                                  {lesson.className}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[11px] font-medium text-foreground line-clamp-2">
                                {lesson.subjectName}
                              </p>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <p className="text-[10px] text-muted-foreground">
                                  {lesson.room ? td("common.room", { room: lesson.room }) : td("common.roomUnset")}
                                </p>
                                {day.value === todayDay && (
                                  <Badge variant="outline" className="text-[10px]">{td("common.today")}</Badge>
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
            </CardContent>
          </Card>
        )}

        {section === "support" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("support.title")}</h3>
                <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                  {td("support.desc")}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => void fetchTeacherChatThreads()}>
                    {td("common.refresh")}
                  </Button>
                </div>
                {chatLoadingThreads ? (
                  <ChatSkeleton variant="threads" rows={4} />
                ) : chatThreads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{td("support.noRequests")}</p>
                ) : (
                  <div className="max-h-[470px] overflow-auto space-y-2">
                    {chatThreads.map((thread) => (
                      <Button
                        key={thread.id}
                        type="button"
                        variant={chatSelectedThreadId === thread.id ? "default" : "outline"}
                        className="h-auto w-full justify-start py-2 text-left"
                        onClick={() => {
                          setChatSelectedThreadId(thread.id);
                          void fetchTeacherThreadMessages(thread.id);
                        }}
                      >
                        <div className="w-full">
                          <p className="text-sm font-medium">{thread.parentName}</p>
                          <p className="text-[11px] opacity-80">{thread.studentName} • {thread.className}</p>
                          <p className="text-[11px] opacity-80">
                            {thread.targetType === "class_teacher" ? td("common.classTeacher") : thread.subjectName || td("fallback.subject")}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-md md:text-lg text-[#212B36] leading-tight tracking-wider">{td("support.chatTitle")}</h3>
                <p className="text-sm flex items-center justify-start gap-1 text-[#FE9F43] font-medium md:text-sm">
                  {td("support.chatDesc")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {!chatSelectedThreadId ? (
                  <p className="text-xs text-muted-foreground">{td("support.selectThread")}</p>
                ) : (
                  <>
                    <div className="h-[430px] overflow-auto rounded-md border p-3 bg-muted/20 space-y-2">
                      {chatLoadingMessages ? (
                        <ChatSkeleton variant="messages" rows={5} />
                      ) : chatMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{td("support.noMessages")}</p>
                      ) : (
                        chatMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                              m.senderRole === "teacher"
                                ? "ml-auto bg-primary text-primary-foreground"
                                : "mr-auto bg-background border"
                            }`}
                          >
                            <p className="mb-1 text-xs opacity-80">{m.senderName}</p>
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
                            void sendTeacherChatMessage();
                          }
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        placeholder={td("support.messagePlaceholder")}
                      />
                      <Button type="button" disabled={chatSending || !chatMessageText.trim()} onClick={() => void sendTeacherChatMessage()}>
                        {chatSending ? td("common.sending") : td("common.send")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {section === "faceAttendance" && (
          <Card>
            <CardHeader>
              <CardTitle>{td("face.title")}</CardTitle>
              <CardDescription>
                {td("face.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">{td("face.classRequired")}</label>
                <select
                  value={faceClassId}
                  onChange={(e) => setFaceClassId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">{td("face.selectClass")}</option>
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
                        setFaceResult({ type: "error", message: td("face.cameraOpenFailed") });
                      }
                    }}
                  >
                    {td("face.cameraOn")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={faceLoading || !faceClassId}
                      onClick={async () => {
                        if (!token || !faceVideoRef.current || !faceClassId) return;
                        setFaceResult(null);
                        setFaceLoading(true);
                        try {
                          const { loadFaceApiModels, getDescriptorFromVideo } = await loadFaceApiModule();
                          const ok = await loadFaceApiModels();
                          if (!ok) {
                            setFaceResult({ type: "error", message: td("face.modelsLoadFailed") });
                            return;
                          }
                          const descriptor = await getDescriptorFromVideo(faceVideoRef.current);
                          if (!descriptor || descriptor.length !== 128) {
                            setFaceResult({ type: "error", message: td("face.notDetected") });
                            return;
                          }
                          const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/face`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ descriptor, classId: faceClassId }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setFaceResult({
                              type: "error",
                              message: data.message || td("face.markFailed"),
                            });
                            return;
                          }
                          setFaceResult({
                            type: "success",
                            message: data.message || td("face.marked", { student: data.studentName }),
                          });
                        } catch (e) {
                          setFaceResult({
                            type: "error",
                            message: e instanceof Error ? e.message : td("errors.generic"),
                          });
                        } finally {
                          setFaceLoading(false);
                        }
                      }}
                    >
                      {faceLoading ? td("face.processing") : td("face.markAttendance")}
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
                      {td("face.cameraOff")}
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
        )}

        {section === "profile" && (
          <UnifiedProfileSection
            token={token}
            user={authUser}
            storageKey="teacher_profile_meta"
            roleLabel={td("common.subjectTeacher")}
          />
        )}

        {RENDER_LEGACY_PROFILE && section === "profile" && (
          <Card className="border-slate-200 bg-slate-50/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl font-semibold">{td("profile.information")}</CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    ref={teacherPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file?.type.startsWith("image/") || !token) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const dataUrl = reader.result as string;
                        setSavingTeacherProfile(true);
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
                          if (!res.ok) throw new Error(data.message || td("profile.saveFailed"));
                          setTeacherPhotoUrl(data.photoUrl || null);
                          const auth = localStorage.getItem("auth_user");
                          if (auth) {
                            const parsed = JSON.parse(auth);
                            parsed.photoUrl = data.photoUrl;
                            localStorage.setItem("auth_user", JSON.stringify(parsed));
                          }
                          toast({ title: td("profile.photoSaved") });
                        } catch (err) {
                          toast({
                            title: td("toasts.error"),
                            description: err instanceof Error ? err.message : td("profile.saveFailed"),
                            variant: "destructive",
                          });
                        } finally {
                          setSavingTeacherProfile(false);
                        }
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                  {teacherProfileEditMode ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          hydrateTeacherProfileFromStorage();
                          setTeacherProfileEditMode(false);
                        }}
                        disabled={savingTeacherProfileDetails}
                        className="rounded-full px-4"
                      >
                        {td("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleSaveTeacherProfileDetails()}
                        disabled={savingTeacherProfileDetails}
                        className="rounded-full px-4"
                      >
                        {savingTeacherProfileDetails ? td("common.sending") : td("common.save")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setTeacherProfileEditMode(true)}
                      className="rounded-full px-4"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {td("profile.edit")}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 rounded-2xl border bg-background p-5">
              <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-center">
                <div className="flex items-start justify-center lg:justify-start">
                  <div className="group relative h-[260px] w-[260px]">
                    <Avatar className="h-[260px] w-[260px] border-4 border-teal-600/90 bg-background">
                      {teacherPhotoUrl ? (
                        <AvatarImage src={teacherPhotoUrl} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-slate-100 text-muted-foreground">
                        <UserCircle className="h-40 w-40" />
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => teacherPhotoInputRef.current?.click()}
                      disabled={savingTeacherProfile || savingTeacherProfileDetails}
                      aria-label={td("profile.changePhoto")}
                      title={td("profile.changePhoto")}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <Camera className="h-9 w-9 text-teal-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{profileDisplayName || td("profile.namePlaceholder")}</p>
                  <p className="mt-1 text-base text-muted-foreground">{profileEmail || "-"}</p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(profileLocationSource || profileLocationText)}`}
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
                <h3 className="text-xl font-semibold text-foreground">{td("profile.personalDetails")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.firstName")}</label>
                    <input
                      value={profileFirstName}
                      onChange={(e) => handleTeacherProfileFieldChange("firstName", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.lastName")}</label>
                    <input
                      value={profileLastName}
                      onChange={(e) => handleTeacherProfileFieldChange("lastName", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.emailAddress")}</label>
                    <input
                      value={teacherProfileEditMode ? profileEmail : profileEmail || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("email", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.phone")}</label>
                    <input
                      value={teacherProfileEditMode ? profilePhone : profilePhone || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("phone", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.bio")}</label>
                    <input
                      value={teacherProfileEditMode ? profileBio : profileBio || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("bio", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.gender")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.gender : teacherProfileForm.gender || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("gender", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.dateOfBirth")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.dateOfBirth : teacherProfileForm.dateOfBirth || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("dateOfBirth", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.nationalId")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.nationalId : teacherProfileForm.nationalId || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("nationalId", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">{td("profile.address")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.country")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.country : teacherProfileForm.country || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("country", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.cityState")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.cityState : profileLocationText || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("cityState", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.postalCode")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.postalCode : teacherProfileForm.postalCode || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("postalCode", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.taxId")}</label>
                    <input
                      value={teacherProfileEditMode ? teacherProfileForm.taxId : teacherProfileForm.taxId || "-"}
                      onChange={(e) => handleTeacherProfileFieldChange("taxId", e.target.value)}
                      readOnly={!teacherProfileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={questionDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setQuestionDialogOpen(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{td("questionDialog.title", { exam: questionExamTitle || td("fallback.exam") })}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveExamQuestion} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">{td("questionDialog.questionText")}</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={td("questionDialog.questionPlaceholder")}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("questionDialog.type")}</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as "test" | "text")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="test">{td("questionDialog.typeTest")}</option>
                    <option value="text">{td("questionDialog.typeText")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("questionDialog.points")}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
                {questionType === "test" && (
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-muted-foreground">{td("questionDialog.correct")}</label>
                    <select
                      value={questionCorrectOption}
                      onChange={(e) => setQuestionCorrectOption(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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
                  <input
                    value={questionOptionA}
                    onChange={(e) => setQuestionOptionA(e.target.value)}
                    placeholder={td("questionDialog.optionA")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                  <input
                    value={questionOptionB}
                    onChange={(e) => setQuestionOptionB(e.target.value)}
                    placeholder={td("questionDialog.optionB")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                  <input
                    value={questionOptionC}
                    onChange={(e) => setQuestionOptionC(e.target.value)}
                    placeholder={td("questionDialog.optionC")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                  <input
                    value={questionOptionD}
                    onChange={(e) => setQuestionOptionD(e.target.value)}
                    placeholder={td("questionDialog.optionD")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={savingQuestion}>
                  {savingQuestion ? td("common.saving") : td("questionDialog.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={viewQuestionsDialogOpen}
          onOpenChange={(open) => {
            setViewQuestionsDialogOpen(open);
            if (!open) {
              setViewQuestionsRows([]);
              setViewQuestionsExamTitle("");
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{td("questionDialog.viewTitle", { exam: viewQuestionsExamTitle || td("fallback.exam") })}</DialogTitle>
            </DialogHeader>

            {viewQuestionsLoading ? (
              <ListSkeleton rows={4} />
            ) : viewQuestionsRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{td("questionDialog.viewEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {viewQuestionsRows.map((q, idx) => (
                  <div key={q.id} className="rounded-md border p-3">
                    <p className="text-sm font-semibold text-foreground">
                      {idx + 1}. {q.questionText}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {td("questionDialog.type")}: {q.type === "test" ? td("questionDialog.typeTest") : td("questionDialog.typeText")} • {td("questionDialog.points")}: {q.points}
                    </p>

                    {q.type === "test" && q.options.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-foreground">
                        {q.options.map((opt) => (
                          <li
                            key={`${q.id}-${opt.key}`}
                            className={`rounded border px-2 py-1 ${
                              q.correctAnswer && opt.key === q.correctAnswer
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "bg-muted/20"
                            }`}
                          >
                            {opt.key}. {opt.text}
                            {q.correctAnswer && opt.key === q.correctAnswer && (
                              <span className="ml-2 font-semibold">({td("questionDialog.correctLabel")})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setViewQuestionsDialogOpen(false)}>
                {td("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={reviewDialogOpen}
          onOpenChange={(open) => {
            setReviewDialogOpen(open);
            if (!open) {
              setSavingReviewAll(false);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {td("review.title", { student: reviewStudentName || "" })}
              </DialogTitle>
            </DialogHeader>

            {loadingReviewAnswers ? (
              <ListSkeleton rows={4} />
            ) : reviewAnswers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{td("review.empty")}</p>
            ) : (
              <div className="space-y-3">
                {reviewAnswers.map((answer, idx) => {
                  const isTest = answer.type === "test";
                  const hasCorrectKey = Boolean(answer.correctAnswerKey);
                  const hasStudentAnswer = Boolean((answer.answerText || "").trim());
                  const isCorrectTestAnswer =
                    isTest &&
                    hasCorrectKey &&
                    hasStudentAnswer &&
                    normalizeOptionKey(answer.answerText) === normalizeOptionKey(answer.correctAnswerKey);
                  const isWrongTestAnswer =
                    isTest &&
                    hasCorrectKey &&
                    hasStudentAnswer &&
                    !isCorrectTestAnswer;

                  return (
                  <div key={answer.questionId} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {idx + 1}. {answer.questionText}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {td("review.type")}: {answer.type === "test" ? td("questionDialog.typeTest") : td("questionDialog.typeText")} • {td("review.maxScore", { score: answer.maxScore })}
                        </p>
                      </div>
                      {answer.evaluatedAt ? (
                        <Badge variant="outline">{td("review.evaluated")}</Badge>
                      ) : (
                        <Badge variant="outline">{td("review.pending")}</Badge>
                      )}
                    </div>

                    <div
                      className={`mt-2 rounded-md border p-2 ${
                        isCorrectTestAnswer
                          ? "border-emerald-300 bg-emerald-50"
                          : isWrongTestAnswer
                            ? "border-rose-300 bg-rose-50"
                            : "bg-muted/30"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground">{td("review.studentAnswer")}</p>
                      <p
                        className={`text-sm whitespace-pre-wrap ${
                          isCorrectTestAnswer
                            ? "font-semibold text-emerald-800"
                            : isWrongTestAnswer
                              ? "font-semibold text-rose-800"
                              : "text-foreground"
                        }`}
                      >
                        {answer.answerText || td("review.noAnswer")}
                      </p>
                      {isCorrectTestAnswer && (
                        <p className="mt-1 text-xs font-medium text-emerald-700">{td("review.correctMarked")}</p>
                      )}
                      {isWrongTestAnswer && (
                        <p className="mt-1 text-xs font-medium text-rose-700">{td("review.wrongMarked")}</p>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-[110px_minmax(0,1fr)] md:items-end">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-muted-foreground">{td("review.score")}</label>
                        <input
                          type="number"
                          min={0}
                          max={answer.maxScore}
                          value={answer.awardedScore ?? ""}
                          disabled={Boolean(answer.evaluatedAt) || savingReviewAll}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReviewAnswers((prev) =>
                              prev.map((item) =>
                                item.questionId === answer.questionId
                                  ? {
                                      ...item,
                                      awardedScore:
                                        value === ""
                                          ? null
                                          : Math.min(
                                              Number(item.maxScore || 0),
                                              Math.max(0, Number(value)),
                                            ),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-muted-foreground">{td("review.commentOptional")}</label>
                        <input
                          value={answer.gradingComment || ""}
                          disabled={Boolean(answer.evaluatedAt) || savingReviewAll}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReviewAnswers((prev) =>
                              prev.map((item) =>
                                item.questionId === answer.questionId
                                  ? {
                                      ...item,
                                      gradingComment: value,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          placeholder={td("review.commentPlaceholder")}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              {reviewAnswers.length > 0 && (() => {
                const pendingCount = reviewAnswers.filter(
                  (row) => !row.evaluatedAt && Boolean(row.answerId),
                ).length;
                const isSubmitted = pendingCount === 0;

                return (
                  <Button
                    type="button"
                    onClick={() => void saveAllReviewedAnswers()}
                    disabled={savingReviewAll || loadingReviewAnswers || isSubmitted}
                  >
                    {savingReviewAll
                      ? td("common.saving")
                      : isSubmitted
                        ? td("review.submitted")
                        : td("review.saveAll")}
                  </Button>
                );
              })()}
              <Button type="button" variant="outline" onClick={() => setReviewDialogOpen(false)}>
                {td("common.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {editingStudent && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{td("students.edit.title")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-student-name">
                    Ism
                  </label>
                  <input
                    id="edit-student-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-student-email">
                    Email
                  </label>
                  <input
                    id="edit-student-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="block text-xs font-medium text-muted-foreground"
                    htmlFor="edit-student-password"
                  >
                    {td("students.edit.newPasswordOptional")}
                  </label>
                  <input
                    id="edit-student-password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={td("students.edit.newPasswordPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    {td("students.edit.profilePhoto")}
                  </label>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      {editPhotoUrl ? (
                        <AvatarImage src={editPhotoUrl} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserCircle className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <input
                        ref={editStudentPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file?.type.startsWith("image/")) return;
                          const r = new FileReader();
                          r.onload = () => setEditPhotoUrl(r.result as string);
                          r.readAsDataURL(file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editStudentPhotoInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {td("students.edit.upload")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditPhotoUrl(null)}
                      >
                        {td("students.edit.remove")}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-parent-name">
                    {td("students.form.parentName")}
                  </label>
                  <input
                    id="edit-parent-name"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-parent-phone">
                    {td("students.form.parentPhone")}
                  </label>
                  <input
                    id="edit-parent-phone"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-address">
                    {td("students.form.address")}
                  </label>
                  <input
                    id="edit-address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-student-class">
                    {td("table.class")}
                  </label>
                  <select
                    id="edit-student-class"
                    value={editClassId}
                    onChange={(e) => setEditClassId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("common.noChange")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  <Button type="submit">{td("common.save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {classStudentsDialogOpen && classForDialog && (
          <Dialog open={classStudentsDialogOpen} onOpenChange={setClassStudentsDialogOpen}>
            <DialogContent className="max-w-4xl rounded-2xl p-0">
              <DialogHeader className="px-6 pt-5 pb-3 border-b">
                <DialogTitle className="text-base font-semibold">
                  {td("classes.dialogTitle", { className: classForDialog.name })}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 pb-5">
                <div className="overflow-hidden rounded-xl border bg-background/80">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/60">
                        <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("table.student")}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("students.table.email")}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("students.table.parent")}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("students.table.phone")}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("students.table.address")}
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-semibold tracking-wide text-muted-foreground">
                          {td("table.class")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingStudents ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={`students-face-skel-${idx}`} className="border-b last:border-0">
                            {Array.from({ length: 6 }).map((__, cIdx) => (
                              <td key={cIdx} className="px-4 py-3">
                                <Skeleton className="h-4 w-full max-w-[140px]" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">
                            {td("classes.dialogEmpty")}
                          </td>
                        </tr>
                      ) : (
                        students.map((s, index) => (
                          <tr
                            key={s.id}
                            className={`border-b last:border-0 ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
                          >
                            <td className="px-4 py-2 text-[13px] font-medium text-foreground">{s.name}</td>
                            <td className="px-4 py-2 text-[12px] text-muted-foreground">{s.email}</td>
                            <td className="px-4 py-2 text-[12px] text-foreground">{s.parentName || "—"}</td>
                            <td className="px-4 py-2 text-[12px] text-foreground">{s.parentPhone || "—"}</td>
                            <td className="px-4 py-2 text-[12px] text-foreground">{s.address || "—"}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge className="inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold">
                                {s.className || classForDialog.name}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {editingGrade && (
          <Dialog open={editGradeDialogOpen} onOpenChange={setEditGradeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{td("grades.edit.title")}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!token || !editingGrade) return;
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/teacher/grades/${editingGrade.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        grade: editGradeValue ? Number(editGradeValue) : undefined,
                        date: editGradeDate || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.message || td("errors.updateGrade"));
                    }
                    toast({
                      title: td("toasts.saved"),
                      description: td("grades.edit.saved"),
                    });
                    setEditGradeDialogOpen(false);
                    setEditingGrade(null);
                    const targetClassId = gradesClassId || undefined;
                    await fetchGrades(targetClassId);
                  } catch (err: unknown) {
                    toast({
                      title: td("toasts.error"),
                      description:
                        err instanceof Error ? err.message : td("grades.edit.error"),
                      variant: "destructive",
                    });
                  }
                }}
                className="space-y-4 text-sm"
              >
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    O&apos;quvchi: <span className="font-medium text-foreground">{editingGrade.studentName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {td("table.class")}: <span className="font-medium text-foreground">{editingGrade.className}</span> | {td("table.subject")}:{" "}
                    <span className="font-medium text-foreground">{editingGrade.subjectName}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-grade-value">
                    {td("table.grade")}
                  </label>
                  <select
                    id="edit-grade-value"
                    value={editGradeValue}
                    onChange={(e) => setEditGradeValue(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">{td("common.noChange")}</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-grade-date">
                    {td("grades.form.dateOptional")}
                  </label>
                  <input
                    id="edit-grade-date"
                    type="date"
                    value={editGradeDate}
                    onChange={(e) => setEditGradeDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">{td("common.save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {editingHomework && (
          <Dialog open={editHomeworkDialogOpen} onOpenChange={setEditHomeworkDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{td("homework.edit.title")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateHomework} className="space-y-4 text-sm">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("table.class")}</label>
                  <select
                    value={editHomeworkClassId}
                    onChange={(e) => setEditHomeworkClassId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">{td("students.form.classPlaceholder")}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("homework.edit.description")}</label>
                  <textarea
                    value={editHomeworkDescription}
                    onChange={(e) => setEditHomeworkDescription(e.target.value)}
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={td("homework.edit.descriptionPlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("homework.form.deadline")}</label>
                  <input
                    type="date"
                    value={editHomeworkDeadline}
                    onChange={(e) => setEditHomeworkDeadline(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">{td("homework.edit.newFileOptional")}</label>
                  <input
                    type="file"
                    onChange={(e) => setEditHomeworkFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-muted-foreground"
                  />
                </div>

                <DialogFooter>
                  <Button type="submit">{td("common.save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {submissionMonitorHomework && (
          <Dialog open={submissionMonitorOpen} onOpenChange={setSubmissionMonitorOpen}>
            <DialogContent className="w-[96vw] max-w-[96vw] p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {td("homework.monitor.title")}: {submissionMonitorHomework.className} • {submissionMonitorHomework.subjectName}
                </DialogTitle>
              </DialogHeader>

              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  {td("homework.monitor.summary", {
                    total: submissionMonitorHomework.totalStudents || 0,
                    submitted: submissionMonitorHomework.submissionCount || 0,
                    pending: submissionMonitorHomework.pendingCount || 0,
                  })}
                </p>
              </div>

              <div className="max-h-[460px] overflow-x-auto overflow-y-auto rounded-md border">
                <table className="w-full table-fixed text-sm min-w-[980px]">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="w-[24%] p-3 text-left font-semibold text-foreground">O&apos;quvchi</th>
                      <th className="w-[14%] p-3 text-left font-semibold text-foreground">{td("homework.monitor.table.submittedDate")}</th>
                      <th className="w-[8%] p-3 text-left font-semibold text-foreground">{td("table.grade")}</th>
                      <th className="w-[29%] p-3 text-left font-semibold text-foreground">{td("homework.monitor.table.answerText")}</th>
                      <th className="w-[10%] p-3 text-left font-semibold text-foreground">{td("homework.monitor.table.file")}</th>
                      <th className="w-[15%] p-3 text-right font-semibold text-foreground">{td("exams.table.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(submissionMonitorHomework.submissions || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">
                          {td("homework.monitor.empty")}
                        </td>
                      </tr>
                    ) : (
                      (submissionMonitorHomework.submissions || []).map((s) => (
                        <tr key={s.id} className="border-b last:border-0 align-top hover:bg-muted/20">
                          <td className="p-3">
                            <p className="font-medium text-foreground">{s.studentName}</p>
                            <p className="text-xs text-muted-foreground">{s.studentEmail || ""}</p>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {s.submittedAt ? (
                              <div className="space-y-0.5">
                                <p>{new Date(s.submittedAt).toLocaleDateString()}</p>
                                <p>{new Date(s.submittedAt).toLocaleTimeString()}</p>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-xs whitespace-nowrap">
                            {s.gradedScore != null ? (
                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground">{s.gradedScore}</p>
                                <p className="text-muted-foreground">
                                  {s.gradedAt ? new Date(s.gradedAt).toLocaleDateString() : ""}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">{td("homework.monitor.ungraded")}</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            <p className="whitespace-pre-wrap break-words">{s.answerText || "—"}</p>
                            {s.gradingComment ? (
                              <p className="mt-2 rounded-md border bg-muted/60 p-2 text-[11px] text-foreground whitespace-pre-wrap break-words">
                                {td("homework.monitor.teacherComment")}: {s.gradingComment}
                              </p>
                            ) : null}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground break-words">
                            {s.attachmentUrl ? (
                              <a
                                href={s.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {s.attachmentOriginalName || td("homework.table.openFile")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <Button
                              type="button"
                              size="sm"
                              variant={s.gradedScore != null ? "outline" : "default"}
                              className="px-3"
                              onClick={() => openGradeSubmissionDialog(s)}
                            >
                              {s.gradedScore != null ? td("homework.monitor.actions.regrade") : td("homework.monitor.actions.grade")}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={gradeSubmissionDialogOpen} onOpenChange={setGradeSubmissionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{td("homework.grading.title")}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveSubmissionGrade} className="space-y-4 text-sm">
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                {td("table.student")}: <span className="font-medium text-foreground">{gradingSubmissionStudentName}</span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="grading-score">
                  {td("homework.grading.scoreLabel")}
                </label>
                <input
                  id="grading-score"
                  type="number"
                  min={1}
                  max={100}
                  value={gradingSubmissionScore}
                  onChange={(e) => setGradingSubmissionScore(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="grading-comment">
                  {td("review.commentOptional")}
                </label>
                <textarea
                  id="grading-comment"
                  value={gradingSubmissionComment}
                  onChange={(e) => setGradingSubmissionComment(e.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={td("homework.grading.commentPlaceholder")}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={gradingSubmissionSaving}>
                  {gradingSubmissionSaving ? td("common.saving") : td("homework.grading.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Clock, FileText, Award, CalendarDays, MapPin, Pencil, Upload, UserCircle, Camera } from "lucide-react";
import LiveDateTimeBadge from "@/components/dashboard/LiveDateTimeBadge";
import StudentLayout, { type StudentSection } from "@/components/StudentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type ApiGrade = { _id: string; grade: number; date: string; subject?: { name?: string }; teacherName?: string };
type ApiAttendance = { _id: string; date: string; status: "present" | "absent" | "late" };
type ApiHomework = {
  _id: string;
  description: string;
  deadline: string;
  subject?: { name?: string };
  teacherName?: string;
  attachmentUrl?: string | null;
  attachmentOriginalName?: string | null;
  mySubmission?: {
    answerText?: string;
    attachmentUrl?: string | null;
    attachmentOriginalName?: string | null;
    submittedAt?: string;
    gradedScore?: number | null;
    gradingComment?: string;
    gradedAt?: string | null;
  } | null;
};
type ApiTimetableEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  subjectName: string;
  teacherName: string;
  className?: string;
};

type StudentExamListItem = {
  id: string;
  title: string;
  duration: number;
  startTime: string;
  endTime: string;
  status: "upcoming" | "active" | "in_progress" | "completed" | "ended";
  canStart: boolean;
  canResume: boolean;
  alreadyAttempted: boolean;
  attemptId: string | null;
  attemptStatus: string | null;
  totalScore: number | null;
  maxScore: number | null;
  isFinalScore: boolean | null;
};

type StudentExamQuestion = {
  id: string;
  questionText: string;
  type: "test" | "text";
  options: Array<{ key: string; text: string }>;
  points: number;
  order: number;
};

type StudentExamAttemptPayload = {
  attemptId: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  serverTime: string;
  questions: StudentExamQuestion[];
  answers: Array<{ questionId: string; answer?: string }>;
};

type StudentHeaderNotification = {
  id: string;
  text: string;
  at: string;
  section: StudentSection;
};

const DAY_LABELS: Record<number, string> = {
  0: "days.sunday",
  1: "days.monday",
  2: "days.tuesday",
  3: "days.wednesday",
  4: "days.thursday",
  5: "days.friday",
  6: "days.saturday",
};

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];
const TABLE_PAGE_SIZE = 5;

type FaceApiModule = typeof import("@/lib/faceApi");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;

const loadFaceApiModule = async (): Promise<FaceApiModule> => {
  if (!faceApiModulePromise) {
    faceApiModulePromise = import("@/lib/faceApi");
  }

  return faceApiModulePromise;
};

const getQuarterByDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth();
  if (month <= 2) return "q1";
  if (month <= 5) return "q2";
  if (month <= 8) return "q3";
  return "q4";
};

const GradeBadge = ({ grade }: { grade: number }) => {
  const colors =
    grade === 5
      ? "bg-secondary text-secondary-foreground"
      : grade === 4
        ? "bg-primary text-primary-foreground"
        : grade === 3
          ? "bg-amber-500 text-white"
          : "bg-destructive text-destructive-foreground";
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${colors}`}
    >
      {grade}
    </span>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");
  const { t: td, i18n } = useTranslation("student-dashboard");
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    schoolName?: string;
    schoolAddress?: string;
    photoUrl?: string | null;
    className?: string | null;
  } | null>(null);
  const [section, setSection] = useState<StudentSection>("overview");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [savingProfilePhoto, setSavingProfilePhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const studentPhotoInputRef = useRef<HTMLInputElement>(null);
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

  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [attendance, setAttendance] = useState<ApiAttendance[]>([]);
  const [homework, setHomework] = useState<ApiHomework[]>([]);
  const [timetable, setTimetable] = useState<ApiTimetableEntry[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [studentExams, setStudentExams] = useState<StudentExamListItem[]>([]);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [activeExamTitle, setActiveExamTitle] = useState("");
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeExamQuestions, setActiveExamQuestions] = useState<StudentExamQuestion[]>([]);
  const [activeExamAnswers, setActiveExamAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [gradeSearch, setGradeSearch] = useState("");
  const [gradeSubjectFilter, setGradeSubjectFilter] = useState("all");
  const [gradeQuarterFilter, setGradeQuarterFilter] = useState<"all" | "q1" | "q2" | "q3" | "q4">("all");
  const [gradesPage, setGradesPage] = useState(1);
  const [studentExamsPage, setStudentExamsPage] = useState(1);
  const [homeworkPage, setHomeworkPage] = useState(1);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<ApiHomework | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submittingHomework, setSubmittingHomework] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const uiLocale = i18n.language === "ru" ? "ru-RU" : i18n.language === "en" ? "en-US" : "uz-UZ";
  const dayLabel = useCallback((day: number) => td(DAY_LABELS[day] || "days.monday"), [td]);

  const profileDisplayName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
  const profileFirstName = profileForm.firstName;
  const profileLastName = profileForm.lastName;
  const profileEmail = profileForm.email;
  const profilePhone = profileForm.phone;
  const profileBio = profileForm.bio || (user?.className ? `${td("schedule.linkedClass", { class: user.className })}` : "");
  const profileLocationSource = (user?.schoolAddress || user?.schoolName || "").trim();
  const profileLocationText = useMemo(() => {
    if (profileForm.cityState.trim()) return profileForm.cityState.trim();
    if (!profileLocationSource) return td("profile.locationDisplay");
    const parts = profileLocationSource
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
    }
    return profileLocationSource;
  }, [profileForm.cityState, profileLocationSource, td]);

  const buildStudentProfileFormFromStorage = useCallback((fallbackClassName?: string | null) => {
    const raw = localStorage.getItem("auth_user");
    const parsed = raw ? JSON.parse(raw) : {};
    const fullName = (parsed?.name || "").toString().trim();
    const parts = fullName.split(" ").filter(Boolean);
    const extrasRaw = localStorage.getItem("student_profile_meta");
    const extras = extrasRaw ? JSON.parse(extrasRaw) : {};

    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      email: (parsed?.email || "").toString(),
      phone: (parsed?.phone || "").toString(),
      bio: (extras?.bio || (fallbackClassName ? td("schedule.linkedClass", { class: fallbackClassName }) : "")).toString(),
      gender: (extras?.gender || "").toString(),
      dateOfBirth: (extras?.dateOfBirth || "").toString(),
      nationalId: (extras?.nationalId || "").toString(),
      country: (extras?.country || "").toString(),
      cityState: (extras?.cityState || "").toString(),
      postalCode: (extras?.postalCode || "").toString(),
      taxId: (extras?.taxId || "").toString(),
    };
  }, [td]);

  const handleStudentProfileFieldChange = (key: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const data = localStorage.getItem("auth_user");
    if (!data) {
      navigate("/login");
      return;
    }
    const parsed = JSON.parse(data);
    if (parsed.role !== "student") {
      navigate("/login");
      return;
    }
    setUser(parsed);
    setProfilePhotoUrl(parsed.photoUrl || null);
    setProfileForm(buildStudentProfileFormFromStorage(parsed.className || null));
  }, [buildStudentProfileFormFromStorage, navigate]);

  const fetchHomework = useCallback(async () => {
    if (!token) return;
    setLoadingHomework(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/homework`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || td("errors.homeworkLoad"));
      }
      const data = await res.json();
      setHomework(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({
        title: td("toasts.error"),
        description: e instanceof Error ? e.message : td("errors.homeworkLoadDesc"),
        variant: "destructive",
      });
      setHomework([]);
    } finally {
      setLoadingHomework(false);
    }
  }, [td, token, toast]);

  const fetchStudentExams = useCallback(async () => {
    if (!token) return;
    setLoadingExams(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || td("errors.examsLoad"));
      }
      const data = await res.json();
      setStudentExams(Array.isArray(data) ? data : []);
    } catch (e) {
      toast({
        title: td("toasts.error"),
        description: e instanceof Error ? e.message : td("errors.examsLoadDesc"),
        variant: "destructive",
      });
      setStudentExams([]);
    } finally {
      setLoadingExams(false);
    }
  }, [td, token, toast]);

  useEffect(() => {
    if (!token) return;
    const fetchGrades = async () => {
      setLoadingGrades(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/grades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || td("errors.gradesLoad"));
        }
        const data = await res.json();
        setGrades(Array.isArray(data) ? data : []);
      } catch (e) {
        toast({
          title: td("toasts.error"),
          description: e instanceof Error ? e.message : td("errors.gradesLoadDesc"),
          variant: "destructive",
        });
        setGrades([]);
      } finally {
        setLoadingGrades(false);
      }
    };
    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || td("errors.attendanceLoad"));
        }
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : []);
      } catch (e) {
        toast({
          title: td("toasts.error"),
          description: e instanceof Error ? e.message : td("errors.attendanceLoadDesc"),
          variant: "destructive",
        });
        setAttendance([]);
      } finally {
        setLoadingAttendance(false);
      }
    };
    const fetchTimetable = async () => {
      setLoadingTimetable(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || td("errors.scheduleLoad"));
        }
        const data = await res.json();
        setTimetable(Array.isArray(data) ? data : []);
      } catch (e) {
        toast({
          title: td("toasts.error"),
          description: e instanceof Error ? e.message : td("errors.scheduleLoadDesc"),
          variant: "destructive",
        });
        setTimetable([]);
      } finally {
        setLoadingTimetable(false);
      }
    };
    fetchGrades();
    fetchAttendance();
    fetchHomework();
    fetchTimetable();
    fetchStudentExams();
  }, [td, token, toast, fetchHomework, fetchStudentExams]);

  const openHomeworkSubmission = (hw: ApiHomework) => {
    setSelectedHomework(hw);
    setSubmissionText(hw.mySubmission?.answerText || "");
    setSubmissionFile(null);
    setSubmissionDialogOpen(true);
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedHomework) return;

    if (!submissionText.trim() && !submissionFile) {
      toast({
        title: td("toasts.insufficientData"),
        description: td("validation.submissionRequired"),
        variant: "destructive",
      });
      return;
    }

    setSubmittingHomework(true);
    try {
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append("answerText", submissionText.trim());
      }
      if (submissionFile) {
        formData.append("attachment", submissionFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/student/homework/${selectedHomework._id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.homeworkSubmit"));
      }

      toast({
        title: td("toasts.submitted"),
        description: td("messages.homeworkSubmitted"),
      });
      setSubmissionDialogOpen(false);
      setSelectedHomework(null);
      setSubmissionFile(null);
      await fetchHomework();
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.homeworkSubmitDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmittingHomework(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfilePhotoUrl(data.photoUrl || null);
        setUser((prev) => {
          const next = prev
            ? {
                ...prev,
                name: data.name || prev.name || "",
                email: data.email || prev.email || "",
                photoUrl: data.photoUrl || prev.photoUrl || null,
                className: data.className || prev.className || null,
              }
            : prev;
          setProfileForm((current) => ({
            ...current,
            firstName: (data.name || "").toString().split(" ")[0] || current.firstName,
            lastName: (data.name || "").toString().split(" ").slice(1).join(" ") || current.lastName,
            email: (data.email || current.email || "").toString(),
          }));
          return next;
        });
      }
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchProfile();
  }, [token, fetchProfile]);

  useEffect(() => {
    if (section === "profile" && token) {
      setProfileEditMode(false);
      fetchProfile();
    }
  }, [section, token, fetchProfile]);

  useEffect(() => {
    if (section === "exams" && token) {
      void fetchStudentExams();
    }
  }, [section, token, fetchStudentExams]);

  useEffect(() => {
    if (!examDialogOpen || remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [examDialogOpen, remainingSeconds]);

  const formatRemaining = (seconds: number) => {
    const safe = Math.max(0, Number(seconds || 0));
    const hh = Math.floor(safe / 3600)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor((safe % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(safe % 60)
      .toString()
      .padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const hydrateExamAttempt = (payload: StudentExamAttemptPayload, examTitle: string) => {
    const answerMap: Record<string, string> = {};
    (payload.answers || []).forEach((a) => {
      const qid = String(a.questionId || "");
      if (!qid) return;
      answerMap[qid] = (a.answer || "").toString();
    });

    setActiveExamTitle(examTitle);
    setActiveAttemptId(payload.attemptId);
    setActiveExamQuestions(Array.isArray(payload.questions) ? payload.questions : []);
    setActiveExamAnswers(answerMap);
    setRemainingSeconds(Number(payload.remainingSeconds || 0));
    setExamDialogOpen(true);
  };

  const handleStartOrResumeExam = async (exam: StudentExamListItem) => {
    if (!token) return;
    setStartingExamId(exam.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exams/${exam.id}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.examStart"));
      }

      hydrateExamAttempt(data as StudentExamAttemptPayload, exam.title);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.examStartDesc"),
        variant: "destructive",
      });
      await fetchStudentExams();
    } finally {
      setStartingExamId(null);
    }
  };

  const handleExamAnswerChange = (questionId: string, value: string) => {
    setActiveExamAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isExamFullyAnswered = useMemo(() => {
    if (activeExamQuestions.length === 0) return false;
    return activeExamQuestions.every((q) => {
      const answerValue = (activeExamAnswers[q.id] || "").toString().trim();
      return answerValue.length > 0;
    });
  }, [activeExamQuestions, activeExamAnswers]);

  const handleSubmitExamAttempt = async () => {
    if (!token || !activeAttemptId) return;
    if (!isExamFullyAnswered) {
      toast({
        title: td("toasts.incompleteAnswers"),
        description: td("validation.examAnswerAll"),
        variant: "destructive",
      });
      return;
    }
    setSubmittingExam(true);
    try {
      const answersPayload = activeExamQuestions.map((q) => {
        const answerValue = (activeExamAnswers[q.id] || "").toString().trim();
        if (q.type === "test") {
          return {
            questionId: q.id,
            selectedOptionKey: answerValue,
          };
        }
        return {
          questionId: q.id,
          textAnswer: answerValue,
        };
      });

      const res = await fetch(`${API_BASE_URL}/api/exams/attempts/${activeAttemptId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answersPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || td("errors.examSubmit"));
      }

      toast({
        title: td("toasts.examSubmitted"),
        description:
          data.isFinalScore
            ? td("messages.examSubmittedFinal", { percent: Number(data.gradePercent || 0) })
            : td("messages.examSubmittedManual"),
      });

      setExamDialogOpen(false);
      setActiveAttemptId(null);
      setActiveExamTitle("");
      setActiveExamQuestions([]);
      setActiveExamAnswers({});
      setRemainingSeconds(0);

      await fetchStudentExams();
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.examSubmitDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleSaveProfileDetails = async () => {
    if (!token) return;
    const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
    if (!fullName || !profileForm.email.trim()) {
      toast({
        title: td("toasts.error"),
        description: td("profile.requiredFields"),
        variant: "destructive",
      });
      return;
    }
    setSavingProfile(true);
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
      if (!res.ok) throw new Error(data.message || td("errors.nameSave"));

      const auth = localStorage.getItem("auth_user");
      if (auth) {
        const parsed = JSON.parse(auth);
        parsed.name = data.name;
        parsed.email = data.email;
        parsed.phone = data.phone ?? null;
        localStorage.setItem("auth_user", JSON.stringify(parsed));
      }

      localStorage.setItem(
        "student_profile_meta",
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

      const nameParts = (data.name || "").toString().trim().split(" ").filter(Boolean);
      setProfileForm((prev) => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" "),
        email: (data.email || "").toString(),
        phone: (data.phone || "").toString(),
      }));
      setUser((prev) => (prev ? { ...prev, name: data.name, email: data.email || "", phone: data.phone || "" } : prev));
      setProfileEditMode(false);
      toast({ title: td("messages.nameSaved") });
    } catch (e) {
      toast({
        title: td("toasts.error"),
        description: e instanceof Error ? e.message : td("errors.nameSaveDesc"),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const resetProfileDraft = () => {
    setProfileForm(buildStudentProfileFormFromStorage(user?.className || null));
  };

  const todaySchedule = useMemo(() => {
    const today = new Date().getDay();
    return timetable
      .filter((e) => e.dayOfWeek === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable]);

  const nextLesson = useMemo(() => {
    if (timetable.length === 0) return null;

    const now = new Date();
    const nowDay = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const toMinutes = (time: string) => {
      const [h, m] = (time || "00:00").split(":").map(Number);
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };

    let best: ApiTimetableEntry | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const lesson of timetable) {
      const lessonMinutes = toMinutes(lesson.startTime);
      const dayDistance = (lesson.dayOfWeek - nowDay + 7) % 7;
      const minuteDistance = dayDistance * 24 * 60 + (lessonMinutes - nowMinutes);
      const normalizedDistance = minuteDistance >= 0 ? minuteDistance : minuteDistance + 7 * 24 * 60;

      if (normalizedDistance < bestDistance) {
        bestDistance = normalizedDistance;
        best = lesson;
      }
    }

    return best;
  }, [timetable]);

  const weeklySchedule = useMemo(() => {
    const byDay: Record<number, ApiTimetableEntry[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    timetable.forEach((entry) => {
      byDay[entry.dayOfWeek] = [...(byDay[entry.dayOfWeek] || []), entry];
    });

    WEEK_DAYS.forEach((day) => {
      byDay[day] = (byDay[day] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return byDay;
  }, [timetable]);

  const avgGrade = useMemo(() => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((s, g) => s + g.grade, 0);
    return (sum / grades.length).toFixed(1);
  }, [grades]);

  const subjectCount = useMemo(() => {
    const names = new Set(grades.map((g) => g.subject?.name).filter(Boolean));
    return names.size;
  }, [grades]);

  const attendancePercent = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const month = attendance.filter((a) => new Date(a.date) >= startOfMonth);
    if (month.length === 0) return null;
    const present = month.filter((a) => a.status === "present").length;
    return Math.round((present / month.length) * 100);
  }, [attendance]);

  const gradeSubjects = useMemo(() => {
    return Array.from(
      new Set(grades.map((g) => (g.subject?.name || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [grades]);

  const filteredGrades = useMemo(() => {
    const term = gradeSearch.trim().toLowerCase();

    return grades.filter((g) => {
      const subject = (g.subject?.name || "").toLowerCase();
      const teacher = (g.teacherName || "").toLowerCase();
      const dateText = g.date ? new Date(g.date).toLocaleDateString().toLowerCase() : "";

      const matchesSubject = gradeSubjectFilter === "all" || (g.subject?.name || "") === gradeSubjectFilter;
      const matchesQuarter = gradeQuarterFilter === "all" || getQuarterByDate(g.date) === gradeQuarterFilter;
      const matchesSearch =
        term.length === 0 ||
        subject.includes(term) ||
        teacher.includes(term) ||
        dateText.includes(term) ||
        String(g.grade).includes(term);

      return matchesSubject && matchesQuarter && matchesSearch;
    });
  }, [grades, gradeSearch, gradeSubjectFilter, gradeQuarterFilter]);

  const sortedFilteredGrades = useMemo(() => {
    return [...filteredGrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredGrades]);

  const gradesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedFilteredGrades.length / TABLE_PAGE_SIZE)),
    [sortedFilteredGrades.length],
  );

  const pagedGrades = useMemo(() => {
    const start = (gradesPage - 1) * TABLE_PAGE_SIZE;
    return sortedFilteredGrades.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedFilteredGrades, gradesPage]);

  const studentExamsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(studentExams.length / TABLE_PAGE_SIZE)),
    [studentExams.length],
  );

  const pagedStudentExams = useMemo(() => {
    const safePage = Math.min(studentExamsPage, studentExamsTotalPages);
    const start = (safePage - 1) * TABLE_PAGE_SIZE;
    return studentExams.slice(start, start + TABLE_PAGE_SIZE);
  }, [studentExams, studentExamsPage, studentExamsTotalPages]);

  const homeworkTotalPages = useMemo(
    () => Math.max(1, Math.ceil(homework.length / TABLE_PAGE_SIZE)),
    [homework.length],
  );

  const pagedHomework = useMemo(() => {
    const safePage = Math.min(homeworkPage, homeworkTotalPages);
    const start = (safePage - 1) * TABLE_PAGE_SIZE;
    return homework.slice(start, start + TABLE_PAGE_SIZE);
  }, [homework, homeworkPage, homeworkTotalPages]);

  useEffect(() => {
    setGradesPage(1);
  }, [gradeSearch, gradeSubjectFilter, gradeQuarterFilter]);

  useEffect(() => {
    if (gradesPage > gradesTotalPages) {
      setGradesPage(gradesTotalPages);
    }
  }, [gradesPage, gradesTotalPages]);

  useEffect(() => {
    if (studentExamsPage > studentExamsTotalPages) {
      setStudentExamsPage(studentExamsTotalPages);
    }
  }, [studentExamsPage, studentExamsTotalPages]);

  useEffect(() => {
    if (homeworkPage > homeworkTotalPages) {
      setHomeworkPage(homeworkTotalPages);
    }
  }, [homeworkPage, homeworkTotalPages]);

  useEffect(() => {
    setStudentExamsPage(1);
  }, [studentExams.length]);

  useEffect(() => {
    setHomeworkPage(1);
  }, [homework.length]);
  const searchItems = useMemo(
    () => [
      ...grades.map((g) => ({
        id: g._id,
        title: g.subject?.name || td("fallback.subject"),
        subtitle: td("search.grade", { grade: g.grade }),
        section: "grades" as const,
      })),
      ...homework.map((h) => ({
        id: h._id,
        title: h.subject?.name || td("fallback.homework"),
        subtitle: h.description,
        section: "homework" as const,
      })),
      ...studentExams.map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: `${new Date(e.startTime).toLocaleString()} - ${new Date(e.endTime).toLocaleString()}`,
        section: "exams" as const,
      })),
      ...timetable.map((t) => ({
        id: t.id,
        title: t.subjectName,
        subtitle: `${t.teacherName} • ${t.startTime}-${t.endTime}`,
        section: "schedule" as const,
      })),
      ...attendance.map((a) => ({
        id: a._id,
        title: td("search.attendance", { status: td(`attendanceStatus.${a.status}`) }),
        subtitle: new Date(a.date).toLocaleDateString(uiLocale),
        section: "overview" as const,
      })),
    ],
    [grades, homework, studentExams, timetable, attendance, td, uiLocale],
  );

  const headerNotifications = useMemo<StudentHeaderNotification[]>(() => {
    const now = new Date();
    const ts = now.toLocaleString(uiLocale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    const next: StudentHeaderNotification[] = [];

    if (todaySchedule.length > 0) {
      const firstLesson = todaySchedule[0];
      next.push({
        id: `student:lesson:${firstLesson.id}`,
        text: td("notifications.firstLesson", { subject: firstLesson.subjectName, time: firstLesson.startTime }),
        at: ts,
        section: "schedule",
      });
    } else {
      next.push({
        id: "student:no-lesson-today",
        text: td("notifications.noLessonToday"),
        at: ts,
        section: "schedule",
      });
    }

    if (nextLesson) {
      next.push({
        id: `student:next-lesson:${nextLesson.id}`,
        text: td("notifications.nextLesson", { day: dayLabel(nextLesson.dayOfWeek), time: nextLesson.startTime, subject: nextLesson.subjectName }),
        at: ts,
        section: "schedule",
      });
    }

    if (homework.length > 0) {
      const urgentHomework = [...homework]
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
      next.push({
        id: `student:homework:${urgentHomework._id}`,
        text: td("notifications.homeworkDue", { subject: urgentHomework.subject?.name || td("fallback.subject") }),
        at: ts,
        section: "homework",
      });
    }

    if (studentExams.length > 0) {
      const nearestExam = [...studentExams].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )[0];
      next.push({
        id: `student:exam:${nearestExam.id}`,
        text: td("notifications.exam", { title: nearestExam.title, time: new Date(nearestExam.startTime).toLocaleString(uiLocale) }),
        at: ts,
        section: "exams",
      });
    }

    if (grades.length > 0) {
      const recentGrade = [...grades]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      next.push({
        id: `student:grade:${recentGrade._id}`,
        text: td("notifications.newGrade", { subject: recentGrade.subject?.name || td("fallback.subject"), grade: recentGrade.grade }),
        at: ts,
        section: "grades",
      });
    }

    if (attendance.length > 0) {
      const lastAttendance = attendance[0];
      next.push({
        id: `student:attendance:${lastAttendance._id}`,
        text:
          lastAttendance.status === "present"
            ? td("notifications.attendancePresent")
            : lastAttendance.status === "late"
            ? td("notifications.attendanceLate")
            : td("notifications.attendanceAbsent"),
        at: ts,
        section: "overview",
      });
    }

    return next.slice(0, 8);
  }, [attendance, dayLabel, grades, homework, nextLesson, studentExams, td, todaySchedule, uiLocale]);

  if (!user) return null;

  return (
    <StudentLayout
      title={t("dashboard.student.title")}
      subtitle={
        user.schoolName
          ? t("dashboard.student.subtitleWithSchool", { school: user.schoolName })
          : t("dashboard.student.subtitleDefault")
      }
      currentSection={section}
      onSectionChange={setSection}
      headerNotifications={headerNotifications}
      searchItems={searchItems}
    >
      <div className="space-y-8">
        {section === "overview" && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{td("overview.statsTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {td("overview.statsDesc")}
                </p>
              </div>
              <LiveDateTimeBadge />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {td("overview.avgGrade")}
                  </CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {loadingGrades ? "—" : avgGrade ?? "—"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{td("overview.avgGradeHint")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {td("overview.subjectCount")}
                  </CardTitle>
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {loadingGrades ? "—" : subjectCount}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{td("overview.gradedSubjects")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {td("overview.homework")}
                  </CardTitle>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {loadingHomework ? "—" : homework.length}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{td("overview.classAssigned")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{td("overview.attendance")}</CardTitle>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {loadingAttendance ? "—" : attendancePercent != null ? `${attendancePercent}%` : "—"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{td("overview.currentMonth")}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{td("overview.summaryTitle")}</CardTitle>
                <CardDescription>
                  {td("overview.summaryDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {td("overview.summaryHint")}
              </CardContent>
            </Card>
          </>
        )}

        {section === "schedule" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{td("schedule.nextLesson")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTimetable ? (
                    <p className="text-sm text-muted-foreground">{td("common.loading")}</p>
                  ) : nextLesson ? (
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{nextLesson.subjectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel(nextLesson.dayOfWeek)} • {nextLesson.startTime} - {nextLesson.endTime}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nextLesson.teacherName || td("schedule.teacherMissing")}
                        {nextLesson.room ? ` • ${td("schedule.room", { room: nextLesson.room })}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{td("schedule.noLesson")}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{td("schedule.todayLessons")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{loadingTimetable ? "—" : todaySchedule.length}</p>
                  <p className="text-xs text-muted-foreground">{td("schedule.onDay", { day: dayLabel(new Date().getDay()) })}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{td("schedule.weeklyLessons")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{loadingTimetable ? "—" : timetable.length}</p>
                  <p className="text-xs text-muted-foreground">{td("schedule.weeklyCount")}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{td("schedule.weeklyTitle")}</CardTitle>
                <CardDescription>
                  {td("schedule.weeklyDesc")}
                </CardDescription>
                <p className="text-xs text-muted-foreground">
                  {td("schedule.linkedClass", { class: user?.className || td("schedule.unknownClass") })}
                </p>
              </CardHeader>
              <CardContent>
                {loadingTimetable ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">{td("common.loading")}</div>
                ) : timetable.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {user?.className
                      ? td("schedule.emptyForClass", { class: user.className })
                      : td("schedule.emptyGeneric")}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                    {WEEK_DAYS.map((day, idx) => {
                      const dayLessons = weeklySchedule[day] || [];
                      const isToday = day === new Date().getDay();

                      return (
                        <motion.div
                          key={day}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`rounded-lg border bg-muted/40 p-2 ${isToday ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground">{dayLabel(day)}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {dayLessons.length > 0 ? td("schedule.lessonsCount", { count: dayLessons.length }) : "0"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {dayLessons.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground">{td("schedule.noLessonShort")}</p>
                            ) : (
                              dayLessons.map((lesson) => (
                                <div key={lesson.id} className="rounded-md bg-background px-2 py-1.5 shadow-sm">
                                  <p className="text-[10px] font-mono text-muted-foreground">
                                    {lesson.startTime} - {lesson.endTime}
                                  </p>
                                  <p className="text-[11px] font-medium text-foreground line-clamp-2">{lesson.subjectName}</p>
                                  <p className="text-[10px] text-muted-foreground">{lesson.teacherName || "—"}</p>
                                  <p className="text-[10px] text-muted-foreground">{lesson.room ? td("schedule.room", { room: lesson.room }) : td("schedule.roomDash")}</p>
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
          </div>
        )}

        {section === "grades" && (
          <Card>
            <CardHeader>
              <CardTitle>{td("grades.title")}</CardTitle>
              <CardDescription>
                {td("grades.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  value={gradeSearch}
                  onChange={(e) => setGradeSearch(e.target.value)}
                  placeholder={td("grades.searchPlaceholder")}
                  className="md:col-span-2"
                />
                <select
                  value={gradeSubjectFilter}
                  onChange={(e) => setGradeSubjectFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">{td("grades.allSubjects")}</option>
                  {gradeSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <select
                  value={gradeQuarterFilter}
                  onChange={(e) => setGradeQuarterFilter(e.target.value as "all" | "q1" | "q2" | "q3" | "q4")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">{td("grades.allQuarters")}</option>
                  <option value="q1">{td("grades.q1")}</option>
                  <option value="q2">{td("grades.q2")}</option>
                  <option value="q3">{td("grades.q3")}</option>
                  <option value="q4">{td("grades.q4")}</option>
                </select>
              </div>

              <div className="overflow-x-auto">
              {loadingGrades ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{td("common.loading")}</div>
              ) : filteredGrades.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {td("grades.empty")}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">{td("grades.table.subject")}</TableHead>
                        <TableHead className="font-semibold">{td("grades.table.teacher")}</TableHead>
                        <TableHead className="text-center font-semibold">{td("grades.table.grade")}</TableHead>
                        <TableHead className="font-semibold">{td("grades.table.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedGrades.map((g) => (
                        <TableRow key={g._id}>
                          <TableCell className="font-medium">{g.subject?.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{g.teacherName || "—"}</TableCell>
                          <TableCell className="text-center">
                            <GradeBadge grade={g.grade} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(g.date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {td("grades.total", { count: sortedFilteredGrades.length, page: gradesPage, total: gradesTotalPages })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={gradesPage <= 1}
                        onClick={() => setGradesPage((p) => Math.max(1, p - 1))}
                      >
                        {td("common.prev")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={gradesPage >= gradesTotalPages}
                        onClick={() => setGradesPage((p) => Math.min(gradesTotalPages, p + 1))}
                      >
                        {td("common.next")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
              </div>
            </CardContent>
          </Card>
        )}

        {section === "exams" && (
          <Card>
            <CardHeader>
              <CardTitle>{td("exams.title")}</CardTitle>
              <CardDescription>
                {td("exams.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-0">
              <div className="flex justify-end px-4 pt-4">
                <Button type="button" size="sm" variant="outline" onClick={() => void fetchStudentExams()}>
                  {td("common.refresh")}
                </Button>
              </div>

              {loadingExams ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{td("common.loading")}</div>
              ) : studentExams.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {td("exams.empty")}
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{td("exams.table.title")}</TableHead>
                      <TableHead>{td("exams.table.timeRange")}</TableHead>
                      <TableHead>{td("exams.table.duration")}</TableHead>
                      <TableHead>{td("exams.table.status")}</TableHead>
                      <TableHead>{td("exams.table.result")}</TableHead>
                      <TableHead className="text-right">{td("exams.table.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedStudentExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}
                        </TableCell>
                        <TableCell>{td("exams.duration", { value: exam.duration })}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                              exam.status === "active" || exam.status === "in_progress"
                                ? "bg-emerald-100 text-emerald-700"
                                : exam.status === "upcoming"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {exam.status === "upcoming"
                              ? td("exams.status.upcoming")
                              : exam.status === "active"
                              ? td("exams.status.active")
                              : exam.status === "in_progress"
                              ? td("exams.status.inProgress")
                              : exam.status === "completed"
                              ? td("exams.status.completed")
                              : td("exams.status.ended")}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {exam.alreadyAttempted
                            ? exam.totalScore != null && exam.maxScore != null
                              ? `${exam.totalScore}/${exam.maxScore}`
                              : td("exams.submitted")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {exam.canStart || exam.canResume ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={startingExamId === exam.id}
                              onClick={() => void handleStartOrResumeExam(exam)}
                            >
                              {startingExamId === exam.id
                                ? td("exams.starting")
                                : exam.canResume
                                ? td("exams.resume")
                                : td("exams.start")}
                            </Button>
                          ) : exam.alreadyAttempted ? (
                            <Button type="button" size="sm" variant="outline" disabled>
                              {td("exams.noReentry")}
                            </Button>
                          ) : (
                            <Button type="button" size="sm" variant="outline" disabled>
                              {td("exams.opensLater")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="px-4 pb-4 pt-2">
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {Math.min((studentExamsPage - 1) * TABLE_PAGE_SIZE + 1, studentExams.length)} - {Math.min(studentExamsPage * TABLE_PAGE_SIZE, studentExams.length)} / Jami: {studentExams.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={studentExamsPage <= 1}
                        onClick={() => setStudentExamsPage((p) => Math.max(1, p - 1))}
                      >
                        {td("common.prev")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={studentExamsPage >= studentExamsTotalPages}
                        onClick={() => setStudentExamsPage((p) => Math.min(studentExamsTotalPages, p + 1))}
                      >
                        {td("common.next")}
                      </Button>
                    </div>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {section === "homework" && (
          <Card>
            <CardHeader>
              <CardTitle>{td("homework.title")}</CardTitle>
              <CardDescription>
                {td("homework.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHomework ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{td("common.loading")}</div>
              ) : homework.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {td("homework.empty")}
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">{td("homework.table.subject")}</TableHead>
                      <TableHead className="font-semibold">{td("homework.table.teacher")}</TableHead>
                      <TableHead className="font-semibold">{td("homework.table.task")}</TableHead>
                      <TableHead className="font-semibold">{td("homework.table.deadline")}</TableHead>
                      <TableHead className="font-semibold">{td("homework.table.status")}</TableHead>
                      <TableHead className="font-semibold">{td("homework.table.file")}</TableHead>
                      <TableHead className="font-semibold text-right">{td("homework.table.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedHomework.map((hw) => (
                      <TableRow key={hw._id}>
                        <TableCell className="font-medium">{hw.subject?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{hw.teacherName || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{hw.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(hw.deadline).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {hw.mySubmission?.gradedScore != null ? (
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-emerald-700">
                                {td("homework.graded", { score: hw.mySubmission.gradedScore })}
                              </span>
                              <p className="text-[11px] text-muted-foreground">
                                {hw.mySubmission.gradedAt ? new Date(hw.mySubmission.gradedAt).toLocaleDateString() : ""}
                              </p>
                            </div>
                          ) : hw.mySubmission?.submittedAt ? (
                            <span className="text-xs font-medium text-emerald-700">
                              {td("homework.submitted", { date: new Date(hw.mySubmission.submittedAt).toLocaleDateString(uiLocale) })}
                            </span>
                          ) : new Date(hw.deadline).getTime() < Date.now() ? (
                            <span className="text-xs font-medium text-destructive">{td("homework.overdue")}</span>
                          ) : (
                            <span className="text-xs font-medium text-amber-600">{td("homework.pending")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {hw.attachmentUrl ? (
                            <a href={hw.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {hw.attachmentOriginalName || td("homework.open")}
                            </a>
                          ) : (
                            "—"
                          )}
                          {hw.mySubmission?.attachmentUrl ? (
                            <div className="mt-1">
                              <a
                                href={hw.mySubmission.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-xs"
                              >
                                {td("homework.myFile")}: {hw.mySubmission.attachmentOriginalName || td("homework.open")}
                              </a>
                            </div>
                          ) : null}
                          {hw.mySubmission?.gradingComment ? (
                            <p className="mt-1 text-[11px] text-foreground bg-muted/50 rounded px-2 py-1">
                              {td("homework.teacherComment")}: {hw.mySubmission.gradingComment}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={hw.mySubmission?.submittedAt ? "outline" : "default"}
                            onClick={() => openHomeworkSubmission(hw)}
                          >
                            {hw.mySubmission?.submittedAt ? td("homework.resubmit") : td("homework.submit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="px-4 pb-4 pt-2">
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {Math.min((homeworkPage - 1) * TABLE_PAGE_SIZE + 1, homework.length)} - {Math.min(homeworkPage * TABLE_PAGE_SIZE, homework.length)} / Jami: {homework.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={homeworkPage <= 1}
                        onClick={() => setHomeworkPage((p) => Math.max(1, p - 1))}
                      >
                        {td("common.prev")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={homeworkPage >= homeworkTotalPages}
                        onClick={() => setHomeworkPage((p) => Math.min(homeworkTotalPages, p + 1))}
                      >
                        {td("common.next")}
                      </Button>
                    </div>
                  </div>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog
          open={examDialogOpen}
          onOpenChange={(open) => {
            if (!open && !submittingExam) {
              setExamDialogOpen(false);
              setActiveAttemptId(null);
              setActiveExamTitle("");
              setActiveExamQuestions([]);
              setActiveExamAnswers({});
              setRemainingSeconds(0);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{activeExamTitle || td("examDialog.defaultTitle")}</DialogTitle>
            </DialogHeader>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">{td("examDialog.remainingTime", { time: formatRemaining(remainingSeconds) })}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {td("examDialog.autoClose")}
              </p>
              {!isExamFullyAnswered && (
                <p className="mt-1 text-xs text-amber-700">
                  {td("examDialog.answerAll")}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {activeExamQuestions.map((q, index) => (
                <div key={q.id} className="rounded-md border p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {index + 1}. {q.questionText}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{td("examDialog.points", { value: q.points })}</p>

                  {q.type === "test" ? (
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt.key} className="flex cursor-pointer items-start gap-2 rounded border p-2">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt.key}
                            checked={(activeExamAnswers[q.id] || "") === opt.key}
                            onChange={(e) => handleExamAnswerChange(q.id, e.target.value)}
                            className="mt-0.5"
                          />
                          <span className="text-sm text-foreground">
                            {opt.key}. {opt.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={activeExamAnswers[q.id] || ""}
                      onChange={(e) => handleExamAnswerChange(q.id, e.target.value)}
                      placeholder={td("examDialog.answerPlaceholder")}
                      className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                disabled={submittingExam || remainingSeconds <= 0 || !activeAttemptId || !isExamFullyAnswered}
                onClick={() => void handleSubmitExamAttempt()}
              >
                {submittingExam ? td("common.sending") : td("examDialog.submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {selectedHomework && (
          <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{td("submissionDialog.title")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitHomework} className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{selectedHomework.subject?.name || td("fallback.subject")}</p>
                  <p className="text-xs text-muted-foreground">{selectedHomework.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {td("submissionDialog.deadline", { date: new Date(selectedHomework.deadline).toLocaleDateString(uiLocale) })}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="submission-text">{td("submissionDialog.answerLabel")}</Label>
                  <textarea
                    id="submission-text"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder={td("submissionDialog.answerPlaceholder")}
                    className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="submission-file">{td("submissionDialog.fileLabel")}</Label>
                  <Input
                    id="submission-file"
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={submittingHomework}>
                    {submittingHomework ? td("common.sending") : td("homework.submit")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {section === "profile" && (
          <Card className="border-slate-200 bg-slate-50/40">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl font-semibold">{td("profile.information")}</CardTitle>
                <input
                  ref={studentPhotoInputRef}
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
                        if (!res.ok) throw new Error(data.message || td("profile.saveFailed"));

                        setProfilePhotoUrl(data.photoUrl || null);
                        setUser((prev) => (prev ? { ...prev, photoUrl: data.photoUrl || null } : prev));

                        const auth = localStorage.getItem("auth_user");
                        if (auth) {
                          const parsed = JSON.parse(auth);
                          parsed.photoUrl = data.photoUrl || null;
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
                        resetProfileDraft();
                        setProfileEditMode(false);
                      }}
                      disabled={savingProfile || savingProfilePhoto}
                      className="rounded-full px-4"
                    >
                      {td("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveProfileDetails}
                      disabled={savingProfile || savingProfilePhoto}
                      className="rounded-full px-4"
                    >
                      {savingProfile ? td("common.sending") : td("common.save")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setProfileEditMode(true)}
                    disabled={savingProfilePhoto}
                    className="rounded-full px-4"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {td("profile.edit")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 rounded-2xl border bg-background p-5">
              <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-center">
                <div className="flex items-start justify-center lg:justify-start">
                  <div className="group relative h-[260px] w-[260px]">
                    <Avatar className="h-[260px] w-[260px] border-4 border-teal-600/90 bg-background">
                      {profilePhotoUrl ? (
                        <AvatarImage src={profilePhotoUrl} alt={td("profile.imageAlt")} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-slate-100 text-muted-foreground">
                        <UserCircle className="h-40 w-40" />
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => studentPhotoInputRef.current?.click()}
                      disabled={savingProfilePhoto || savingProfile}
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
                  <p className="mt-1 text-base text-muted-foreground">{profileEmail}</p>
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
                      onChange={(e) => handleStudentProfileFieldChange("firstName", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.lastName")}</label>
                    <input
                      value={profileEditMode ? profileLastName : profileLastName || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("lastName", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.emailAddress")}</label>
                    <input
                      value={profileEditMode ? profileEmail : profileEmail || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("email", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.phone")}</label>
                    <input
                      value={profileEditMode ? profilePhone : profilePhone || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("phone", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.bio")}</label>
                    <input
                      value={profileEditMode ? profileBio : profileBio || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("bio", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.gender")}</label>
                    <input
                      value={profileEditMode ? profileForm.gender : profileForm.gender || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("gender", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.dateOfBirth")}</label>
                    <input
                      value={profileEditMode ? profileForm.dateOfBirth : profileForm.dateOfBirth || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("dateOfBirth", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.nationalId")}</label>
                    <input
                      value={profileEditMode ? profileForm.nationalId : profileForm.nationalId || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("nationalId", e.target.value)}
                      readOnly={!profileEditMode}
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
                      value={profileEditMode ? profileForm.country : profileForm.country || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("country", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.cityState")}</label>
                    <input
                      value={profileEditMode ? profileForm.cityState : profileLocationText || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("cityState", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.postalCode")}</label>
                    <input
                      value={profileEditMode ? profileForm.postalCode : profileForm.postalCode || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("postalCode", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{td("profile.taxId")}</label>
                    <input
                      value={profileEditMode ? profileForm.taxId : profileForm.taxId || "-"}
                      onChange={(e) => handleStudentProfileFieldChange("taxId", e.target.value)}
                      readOnly={!profileEditMode}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;

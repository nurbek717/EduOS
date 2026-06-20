import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Users,
  XCircle,
  AlertTriangle,
  Loader2,
  CircleUser,
  ScanFace,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import TeacherAttendanceOverviewChart from "@/components/teacher/TeacherAttendanceOverviewChart";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const CLASS_START_HOUR = 9;
const CLASS_START_MINUTE = 0;
const LATE_THRESHOLD_MINUTES = 30;

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
};

type TodayAttendanceRow = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  status: "present" | "absent" | "late";
  markedAt: string;
};

interface TeacherAttendanceViewProps {
  token: string | null;
  td: (key: string, vars?: Record<string, string | number>) => string;
  uiLocale: string;
  toast: ReturnType<typeof import("@/hooks/use-toast").useToast>["toast"];
}

const getAutoStatus = (): "present" | "absent" | "late" => {
  const now = new Date();
  const tzTime = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Tashkent" });
  const [hours, minutes] = tzTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  const lessonStart = CLASS_START_HOUR * 60 + CLASS_START_MINUTE;
  const lateEnd = lessonStart + LATE_THRESHOLD_MINUTES;
  if (totalMinutes <= lessonStart) return "present";
  if (totalMinutes <= lateEnd) return "late";
  return "absent";
};

const TeacherAttendanceView: React.FC<TeacherAttendanceViewProps> = ({ token, td, uiLocale, toast }) => {
  // ─── Classes ───
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // ─── Students ───
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  // ─── Attendance marking ───
  const [attendanceDayDate, setAttendanceDayDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [attendanceRowStatus, setAttendanceRowStatus] = useState<Record<string, "present" | "absent" | "late">>({});
  const [todayAttendanceRows, setTodayAttendanceRows] = useState<TodayAttendanceRow[]>([]);
  const [todayAllAttendanceRows, setTodayAllAttendanceRows] = useState<TodayAttendanceRow[]>([]);
  const [attendancePercentMap, setAttendancePercentMap] = useState<Record<string, number>>({});
  const [alreadyMarkedToday, setAlreadyMarkedToday] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // ─── Stats ───
  const [attendanceStatsRange, setAttendanceStatsRange] = useState<"1d" | "1w" | "1m">("1w");
  const [attendanceStatsSeries, setAttendanceStatsSeries] = useState<{ bucket: string; presentLate: number; absent: number }[]>([]);
  const [attendanceStatsBucket, setAttendanceStatsBucket] = useState<"hour" | "day">("day");
  const [loadingAttendanceStats, setLoadingAttendanceStats] = useState(false);

  // ─── Face attendance ───
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const [faceClassId, setFaceClassId] = useState("");
  const [faceResult, setFaceResult] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceCameraOn, setFaceCameraOn] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);

  // ─── Helpers ───
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // ─── Fetch classes ───
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/classes`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      const list: ClassRow[] = Array.isArray(data) ? data : [];
      setClasses(list);
      if (list.length > 0 && !selectedClassId) {
        setSelectedClassId(list[0]._id);
      }
    } catch { /* ignore */ } finally {
      setLoadingClasses(false);
    }
  }, [selectedClassId]);

  // ─── Fetch students ───
  const fetchStudents = useCallback(async (classId?: string) => {
    setLoadingStudents(true);
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/students${query}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      setStudents(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally {
      setLoadingStudents(false);
    }
  }, []);

  // ─── Fetch today attendance (per class) ───
  const fetchTodayAttendance = useCallback(async (classId?: string) => {
    if (!tokenRef.current) return;
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/today${query}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      const rows: TodayAttendanceRow[] = Array.isArray(data) ? data : [];
      setTodayAttendanceRows(rows);
      setAlreadyMarkedToday(new Set(rows.map((r) => r.studentId)));
    } catch {
      setTodayAttendanceRows([]);
      setAlreadyMarkedToday(new Set());
    }
  }, []);

  // ─── Fetch all today attendance (no filter) ───
  const fetchAllTodayAttendance = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/today`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      setTodayAllAttendanceRows(Array.isArray(data) ? data : []);
    } catch {
      setTodayAllAttendanceRows([]);
    }
  }, []);

  // ─── Fetch attendance percent ───
  const fetchAttendancePercent = useCallback(async (classId?: string) => {
    if (!tokenRef.current) return;
    try {
      const query = classId ? `?classId=${classId}` : "";
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/percent${query}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      const map: Record<string, number> = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          map[item.studentId] = Math.round(item.percent);
        }
      }
      setAttendancePercentMap(map);
    } catch { /* ignore */ }
  }, []);

  // ─── Fetch attendance stats ───
  const fetchAttendanceStats = useCallback(async (range: "1d" | "1w" | "1m") => {
    if (!tokenRef.current) return;
    setLoadingAttendanceStats(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/stats?range=${range}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "");
      if (data?.series) setAttendanceStatsSeries(data.series);
      if (data?.bucket) setAttendanceStatsBucket(data.bucket);
    } catch { /* ignore */ } finally {
      setLoadingAttendanceStats(false);
    }
  }, []);

  // ─── Save class attendance ───
  const handleSave = useCallback(async () => {
    if (!tokenRef.current || !selectedClassId) {
      toast({ title: td("students.attendance.pickClass"), variant: "destructive" });
      return;
    }
    if (students.length === 0) {
      toast({ title: td("students.attendance.noStudents"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        status: attendanceRowStatus[s.id] ?? "present",
      }));
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          classId: selectedClassId,
          date: attendanceDayDate,
          entries,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || td("errors.saveAttendance"));
      const isToday = attendanceDayDate === new Date().toLocaleDateString("en-CA");
      if (isToday) {
        await fetchTodayAttendance(selectedClassId);
        await fetchAllTodayAttendance();
      }
      toast({ title: td("toasts.success"), description: td("students.attendance.saved") });
      void fetchAttendanceStats(attendanceStatsRange);
    } catch (err: unknown) {
      toast({
        title: td("toasts.error"),
        description: err instanceof Error ? err.message : td("errors.saveAttendance"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [selectedClassId, students, attendanceRowStatus, attendanceDayDate, fetchTodayAttendance, fetchAllTodayAttendance, fetchAttendanceStats, attendanceStatsRange, toast, td]);

  // ─── Face camera ───
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
      }
      setFaceCameraOn(true);
      setFaceResult(null);
    } catch {
      setFaceResult({ type: "error", message: td("face.cameraOpenFailed") });
    }
  }, [td]);

  const stopCamera = useCallback(() => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((t) => t.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
    setFaceCameraOn(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const handleFaceMark = useCallback(async () => {
    if (!tokenRef.current || !faceVideoRef.current) return;
    setFaceLoading(true);
    setFaceResult(null);
    try {
      const { getDescriptorFromVideo } = await import("@/lib/faceApi");
      const descriptor = await getDescriptorFromVideo(faceVideoRef.current);
      if (!descriptor) {
        setFaceResult({ type: "error", message: td("face.notDetected") });
        return;
      }
      const faceClass = faceClassId || selectedClassId || undefined;
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ descriptor, classId: faceClass }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setFaceResult({ type: "warning", message: data.message || td("face.alreadyMarked") });
        } else {
          setFaceResult({ type: "error", message: data.message || td("face.markFailed") });
        }
        return;
      }
      setFaceResult({ type: "success", message: td("face.marked", { student: data.studentName || "" }) });
      void fetchTodayAttendance(selectedClassId || faceClass);
      void fetchAllTodayAttendance();
    } catch {
      setFaceResult({ type: "error", message: td("face.markFailed") });
    } finally {
      setFaceLoading(false);
    }
  }, [selectedClassId, faceClassId, fetchTodayAttendance, fetchAllTodayAttendance, td]);

  // ─── Effects ───
  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (!selectedClassId) return;
    void fetchStudents(selectedClassId);
    void fetchTodayAttendance(selectedClassId);
    void fetchAttendancePercent(selectedClassId);
    void fetchAllTodayAttendance();
  }, [selectedClassId, fetchStudents, fetchTodayAttendance, fetchAttendancePercent, fetchAllTodayAttendance]);

  useEffect(() => {
    void fetchAttendanceStats(attendanceStatsRange);
  }, [attendanceStatsRange, fetchAttendanceStats]);

  // Auto-set attendance status from alreadyMarkedToday
  useEffect(() => {
    const next: Record<string, "present" | "absent" | "late"> = {};
    for (const s of students) {
      next[s.id] = alreadyMarkedToday.has(s.id)
        ? (todayAttendanceRows.find((r) => r.studentId === s.id)?.status ?? getAutoStatus())
        : getAutoStatus();
    }
    setAttendanceRowStatus(next);
  }, [students, alreadyMarkedToday, todayAttendanceRows]);

  // ─── Derived stats ───
  const totalToday = todayAllAttendanceRows.length;
  const presentToday = todayAllAttendanceRows.filter((r) => r.status === "present").length;
  const lateToday = todayAllAttendanceRows.filter((r) => r.status === "late").length;
  const absentToday = todayAllAttendanceRows.filter((r) => r.status === "absent").length;

  // ─── Render ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 shadow-lg shadow-emerald-200/50">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{td("students.attendance.title") || "Davomat"}</h2>
          <p className="text-xs text-muted-foreground">{td("students.attendance.hint")}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: td("overview.stats.students") || "Bugun jami", value: totalToday, color: "bg-blue-500", icon: Users },
          { label: "Kelgan", value: presentToday, color: "bg-emerald-500", icon: CheckCircle2 },
          { label: "Kech qolgan", value: lateToday, color: "bg-amber-500", icon: Clock },
          { label: "Kelmagan", value: absentToday, color: "bg-red-500", icon: XCircle },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <div className={`rounded-lg p-1.5 ${stat.color}/10`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color.replace("bg-", "text-")}`} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-emerald-50 to-emerald-50/30 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Class selector */}
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{td("students.attendance.pickClass") || "Sinf"}</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">{td("students.attendance.pickClass") || "Sinfni tanlang"}</option>
                {loadingClasses
                  ? <option disabled>Yuklanmoqda...</option>
                  : classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))
                }
              </select>
            </div>

            {/* Date picker */}
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{td("students.attendance.dateLabel")}</label>
              <input
                type="date"
                value={attendanceDayDate}
                onChange={(e) => setAttendanceDayDate(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Face toggle */}
            <Button
              variant={showFaceScanner ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowFaceScanner(!showFaceScanner);
                if (showFaceScanner) stopCamera();
              }}
              className="h-9 gap-1.5"
            >
              <ScanFace className="h-4 w-4" />
              {showFaceScanner ? "Yuzni o'chirish" : "Face ID"}
            </Button>

            {/* Save */}
            <Button
              size="sm"
              disabled={saving || loadingStudents || students.length === 0 || !selectedClassId}
              onClick={() => void handleSave()}
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {td("students.attendance.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Face scanner panel */}
      {showFaceScanner && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-[1fr,280px]">
              {/* Camera */}
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                <video
                  ref={faceVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                {!faceCameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                    <Camera className="h-10 w-10 opacity-60" />
                    <p className="text-sm font-medium">{td("face.cameraOn") || "Kamerani yoqing"}</p>
                  </div>
                )}
                {faceLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-6 py-4 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                      <span className="text-sm font-medium text-white">{td("face.processing")}</span>
                    </div>
                  </div>
                )}
                {faceResult && (
                  <div className={`absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-xs font-medium backdrop-blur-sm ${
                    faceResult.type === "success"
                      ? "bg-emerald-500/80 text-white"
                      : faceResult.type === "warning"
                        ? "bg-amber-500/80 text-white"
                        : "bg-red-500/80 text-white"
                  }`}>
                    <div className="flex items-center gap-2">
                      {faceResult.type === "success" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        : faceResult.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                      <span>{faceResult.message}</span>
                    </div>
                  </div>
                )}
                {/* Scanning overlay */}
                {faceCameraOn && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/60" />
                    <div className="absolute left-1/2 top-1/2 h-0.5 w-28 -translate-x-1/2 -translate-y-1/2 animate-pulse bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos) => (
                      <div key={pos} className={`absolute ${pos} h-3 w-3 border-emerald-400`}
                        style={{
                          borderWidth: pos.startsWith("top") ? "2px 0 0 2px" : pos.startsWith("bottom") ? "0 0 2px 2px" : "2px 2px 0 0",
                          ...(pos.includes("right") ? { right: "12px" } : { left: "12px" }),
                          ...(pos.includes("bottom") ? { bottom: "12px" } : { top: "12px" }),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{td("face.classRequired") || "Sinf"}</label>
                  <select
                    value={faceClassId || selectedClassId}
                    onChange={(e) => setFaceClassId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">{td("face.selectClass") || "Sinfni tanlang"}</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Button
                    variant={faceCameraOn ? "destructive" : "default"}
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => { faceCameraOn ? stopCamera() : void startCamera(); }}
                  >
                    <Camera className="h-4 w-4" />
                    {faceCameraOn ? (td("face.cameraOff") || "Kamerani o'chirish") : (td("face.cameraOn") || "Kamerani yoqish")}
                  </Button>
                  <Button
                    size="sm"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    disabled={!faceCameraOn || faceLoading || (!faceClassId && !selectedClassId)}
                    onClick={() => void handleFaceMark()}
                  >
                    {faceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanFace className="h-4 w-4" />
                    )}
                    {td("face.markAttendance") || "Davomatni belgilash"}
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Qo'llanma:</p>
                  <p>1. Sinfni tanlang</p>
                  <p>2. Kamerani yoqing</p>
                  <p>3. Yuzingizni ovalga to'g'rilang</p>
                  <p>4. "Davomatni belgilash" tugmasini bosing</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Student attendance marking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                {selectedClassId
                  ? `${classes.find((c) => c._id === selectedClassId)?.name || ""} - ${td("students.attendance.title")}`
                  : td("students.attendance.title")}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedClassId
                  ? `${students.length} nafar o'quvchi`
                  : td("students.attendance.pickClass")}
              </CardDescription>
            </div>
            {selectedClassId && students.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {students.filter((s) => alreadyMarkedToday.has(s.id)).length}/{students.length} belgilangan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : !selectedClassId ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">{td("students.attendance.pickClass")}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CircleUser className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">{td("students.attendance.noStudents")}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {students.map((s) => {
                const alreadyMarked = alreadyMarkedToday.has(s.id);
                const currentStatus = attendanceRowStatus[s.id] ?? getAutoStatus();
                const percent = attendancePercentMap[s.id];
                const markedRecord = todayAttendanceRows.find((r) => r.studentId === s.id);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col gap-2 rounded-xl border px-4 py-3 transition-all sm:flex-row sm:items-center sm:justify-between ${
                      alreadyMarked
                        ? "border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-white"
                        : "hover:border-muted-foreground/20 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0 border">
                        <AvatarImage src={s.photoUrl || ""} />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {s.name?.charAt(0)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                          {percent !== undefined && (
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                percent >= 80
                                  ? "bg-emerald-100 text-emerald-700"
                                  : percent >= 50
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {percent}%
                            </span>
                          )}
                          {alreadyMarked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {td("students.attendance.alreadyMarked")}
                            </span>
                          )}
                        </div>
                        {s.className && (
                          <p className="text-[10px] text-muted-foreground">{s.className}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-11 sm:pl-0">
                      {!alreadyMarked && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            currentStatus === "present" ? "bg-emerald-500" :
                            currentStatus === "late" ? "bg-amber-500" : "bg-red-500"
                          }`}
                          title={
                            currentStatus === "present" ? td("students.attendance.autoPresent") :
                            currentStatus === "late" ? td("students.attendance.autoLate") :
                            td("students.attendance.autoAbsent")
                          }
                        />
                      )}
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={alreadyMarked ? (markedRecord?.status ?? currentStatus) : currentStatus}
                        onValueChange={(v) => {
                          if (!v || alreadyMarked) return;
                          
                          let finalStatus = v as "present" | "absent" | "late";
                          const realStatus = getAutoStatus();
                          
                          if (v === "present") {
                            if (realStatus === "late") {
                              toast({ 
                                title: td("face.warning") || "Diqqat", 
                                description: "O'quvchi kechikkanligi sababli, holat avtomatik 'Kechikdi' ga o'zgartirildi.",
                              });
                              finalStatus = "late";
                            } else if (realStatus === "absent") {
                              toast({ 
                                title: td("face.error") || "Diqqat", 
                                description: "Darsga qatnashish vaqti o'tib ketganligi sababli, holat avtomatik 'Kelmadi' ga o'zgartirildi.", 
                                variant: "destructive" 
                              });
                              finalStatus = "absent";
                            }
                          }

                          setAttendanceRowStatus((prev) => ({
                            ...prev,
                            [s.id]: finalStatus,
                          }));
                        }}
                      >
                        <ToggleGroupItem
                          value="present"
                          className="text-xs px-2.5 data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-300"
                          disabled={alreadyMarked}
                        >
                          {td("students.attendance.present")}
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="absent"
                          className="text-xs px-2.5 data-[state=on]:bg-red-100 data-[state=on]:text-red-700 data-[state=on]:border-red-300"
                          disabled={alreadyMarked}
                        >
                          {td("students.attendance.absent")}
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="late"
                          className="text-xs px-2.5 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700 data-[state=on]:border-amber-300"
                          disabled={alreadyMarked}
                        >
                          {td("students.attendance.late")}
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's summary table (all classes) */}
      {todayAllAttendanceRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{td("students.attendance.todaySummary")}</CardTitle>
                <CardDescription className="text-xs">{td("students.attendance.todaySummaryDesc")}</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {totalToday} nafar
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 text-left font-semibold text-foreground text-xs w-10">№</th>
                    <th className="p-3 text-left font-semibold text-foreground text-xs">{td("table.student")}</th>
                    <th className="p-3 text-left font-semibold text-foreground text-xs">{td("table.class")}</th>
                    <th className="p-3 text-left font-semibold text-foreground text-xs">{td("students.attendance.markedTime")}</th>
                    <th className="p-3 text-left font-semibold text-foreground text-xs">{td("students.attendance.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAllAttendanceRows.map((row, idx) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 text-xs font-medium text-foreground">{row.studentName}</td>
                      <td className="p-3 text-xs text-muted-foreground">{row.className}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {row.markedAt
                          ? new Date(row.markedAt).toLocaleTimeString(uiLocale, { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.status === "present"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "late"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status === "present" ? <CheckCircle2 className="h-2.5 w-2.5" />
                            : row.status === "late" ? <Clock className="h-2.5 w-2.5" />
                            : <XCircle className="h-2.5 w-2.5" />}
                          {row.status === "present"
                            ? td("students.attendance.present")
                            : row.status === "late"
                              ? td("students.attendance.late")
                              : td("students.attendance.absent")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold">{td("overview.attendanceChart.title")}</CardTitle>
              <CardDescription className="text-xs">{td("overview.attendanceChart.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TeacherAttendanceOverviewChart
            data={attendanceStatsSeries}
            bucket={attendanceStatsBucket}
            range={attendanceStatsRange}
            onRangeChange={setAttendanceStatsRange}
            loading={loadingAttendanceStats}
            locale={uiLocale}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAttendanceView;

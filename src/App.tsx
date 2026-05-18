import AddStudent from "./pages/AddStudent";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { FullScreenSkeleton } from "@/components/ui/skeletons";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  clearAuthStorage,
  dashboardPathByRole,
  getTokenExpiresAt,
  getStoredAuth,
  isTokenExpired,
  normalizeUserRole,
  refreshAccessToken,
  type UserRole,
} from "@/lib/auth";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Programs = lazy(() => import("./pages/Programs"));
const News = lazy(() => import("./pages/News"));
const Events = lazy(() => import("./pages/Events"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const DirectorDashboard = lazy(() => import("./pages/DirectorDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => <FullScreenSkeleton />;

type RequireRoleProps = {
  allowed: UserRole[];
  children: ReactNode;
};

const RequireRole = ({ allowed, children }: RequireRoleProps) => {
  const [refreshState, setRefreshState] = useState<"idle" | "checking" | "failed">("idle");
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { token } = getStoredAuth();
    const shouldRefresh = Boolean(token) && isTokenExpired(token);

    if (!shouldRefresh) return;

    let cancelled = false;
    setRefreshState("checking");

    refreshAccessToken()
      .then(() => {
        if (cancelled) return;
        setRefreshState("idle");
        setAuthVersion((version) => version + 1);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthStorage();
        setRefreshState("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [authVersion]);

  if (typeof window === "undefined") return <>{children}</>;

  const { token, user } = getStoredAuth();
  const normalizedRole = normalizeUserRole(user?.role);
  if (token && isTokenExpired(token) && refreshState !== "failed") {
    return <FullScreenSkeleton />;
  }

  if (!token || !normalizedRole) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }

  if (isTokenExpired(token)) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(normalizedRole)) {
    return <Navigate to={dashboardPathByRole(normalizedRole)} replace />;
  }

  return <>{children}</>;
};

const AuthRefreshManager = () => {
  const [scheduleVersion, setScheduleVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: number | null = null;

    const scheduleRefresh = () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const expiresAt = getTokenExpiresAt(token);
      if (!expiresAt) return;

      const delay = Math.max(expiresAt - Date.now() - 60_000, 10_000);
      timeoutId = window.setTimeout(() => {
        void refreshAccessToken()
          .catch(() => {
            if (isTokenExpired(token)) {
              clearAuthStorage();
            }
          })
          .finally(() => setScheduleVersion((version) => version + 1));
      }, delay);
    };

    const refreshIfNeeded = () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      if (!isTokenExpired(token, 60)) return;

      void refreshAccessToken()
        .catch(() => {
          if (isTokenExpired(token)) {
            clearAuthStorage();
          }
        })
        .finally(() => setScheduleVersion((version) => version + 1));
    };

    scheduleRefresh();
    window.addEventListener("focus", refreshIfNeeded);
    document.addEventListener("visibilitychange", refreshIfNeeded);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshIfNeeded);
      document.removeEventListener("visibilitychange", refreshIfNeeded);
    };
  }, [scheduleVersion]);

  return null;
};

const App = () => (
  <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthRefreshManager />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Asosiy kirish sahifasi sifatida Login */}
            <Route path="/" element={<Login />} />
            {/* Eski landing sahifa kerak bo'lsa, alohida yo'lga ko'chirdik */}
            <Route path="/home" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/news" element={<News />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/student/dashboard"
              element={
                <RequireRole allowed={["student"]}>
                  <SubscriptionGuard>
                    <StudentDashboard />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/parent/dashboard"
              element={
                <RequireRole allowed={["parent"]}>
                  <SubscriptionGuard>
                    <ParentDashboard />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/teacher/dashboard"
              element={
                <RequireRole allowed={["teacher"]}>
                  <SubscriptionGuard>
                    <TeacherDashboard />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/director/dashboard"
              element={
                <RequireRole allowed={["director"]}>
                  <SubscriptionGuard>
                    <DirectorDashboard />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/school-admin/dashboard"
              element={
                <RequireRole allowed={["school_admin"]}>
                  <SubscriptionGuard>
                    <DirectorDashboard />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/school-admin/dashboard/add-student"
              element={
                <RequireRole allowed={["school_admin"]}>
                  <SubscriptionGuard>
                    <AddStudent />
                  </SubscriptionGuard>
                </RequireRole>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RequireRole allowed={["super_admin"]}>
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </LanguageProvider>
);

export default App;

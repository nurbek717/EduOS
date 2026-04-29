import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  clearAuthStorage,
  dashboardPathByRole,
  getStoredAuth,
  isTokenExpired,
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

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
    Yuklanmoqda...
  </div>
);

type RequireRoleProps = {
  allowed: UserRole[];
  children: ReactNode;
};

const RequireRole = ({ allowed, children }: RequireRoleProps) => {
  if (typeof window === "undefined") return <>{children}</>;

  const { token, user } = getStoredAuth();

  if (!token || !user?.role) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }

  if (isTokenExpired(token)) {
    clearAuthStorage();
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to={dashboardPathByRole(user.role)} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                  <StudentDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/parent/dashboard"
              element={
                <RequireRole allowed={["parent"]}>
                  <ParentDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/teacher/dashboard"
              element={
                <RequireRole allowed={["teacher"]}>
                  <TeacherDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/director/dashboard"
              element={
                <RequireRole allowed={["director"]}>
                  <DirectorDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/school-admin/dashboard"
              element={
                <RequireRole allowed={["school_admin"]}>
                  <DirectorDashboard />
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

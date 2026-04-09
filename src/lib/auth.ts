export type UserRole =
  | "student"
  | "parent"
  | "teacher"
  | "director"
  | "school_admin"
  | "super_admin";

export type AuthUser = {
  role?: UserRole;
  [key: string]: unknown;
};

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
};

const parseJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string, skewSeconds = 5) => {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSeconds + skewSeconds;
};

export const clearAuthStorage = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("refresh_token");
};

export const getStoredAuth = () => {
  const token = localStorage.getItem("auth_token");
  const rawUser = localStorage.getItem("auth_user");

  if (!token || !rawUser) return { token: null, user: null as AuthUser | null };

  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return { token, user: null as AuthUser | null };
  }
};

export const dashboardPathByRole = (role?: UserRole) => {
  if (role === "student") return "/student/dashboard";
  if (role === "parent") return "/parent/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "director") return "/director/dashboard";
  if (role === "school_admin") return "/school-admin/dashboard";
  if (role === "super_admin") return "/admin/dashboard";
  return "/login";
};

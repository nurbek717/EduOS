export type UserRole =
  | "student"
  | "parent"
  | "teacher"
  | "director"
  | "school_admin"
  | "super_admin";

export type MaybeLegacyUserRole =
  | UserRole
  | "admin"
  | "superadmin"
  | "school-admin"
  | "schoolAdmin";

export type AuthUser = {
  role?: MaybeLegacyUserRole;
  [key: string]: unknown;
};

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
let refreshPromise: Promise<{ token: string; user: AuthUser | null }> | null = null;

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

export const getTokenExpiresAt = (token: string) => {
  const payload = parseJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
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
    const parsedUser = JSON.parse(rawUser) as AuthUser;
    const normalizedRole = normalizeUserRole(parsedUser?.role);
    return {
      token,
      user: {
        ...parsedUser,
        role: normalizedRole,
      },
    };
  } catch {
    return { token, user: null as AuthUser | null };
  }
};

export const refreshAccessToken = async () => {
  if (typeof window === "undefined") {
    throw new Error("Refresh token is not available");
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to refresh session");
      }

      const nextToken = data.token || data.accessToken;
      if (!nextToken) {
        throw new Error("Refresh response does not include access token");
      }

      const normalizedRole = normalizeUserRole(data?.user?.role);
      const normalizedUser = data?.user
        ? {
            ...data.user,
            role: normalizedRole,
          }
        : getStoredAuth().user;

      localStorage.setItem("auth_token", nextToken);
      if (normalizedUser) {
        localStorage.setItem("auth_user", JSON.stringify(normalizedUser));
      }

      return { token: nextToken, user: normalizedUser };
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const normalizeUserRole = (role?: MaybeLegacyUserRole | string | null): UserRole | undefined => {
  if (!role) return undefined;
  if (role === "admin" || role === "superadmin") return "super_admin";
  if (role === "school-admin" || role === "schoolAdmin") return "school_admin";
  if (
    role === "student" ||
    role === "parent" ||
    role === "teacher" ||
    role === "director" ||
    role === "school_admin" ||
    role === "super_admin"
  ) {
    return role;
  }

  return undefined;
};

export const dashboardPathByRole = (role?: MaybeLegacyUserRole | string | null) => {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === "student") return "/student/dashboard";
  if (normalizedRole === "parent") return "/parent/dashboard";
  if (normalizedRole === "teacher") return "/teacher/dashboard";
  if (normalizedRole === "director") return "/director/dashboard";
  if (normalizedRole === "school_admin") return "/school-admin/dashboard";
  if (normalizedRole === "super_admin") return "/admin/dashboard";
  return "/login";
};

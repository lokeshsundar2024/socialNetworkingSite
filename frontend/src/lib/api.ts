const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type User = {
  id: string;
  email: string;
  username: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  is_email_verified: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type RegisterInput = {
  email: string;
  username: string;
  display_name: string;
  password: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Access token lives in memory only (never localStorage).
let accessToken: string | null = null;
let refreshPromise: Promise<TokenResponse | null> | null = null;

function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

async function rawRequest(
  path: string,
  init: RequestInit = {},
  withAuth = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (withAuth && accessToken)
    headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

// Single-flight: concurrent callers share one refresh request. This matters because
// the backend treats a reused refresh token as theft and revokes every session
// (React dev mode runs effects twice, which would otherwise trigger exactly that).
export function refreshSession(): Promise<TokenResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawRequest(
          "/auth/refresh",
          { method: "POST" },
          false,
        );
        if (!res.ok) {
          accessToken = null;
          return null;
        }
        const data = (await res.json()) as TokenResponse;
        accessToken = data.access_token;
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, init);
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) res = await rawRequest(path, init);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(res.status, errorMessage(body, "Request failed"));
  return body as T;
}

export async function loginRequest(
  identifier: string,
  password: string,
): Promise<User> {
  const data = await api<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  accessToken = data.access_token;
  return data.user;
}

export async function registerRequest(input: RegisterInput): Promise<User> {
  const data = await api<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  accessToken = data.access_token;
  return data.user;
}

export async function logoutRequest(): Promise<void> {
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } finally {
    accessToken = null;
  }
}

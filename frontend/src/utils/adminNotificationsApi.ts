import { getApiBaseUrl } from "./apiBaseUrl";

export type AdminNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  organizationId: number | null;
  organizationName: string;
  subjectUserId: number | null;
  subjectUserName: string;
  allocatedTokens: number;
  consumedTokens: number;
  readAt: string | null;
  createdAt: string;
};

export type AdminNotificationsPayload = {
  items: AdminNotification[];
  unreadCount: number;
};

function authHeaders(): Headers {
  const headers = new Headers();
  const token = sessionStorage.getItem("bearerToken");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = `${base}/admin${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? undefined);
  const token = sessionStorage.getItem("bearerToken");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

export function isPlatformAdminSession(): boolean {
  const role = (sessionStorage.getItem("systemRole") ?? "").trim().toLowerCase();
  return role === "system admin" || role === "system_admin" || role === "systemadmin";
}

export async function fetchAdminNotifications(): Promise<AdminNotificationsPayload> {
  if (!sessionStorage.getItem("bearerToken") || !isPlatformAdminSession()) {
    return { items: [], unreadCount: 0 };
  }
  try {
    const res = await adminFetch("/services/notifications", {
      headers: authHeaders(),
    });
    const body = (await res.json().catch(() => ({}))) as {
      data?: AdminNotificationsPayload;
    };
    if (!res.ok || !body.data) return { items: [], unreadCount: 0 };
    return {
      items: Array.isArray(body.data.items) ? body.data.items : [],
      unreadCount: Number(body.data.unreadCount) || 0,
    };
  } catch {
    return { items: [], unreadCount: 0 };
  }
}

export async function markAdminNotificationRead(id: number): Promise<boolean> {
  try {
    const res = await adminFetch(`/services/notifications/${id}/read`, {
      method: "PATCH",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllAdminNotificationsRead(): Promise<boolean> {
  try {
    const res = await adminFetch("/services/notifications/read-all", {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}

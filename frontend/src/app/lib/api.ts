const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:4000/api";
  }

  const { hostname, protocol } = window.location;
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;

  // If a custom production API URL is provided, use it
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  // Local development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return envUrl?.replace(/\/$/, "") ?? "http://localhost:4000/api";
  }

  // Deployed site standard path: relative to current domain
  return "/api";
};

const getAdminApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_ADMIN_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:5003/api/admin";
  }

  const { hostname } = window.location;
  const envUrl = import.meta.env.VITE_ADMIN_API_BASE as string | undefined;

  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return envUrl?.replace(/\/$/, "") ?? "http://localhost:5003/api/admin";
  }

  return "/api/admin";
};

const API_BASE_URL = getApiBaseUrl();
const ADMIN_API_BASE_URL = getAdminApiBaseUrl();

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  message?: string;
}

async function request<T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload.data;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(API_BASE_URL, path, { cache: "no-store" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(API_BASE_URL, path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adminApiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(ADMIN_API_BASE_URL, path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { API_BASE_URL, ADMIN_API_BASE_URL };

export const AUTH_TOKEN_KEY = "udai_auth_token";

export const apiClient = {
  async get<T = any>(path: string) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("udai-auth-expired"));
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return { data };
  },
  async post<T = any>(path: string, body: any) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("udai-auth-expired"));
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return { data };
  },
  async put<T = any>(path: string, body: any) {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("udai-auth-expired"));
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return { data };
  }
};

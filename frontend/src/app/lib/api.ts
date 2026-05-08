const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:4000/api";
const ADMIN_API_BASE_URL =
  (import.meta.env.VITE_ADMIN_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:5003/api/admin";

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
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  return request<T>(API_BASE_URL, path);
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

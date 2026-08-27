const getAdminApiBase = () => {
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_ADMIN_API_BASE ?? "http://localhost:5003/api/admin").replace(/\/$/, "");
  }

  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const envUrl = import.meta.env.VITE_ADMIN_API_BASE;
    return envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))
      ? envUrl.replace(/\/$/, "")
      : "http://localhost:5003/api/admin";
  }

  const envUrl = import.meta.env.VITE_ADMIN_API_BASE;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return "https://udaiapi.datamoshtechnologies.com/api/admin";
};

const getPublicUploadBase = () => {
  if (typeof window === "undefined") {
    return (
      import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL ??
      import.meta.env.VITE_PUBLIC_API_BASE_URL ??
      import.meta.env.VITE_BASE_URL ??
      "http://localhost:4000"
    ).replace(/\/$/, "");
  }

  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  const envUrl = import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL ?? import.meta.env.VITE_PUBLIC_API_BASE_URL ?? import.meta.env.VITE_BASE_URL;
  return envUrl?.replace(/\/$/, "") ?? "https://udaiapi.datamoshtechnologies.com";
};

const API_BASE = getAdminApiBase();
export const PUBLIC_UPLOAD_BASE = getPublicUploadBase();
export const APPOINTMENT_EVENTS_URL = `${API_BASE}/appointments/events`;

export function resolveImageUrl(url) {
  if (!url) return "";
  const val = String(url).trim();
  if (!val) return "";
  if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("data:")) {
    try {
      const parsed = new URL(val);
      if (
        (parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "0.0.0.0") &&
        parsed.pathname.startsWith("/uploads/")
      ) {
        return `${PUBLIC_UPLOAD_BASE}${parsed.pathname}`;
      }
    } catch {}
    return val;
  }
  if (val.startsWith("/uploads/")) {
    return `${PUBLIC_UPLOAD_BASE}${val}`;
  }
  if (val.startsWith("/images/")) {
    const siteUrl = import.meta.env.VITE_SITE_URL ?? "http://localhost:5173";
    return `${siteUrl.replace(/\/$/, "")}${val}`;
  }
  return val;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed with ${response.status}`);
  }

  if (data && data.success === false) {
    throw new Error(data.message ?? "Admin request failed");
  }

  return data?.data ?? null;
}

export function getAdminBootstrap() {
  return request("/bootstrap");
}

export function adminLogin(credentials) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function patchInquiry(id, updates) {
  return request(`/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function patchVolunteer(id, updates) {
  return request(`/volunteers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function approveVolunteer(volunteer) {
  return request("/approve-volunteer", {
    method: "POST",
    body: JSON.stringify({ volunteer }),
  });
}

export function patchOrder(id, updates) {
  return request(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function patchTherapist(id, updates) {
  return request(`/therapists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function createTherapist(therapist) {
  return request("/therapists", {
    method: "POST",
    body: JSON.stringify(therapist),
  });
}

export function deleteTherapist(id) {
  return request(`/therapists/${id}`, {
    method: "DELETE",
  });
}

export function addSubscriber(email) {
  return request("/subscribers", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function toggleDeactivateDate(therapistId, date) {
  return request("/therapists/deactivate-date", {
    method: "POST",
    body: JSON.stringify({ therapistId, date }),
  });
}

export function sendNotification(payload) {
  return request("/notifications/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createProduct(product) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function patchProduct(id, updates) {
  return request(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteProduct(id) {
  return request(`/products/${id}`, {
    method: "DELETE",
  });
}

export function createCareer(career) {
  return request("/careers", {
    method: "POST",
    body: JSON.stringify(career),
  });
}

export function patchCareer(id, updates) {
  return request(`/careers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteCareer(id) {
  return request(`/careers/${id}`, {
    method: "DELETE",
  });
}

export function getAppointments(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") query.set(key, value);
  });
  return request(`/appointments?${query.toString()}`);
}

export function getAppointment(id) {
  return request(`/appointments/${id}`);
}

export function getAppointmentMetrics() {
  return request("/appointments/metrics");
}

export function patchAppointmentStatus(id, bookingStatus) {
  return request(`/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ bookingStatus }),
  });
}

export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? `Upload failed with ${response.status}`);
  }
  if (data && data.success === false) {
    throw new Error(data.message ?? "Upload failed");
  }
  return data; // returns { success: true, url: "/uploads/filename", message: "..." }
}

export async function getTherapistLeaves() {
  const response = await fetch(`${PUBLIC_UPLOAD_BASE}/api/therapists/unavailability`);
  const data = await response.json().catch(() => null);
  return data?.data ?? [];
}

export async function addTherapistLeave(payload) {
  const response = await fetch(`${PUBLIC_UPLOAD_BASE}/api/therapists/unavailability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? "Failed to add leave.");
  }
  return data?.data ?? null;
}

export async function deleteTherapistLeave(id) {
  const response = await fetch(`${PUBLIC_UPLOAD_BASE}/api/therapists/unavailability/${id}`, {
    method: "DELETE",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? "Failed to delete leave.");
  }
  return data;
}

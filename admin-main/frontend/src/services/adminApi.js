const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE ?? "http://localhost:5003/api/admin").replace(/\/$/, "");
export const PUBLIC_UPLOAD_BASE = (
  import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL ??
  import.meta.env.VITE_PUBLIC_API_BASE_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");
export const APPOINTMENT_EVENTS_URL = `${API_BASE}/appointments/events`;

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

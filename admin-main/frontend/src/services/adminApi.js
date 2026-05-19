const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE ?? "http://localhost:5003/api/admin").replace(/\/$/, "");

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

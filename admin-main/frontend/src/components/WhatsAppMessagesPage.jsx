import { useEffect, useState, useCallback, useRef } from "react";

const getBackendBase = () => {
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:4000";
  }
  const envUrl =
    import.meta.env.VITE_PUBLIC_API_BASE_URL ??
    import.meta.env.VITE_BASE_URL ??
    import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL;

  if (envUrl && !envUrl.includes("onrender.com")) {
    return envUrl.replace(/\/$/, "");
  }

  return "https://udaiapi.datamoshtechnologies.com";
};
const BACKEND_BASE = getBackendBase();

function formatTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function extractField(raw, ...keys) {
  if (!raw) return "—";
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== "") return String(raw[key]);
  }
  return "—";
}

function getStatusBadge(status) {
  const s = (status || "confirmed").toLowerCase();
  let bg = "#eef2ff";
  let color = "#4338ca";
  let label = "Confirmed";

  if (s.includes("cancel")) {
    bg = "#fee2e2";
    color = "#991b1b";
    label = "Cancelled";
  } else if (s.includes("resched")) {
    bg = "#e0f2fe";
    color = "#0369a1";
    label = "Rescheduled";
  } else if (s.includes("pend")) {
    bg = "#fef3c7";
    color = "#92400e";
    label = "Pending";
  } else if (s.includes("confirm")) {
    bg = "#dcfce7";
    color = "#166534";
    label = "Confirmed";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

export default function WhatsAppMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 3-dot dropdown menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modals state
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [cancelItem, setCancelItem] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleTherapist, setRescheduleTherapist] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const menuRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMessages = useCallback(async () => {
    const urls = [
      `${BACKEND_BASE}/webhook/messages`,
      `${BACKEND_BASE}/api/webhook/messages`,
      `${BACKEND_BASE}/api/admin/webhook/messages`,
      "/api/admin/webhook/messages",
      "/api/webhook/messages",
      "/webhook/messages",
    ];

    let lastErr = null;
    let fetched = false;

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json && (json.success !== false || Array.isArray(json.data))) {
            setMessages(json.data || []);
            setError(null);
            setLastRefresh(new Date());
            fetched = true;
            break;
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (!fetched && lastErr) {
      setError(lastErr.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleOpenReschedule = (msg) => {
    const raw = msg.rawData || {};
    const currentDate = msg.appointmentDate || raw.appointmentDate || raw.appointment_date || "";
    const currentTime = msg.appointmentTime || raw.appointmentTime || raw.appointment_time || "";
    const currentTherapist = msg.assignedTherapist || raw.assignedTherapist || "";

    setRescheduleItem(msg);
    setRescheduleDate(currentDate);
    setRescheduleTime(currentTime);
    setRescheduleTherapist(currentTherapist);
    setOpenMenuId(null);
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleItem) return;

    try {
      setIsUpdating(true);
      const targetId = rescheduleItem._id || rescheduleItem.id;
      const patchUrls = [
        `${BACKEND_BASE}/webhook/messages/${targetId}`,
        `${BACKEND_BASE}/api/webhook/messages/${targetId}`,
        `${BACKEND_BASE}/api/admin/webhook/messages/${targetId}`,
      ];

      let success = false;
      for (const url of patchUrls) {
        try {
          const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "rescheduled",
              appointmentDate: rescheduleDate,
              appointmentTime: rescheduleTime,
              assignedTherapist: rescheduleTherapist,
            }),
          });
          if (res.ok) {
            success = true;
            break;
          }
        } catch {}
      }

      if (!success) throw new Error("Failed to reach backend endpoint");

      // Update local state optimistically
      setMessages((prev) =>
        prev.map((m) =>
          (m._id === targetId || m.id === targetId)
            ? {
                ...m,
                status: "rescheduled",
                appointmentDate: rescheduleDate,
                appointmentTime: rescheduleTime,
                assignedTherapist: rescheduleTherapist,
              }
            : m
        )
      );

      showToast("Appointment rescheduled successfully!");
      setRescheduleItem(null);
    } catch (err) {
      alert("Failed to reschedule: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelItem) return;

    try {
      setIsUpdating(true);
      const targetId = cancelItem._id || cancelItem.id;
      const patchUrls = [
        `${BACKEND_BASE}/webhook/messages/${targetId}`,
        `${BACKEND_BASE}/api/webhook/messages/${targetId}`,
        `${BACKEND_BASE}/api/admin/webhook/messages/${targetId}`,
      ];

      let success = false;
      for (const url of patchUrls) {
        try {
          const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
          });
          if (res.ok) {
            success = true;
            break;
          }
        } catch {}
      }

      if (!success) throw new Error("Failed to reach backend endpoint");

      // Update local state optimistically
      setMessages((prev) =>
        prev.map((m) =>
          (m._id === targetId || m.id === targetId) ? { ...m, status: "cancelled" } : m
        )
      );

      showToast("Appointment cancelled successfully.");
      setCancelItem(null);
    } catch (err) {
      alert("Failed to cancel: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ padding: 0, position: "relative" }}>
      {/* ── Toast Notification ────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: "#1e293b",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
            📩 WhatsApp Messages
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            Live webhook data from MSG91 — auto-refreshes every 5 seconds
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: "#aaa" }}>
              Last update: {lastRefresh.toLocaleTimeString("en-IN")}
            </span>
          )}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: error ? "#f8d7da" : "#d4edda",
              color: error ? "#721c24" : "#155724",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: error ? "#dc3545" : "#28a745",
                display: "inline-block",
              }}
            />
            {error ? "Disconnected" : "Live"}
          </span>
          <button
            onClick={fetchMessages}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f2f4f7")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Records", value: messages.length, icon: "📋", bg: "#eef2ff", accent: "#4f46e5" },
          {
            label: "With Appointment",
            value: messages.filter((m) => {
              const raw = m.rawData || {};
              return m.appointmentDate || raw.appointmentDate || raw.appointment_date || raw.date || raw.schedule;
            }).length,
            icon: "📅",
            bg: "#ecfdf5",
            accent: "#059669",
          },
          {
            label: "First Session",
            value: messages.filter((m) => {
              const raw = m.rawData || {};
              const val = String(m.firstSession ?? raw.firstSession ?? raw.first_session ?? raw.isFirstSession ?? "").toLowerCase();
              return val === "true" || val === "yes";
            }).length,
            icon: "🌟",
            bg: "#eff6ff",
            accent: "#2563eb",
          },
          {
            label: "Average Age",
            value: (() => {
              const ages = messages
                .map((m) => Number(m.age ?? m.rawData?.age ?? m.rawData?.child_age ?? m.rawData?.patientAge))
                .filter((a) => a > 0);
              return ages.length > 0 ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : "—";
            })(),
            icon: "👶",
            bg: "#fef2f2",
            accent: "#dc2626",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.bg,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.accent }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading messages...</div>
      ) : error ? (
        <div
          style={{
            textAlign: "center",
            padding: 30,
            color: "#721c24",
            background: "#f8d7da",
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          ⚠️ Could not fetch messages: {error}
        </div>
      ) : messages.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#888",
            background: "#f9fafb",
            borderRadius: 10,
            border: "1px dashed #d0d5dd",
          }}
        >
          No webhook messages received yet. Send a WhatsApp message to see data here.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Phone Number</th>
                <th style={thStyle}>Child Name</th>
                <th style={thStyle}>Parent Name</th>
                <th style={thStyle}>Age</th>
                <th style={thStyle}>First Session</th>
                <th style={thStyle}>Appointment</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: "center", width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => {
                const raw = msg.rawData || {};
                const field = (...keys) => {
                  for (const k of keys) {
                    if (msg[k] !== undefined && msg[k] !== null && msg[k] !== "") return String(msg[k]);
                  }
                  return extractField(raw, ...keys);
                };

                const childName = field("childName", "child_name", "name", "patientName");
                const phone = field("phone", "customerNumber", "phoneNumber", "phone_number", "from", "sender");
                const statusVal = msg.status || raw.status || "confirmed";
                const isMenuOpen = openMenuId === msg._id;

                return (
                  <tr
                    key={msg._id || idx}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc")}
                  >
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace", letterSpacing: 0.5 }}>
                      {phone}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{childName}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {field("parentName", "parent_name", "parent", "guardianName")}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {field("age", "child_age", "patientAge")}
                    </td>
                    <td style={tdStyle}>
                      {(() => {
                        const val = field("firstSession", "first_session", "isFirstSession");
                        if (val === "true" || val === "yes")
                          return (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "#d4edda",
                                color: "#155724",
                              }}
                            >
                              Yes
                            </span>
                          );
                        if (val === "false" || val === "no")
                          return (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "#fff3cd",
                                color: "#856404",
                              }}
                            >
                              No
                            </span>
                          );
                        return <span style={{ color: "#aaa" }}>{val}</span>;
                      })()}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: 13, color: "#555" }}>
                      {field("appointmentDate", "appointment_date", "date", "schedule")}{" "}
                      <span style={{ color: "#888" }}>
                        {field("appointmentTime", "appointment_time", "time", "slot") !== "—"
                          ? field("appointmentTime", "appointment_time", "time", "slot")
                          : ""}
                      </span>
                    </td>
                    <td style={tdStyle}>{getStatusBadge(statusVal)}</td>
                    <td style={{ ...tdStyle, textAlign: "center", position: "relative" }}>
                      {/* ── 3-Dot Menu Button ──────────────── */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(isMenuOpen ? null : msg._id);
                        }}
                        style={{
                          background: isMenuOpen ? "#e2e8f0" : "transparent",
                          border: "none",
                          borderRadius: "50%",
                          width: 32,
                          height: 32,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          color: "#475569",
                          fontWeight: 700,
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                        onMouseLeave={(e) => {
                          if (!isMenuOpen) e.currentTarget.style.background = "transparent";
                        }}
                        title="Actions"
                      >
                        ⋮
                      </button>

                      {/* ── Dropdown Menu ────────────────── */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: 40,
                            zIndex: 1000,
                            background: "#ffffff",
                            borderRadius: 10,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                            border: "1px solid #e2e8f0",
                            width: 170,
                            padding: "6px 0",
                            textAlign: "left",
                            animation: "fadeIn 0.15s ease-out",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(msg)}
                            style={menuItemStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontSize: 14 }}>📅</span> Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelItem(msg);
                              setOpenMenuId(null);
                            }}
                            style={{ ...menuItemStyle, color: "#dc2626" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontSize: 14 }}>❌</span> Cancel
                          </button>
                          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsItem(msg);
                              setOpenMenuId(null);
                            }}
                            style={menuItemStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span style={{ fontSize: 14 }}>ℹ️</span> View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reschedule Modal ─────────────────────────────────── */}
      {rescheduleItem && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                📅 Reschedule Appointment
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                style={closeBtnStyle}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <div>
                <strong>Child:</strong> {rescheduleItem.childName || rescheduleItem.rawData?.childName || "—"}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Phone:</strong> {rescheduleItem.phone || rescheduleItem.rawData?.customerNumber || "—"}
              </div>
            </div>

            <form onSubmit={handleSaveReschedule}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>New Appointment Date</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-08-30 or Fri, 28 Aug"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>New Appointment Time</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11:00 AM"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Assigned Therapist (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sakshi"
                  value={rescheduleTherapist}
                  onChange={(e) => setRescheduleTherapist(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  style={cancelBtnStyle}
                  disabled={isUpdating}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={primaryBtnStyle}
                >
                  {isUpdating ? "Saving..." : "Save Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cancel Confirmation Modal ──────────────────────── */}
      {cancelItem && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalBoxStyle, maxWidth: 420 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#dc2626" }}>
              Cancel Appointment?
            </h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to cancel the appointment for{" "}
              <strong>
                {cancelItem.childName || cancelItem.rawData?.childName || "this child"}
              </strong>{" "}
              ({cancelItem.phone || cancelItem.rawData?.customerNumber || "N/A"})?
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setCancelItem(null)}
                style={cancelBtnStyle}
                disabled={isUpdating}
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isUpdating}
                style={{ ...primaryBtnStyle, background: "#dc2626" }}
              >
                {isUpdating ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details Modal ──────────────────────────────────── */}
      {detailsItem && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalBoxStyle, maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                ℹ️ Child & Booking Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                style={closeBtnStyle}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, fontSize: 13, color: "#334155" }}>
              <div><strong>Child Name:</strong> {detailsItem.childName || detailsItem.rawData?.childName || "—"}</div>
              <div><strong>Parent Name:</strong> {detailsItem.parentName || detailsItem.rawData?.parentName || "—"}</div>
              <div><strong>Phone Number:</strong> {detailsItem.phone || detailsItem.rawData?.customerNumber || "—"}</div>
              <div><strong>Age:</strong> {detailsItem.age || detailsItem.rawData?.age || "—"}</div>
              <div><strong>First Session:</strong> {detailsItem.firstSession || detailsItem.rawData?.firstSession || "—"}</div>
              <div><strong>Appointment:</strong> {detailsItem.appointmentDate || detailsItem.rawData?.appointmentDate || "—"} {detailsItem.appointmentTime || detailsItem.rawData?.appointmentTime || ""}</div>
              <div><strong>Assigned Therapist:</strong> {detailsItem.assignedTherapist || detailsItem.rawData?.assignedTherapist || "—"}</div>
              <div><strong>Major Concern / Department:</strong> {detailsItem.concern || detailsItem.department || detailsItem.rawData?.concern || detailsItem.rawData?.department || "—"}</div>
              <div><strong>Status:</strong> {detailsItem.status || "confirmed"}</div>
              <div><strong>Received At:</strong> {formatTime(detailsItem.receivedAt)}</div>
            </div>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                style={primaryBtnStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "11px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#667085",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "11px 14px",
  color: "#333",
  verticalAlign: "middle",
};

const menuItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  fontSize: 13,
  fontWeight: 500,
  color: "#334155",
  cursor: "pointer",
  textAlign: "left",
  transition: "background 0.15s",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.5)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalBoxStyle = {
  background: "#ffffff",
  borderRadius: 16,
  width: "100%",
  maxWidth: 480,
  padding: 24,
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  animation: "fadeIn 0.15s ease-out",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const cancelBtnStyle = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const closeBtnStyle = {
  background: "transparent",
  border: "none",
  fontSize: 18,
  color: "#94a3b8",
  cursor: "pointer",
  padding: 4,
};


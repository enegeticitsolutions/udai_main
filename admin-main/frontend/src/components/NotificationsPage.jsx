import React, { useState, useEffect, useMemo } from "react";
import Badge from "./Badge";
import Button from "./Button";
import { fetchNotifications, sendNotification, deleteNotification } from "../services/adminApi";

export default function NotificationsPage({ inquiries = [] }) {
  const [activeTab, setActiveTab] = useState("appointments"); // "appointments" | "history"
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterLocation, setFilterLocation] = useState("All Locations");
  const [searchQuery, setSearchQuery] = useState("");
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [customModalItem, setCustomModalItem] = useState(null);
  const [customMsgText, setCustomMsgText] = useState("");
  const [customMsgType, setCustomMsgType] = useState("Appointment Reminder");
  const [sendingStatus, setSendingStatus] = useState({});
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const res = await fetchNotifications();
      if (res && res.data) {
        setHistoryLogs(res.data);
      }
    } catch (err) {
      console.warn("Could not load notification history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      if (filterDate && item.appointmentDate && item.appointmentDate !== filterDate) return false;
      if (filterLocation !== "All Locations" && item.location && !item.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchChild = item.childName?.toLowerCase().includes(q);
        const matchParent = (item.parent || item.parentName)?.toLowerCase().includes(q);
        const matchPhone = (item.phone || item.parentPhone)?.includes(q);
        if (!matchChild && !matchParent && !matchPhone) return false;
      }
      return true;
    });
  }, [inquiries, filterDate, filterLocation, searchQuery]);

  function buildWhatsAppUrl(item, messageType) {
    const rawPhone = item.phone || item.parentPhone || "";
    const cleanPhone = rawPhone.replace(/[^\d]/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const child = item.childName || "Child";
    const date = item.appointmentDate || filterDate || "scheduled date";
    const time = item.appointmentTime || "scheduled time";

    let text = "";
    if (messageType === "Appointment Confirmed") {
      text = `Hello! This is UDAI Child Development Centre. We are pleased to confirm your appointment for ${child} on ${date} at ${time}. Therapist: ${item.assignedTherapist || "Assigned Specialist"}. Please arrive 10 mins prior.`;
    } else if (messageType === "Reminder") {
      text = `Reminder from UDAI Clinic: You have a scheduled therapy session for ${child} on ${date} at ${time}. We look forward to seeing you.`;
    } else if (messageType === "Reschedule") {
      text = `Dear Parent, this is UDAI Clinic regarding ${child}'s appointment on ${date}. Please contact us to reschedule your session at your convenience.`;
    } else if (messageType === "Cancel") {
      text = `UDAI Clinic Notice: The scheduled therapy appointment for ${child} on ${date} at ${time} has been cancelled. Please contact us for further assistance.`;
    } else {
      text = `Message from UDAI Clinic for ${child}'s therapy appointment on ${date} at ${time}.`;
    }

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }

  async function handleSendSystemAlert(item, type, customText = "") {
    const key = `${item.id}-${type}`;
    setSendingStatus((prev) => ({ ...prev, [key]: "sending" }));
    const phone = item.phone || item.parentPhone || "";
    const email = item.email || item.parentEmail || "";
    const recipientName = item.childName ? `${item.childName} (${item.parent || item.parentName || "Parent"})` : (item.parent || "Patient");

    const message = customText || `Appointment ${type.toLowerCase()} for ${recipientName} on ${item.appointmentDate || filterDate} at ${item.appointmentTime || ""}.`;

    try {
      const res = await sendNotification({
        inquiryId: item.id,
        type,
        recipientName,
        phone,
        email,
        customMessage: message,
        channel: email ? "Email & System" : "System Alert",
      });

      setSendingStatus((prev) => ({ ...prev, [key]: "sent" }));
      setFeedback(`Notification "${type}" sent to ${recipientName}`);
      loadHistory();
      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, [key]: null }));
        setFeedback("");
      }, 3500);
    } catch (err) {
      setSendingStatus((prev) => ({ ...prev, [key]: "error" }));
      alert("Failed to send notification: " + (err.message || err));
    }
  }

  async function handleDeleteHistory(id) {
    if (!window.confirm("Remove this notification log entry?")) return;
    try {
      await deleteNotification(id);
      setHistoryLogs((prev) => prev.filter((h) => (h.id || h._id) !== id));
    } catch (err) {
      alert("Failed to delete log: " + (err.message || err));
    }
  }

  return (
    <div className="notifications-center-module">
      {/* Module Header Tabs */}
      <div className="notifications-nav">
        <button
          type="button"
          className={`notif-tab-btn ${activeTab === "appointments" ? "active" : ""}`}
          onClick={() => setActiveTab("appointments")}
        >
          📅 Patient Appointments & Alerts
        </button>
        <button
          type="button"
          className={`notif-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("history");
            loadHistory();
          }}
        >
          📜 Sent Notification Logs ({historyLogs.length})
        </button>
      </div>

      {feedback && (
        <div style={{ padding: "12px 18px", background: "#f0fdf4", color: "#16a34a", borderRadius: "10px", margin: "16px 0", fontSize: "14px", fontWeight: 500 }}>
          ✓ {feedback}
        </div>
      )}

      {/* View 1: Appointments & Send Alerts */}
      {activeTab === "appointments" && (
        <div className="content-card" style={{ marginTop: "16px" }}>
          <div className="filters-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", paddingBottom: "20px", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
            <div className="filter-group">
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", marginBottom: "6px" }}>
                Appointment Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", color: "inherit" }}
              />
            </div>

            <div className="filter-group">
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", marginBottom: "6px" }}>
                Location
              </label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", color: "inherit" }}
              >
                <option>All Locations</option>
                <option>New Delhi Clinic</option>
                <option>Online</option>
              </select>
            </div>

            <div className="filter-group">
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--muted, #64748b)", textTransform: "uppercase", marginBottom: "6px" }}>
                Search Patient / Phone
              </label>
              <input
                type="text"
                placeholder="Name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", color: "inherit" }}
              />
            </div>
          </div>

          <div className="section-head" style={{ marginTop: "20px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>
                {filterDate ? `Appointments for ${new Date(filterDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}` : "All Therapy Appointments"}
              </h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Trigger instant WhatsApp messages or system notifications directly to parents.
              </p>
            </div>
            <Badge tone="blue">{filteredInquiries.length} Scheduled</Badge>
          </div>

          <div style={{ marginTop: "16px", overflowX: "auto" }}>
            {filteredInquiries.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "920px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", color: "var(--muted, #64748b)" }}>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Time</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Child Name</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Parent / Contact</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Therapist</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Status</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>Direct WhatsApp</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>System Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInquiries.map((item, idx) => {
                    const id = item.id || item._id || `inq-${idx}`;
                    const phone = item.phone || item.parentPhone;
                    const sendingConfirm = sendingStatus[`${id}-Appointment Confirmed`];
                    const sendingReminder = sendingStatus[`${id}-Reminder`];

                    return (
                      <tr key={id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                        <td style={{ padding: "12px 10px", fontWeight: 600, color: "#2563eb" }}>
                          {item.appointmentTime || "Time TBA"}
                        </td>
                        <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                          {item.childName || "Patient"}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div>{item.parent || item.parentName || "Parent"}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{phone || "No phone"}</div>
                        </td>
                        <td style={{ padding: "12px 10px", color: "var(--muted, #475569)" }}>
                          {item.assignedTherapist || item.therapistName || "Pending Assignment"}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <Badge tone={item.status === "confirmed" ? "green" : item.status === "cancelled" ? "rose" : "amber"}>
                            {item.status || "new"}
                          </Badge>
                        </td>

                        {/* Direct WhatsApp Trigger */}
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          {phone ? (
                            <a
                              href={buildWhatsAppUrl(item, "Appointment Confirmed")}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                background: "#25D366",
                                color: "#ffffff",
                                textDecoration: "none",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              <span>💬</span> WhatsApp
                            </a>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>No phone</span>
                          )}
                        </td>

                        {/* System Alert & Notification Options */}
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleSendSystemAlert(item, "Appointment Confirmed")}
                              disabled={sendingConfirm === "sending" || sendingConfirm === "sent"}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #93c5fd",
                                background: "#eff6ff",
                                color: "#2563eb",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              {sendingConfirm === "sending" ? "Sending..." : sendingConfirm === "sent" ? "Sent ✓" : "Confirm Alert"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendSystemAlert(item, "Reminder")}
                              disabled={sendingReminder === "sending" || sendingReminder === "sent"}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--border-color, #cbd5e1)",
                                background: "var(--bg-card, #ffffff)",
                                color: "inherit",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              {sendingReminder === "sending" ? "Sending..." : sendingReminder === "sent" ? "Sent ✓" : "Reminder"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCustomModalItem(item);
                                setCustomMsgText(`Dear ${item.parent || "Parent"}, this is a reminder regarding ${item.childName || "your child"}'s session at UDAI Clinic.`);
                              }}
                              title="Write Custom Message"
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid var(--border-color, #cbd5e1)",
                                background: "transparent",
                                color: "inherit",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              ✏️ Custom
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 6px" }}>No appointments for this selection</p>
                <p style={{ fontSize: "13px", margin: 0 }}>
                  Try picking another appointment date or clearing search filters.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Notification History / Audit Log */}
      {activeTab === "history" && (
        <div className="content-card" style={{ marginTop: "16px" }}>
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Dispatched Notifications Audit Log</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Complete log of alerts and notifications triggered to patients and parents.
              </p>
            </div>
            <Button variant="secondary" onClick={loadHistory} disabled={isLoadingHistory}>
              {isLoadingHistory ? "Refreshing..." : "🔄 Refresh Logs"}
            </Button>
          </div>

          <div style={{ marginTop: "16px", overflowX: "auto" }}>
            {historyLogs.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "820px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", color: "var(--muted, #64748b)" }}>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Timestamp</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Recipient</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Type</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Message</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Channel</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((log, idx) => {
                    const id = log.id || log._id || `log-${idx}`;
                    return (
                      <tr key={id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                        <td style={{ padding: "12px 10px", fontSize: "13px", color: "var(--muted, #64748b)", whiteSpace: "nowrap" }}>
                          {log.sentAt ? new Date(log.sentAt).toLocaleString("en-IN") : "-"}
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ fontWeight: 600 }}>{log.recipientName || "Recipient"}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>{log.email || log.phone || "-"}</div>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <Badge tone="blue">{log.type || "Notice"}</Badge>
                        </td>
                        <td style={{ padding: "12px 10px", maxWidth: "300px" }}>
                          <div style={{ fontSize: "13px", color: "var(--muted, #475569)", lineHeight: "1.4" }}>
                            {log.message || "-"}
                          </div>
                        </td>
                        <td style={{ padding: "12px 10px", fontSize: "13px" }}>
                          <Badge tone={log.channel?.includes("Email") ? "purple" : "slate"}>
                            {log.channel || "System"}
                          </Badge>
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(id)}
                            title="Remove log entry"
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 6px" }}>No notification history recorded yet</p>
                <p style={{ fontSize: "13px", margin: 0 }}>
                  Alerts sent to patients will automatically appear in this audit log.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Message Modal */}
      {customModalItem && (
        <div className="modal-backdrop" onClick={() => setCustomModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px", width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Send Custom Notification</h2>
              <button type="button" onClick={() => setCustomModalItem(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ padding: "16px 0" }}>
              <p style={{ margin: "0 0 12px", fontSize: "14px" }}>
                Sending to: <strong>{customModalItem.childName}</strong> ({customModalItem.parent || "Parent"}) • {customModalItem.phone || "No phone"}
              </p>

              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Notification Category</label>
              <select
                value={customMsgType}
                onChange={(e) => setCustomMsgType(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", marginBottom: "14px" }}
              >
                <option>Appointment Reminder</option>
                <option>Reschedule Request</option>
                <option>Clinic Announcement</option>
                <option>Important Follow-up</option>
              </select>

              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Message Text</label>
              <textarea
                rows="4"
                value={customMsgText}
                onChange={(e) => setCustomMsgText(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--border-color, #e2e8f0)" }}>
              <Button variant="secondary" onClick={() => setCustomModalItem(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await handleSendSystemAlert(customModalItem, customMsgType, customMsgText);
                  setCustomModalItem(null);
                }}
              >
                Send Alert Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .notifications-center-module .notifications-nav {
          display: flex;
          gap: 12px;
          border-bottom: 2px solid var(--border-color, #e2e8f0);
          padding-bottom: 12px;
        }
        .notifications-center-module .notif-tab-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          background: var(--bg-card, #ffffff);
          color: var(--muted, #64748b);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .notifications-center-module .notif-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import Badge from "./Badge";
import Button from "./Button";
import { fetchBroadcastHistory, sendBroadcast } from "../services/adminApi";

export default function BroadcastPage({ subscribers = [], inquiries = [], currentUser }) {
  const [targetAudience, setTargetAudience] = useState("all_subscribers");
  const [category, setCategory] = useState("Announcement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setIsLoadingLogs(true);
    try {
      const res = await fetchBroadcastHistory();
      if (res && res.data) {
        setBroadcastLogs(res.data);
      }
    } catch (err) {
      console.warn("Failed to load broadcast history:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }

  // Calculate recipient count preview
  const estimatedRecipients = React.useMemo(() => {
    let emails = [];
    if (targetAudience === "all_subscribers" || targetAudience === "all_users") {
      emails.push(...subscribers.map((s) => s.email).filter(Boolean));
    }
    if (targetAudience === "all_inquiries" || targetAudience === "all_users") {
      emails.push(...inquiries.map((i) => i.email || i.parentEmail).filter(Boolean));
    }
    return new Set(emails.map((e) => String(e).trim().toLowerCase())).size;
  }, [targetAudience, subscribers, inquiries]);

  async function handleSendBroadcast(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setErrorMessage("Please enter both a subject line and a message body.");
      return;
    }

    if (!window.confirm(`Are you sure you want to send this broadcast to approximately ${estimatedRecipients} recipient(s)?`)) {
      return;
    }

    setIsSending(true);
    setErrorMessage("");
    setStatusFeedback("");

    try {
      const res = await sendBroadcast({
        targetAudience,
        category,
        subject: subject.trim(),
        message: message.trim(),
        sentBy: currentUser?.email || "Super Admin",
      });

      setStatusFeedback(res.message || "Broadcast successfully dispatched!");
      setSubject("");
      setMessage("");
      loadLogs();
      setTimeout(() => setStatusFeedback(""), 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to dispatch broadcast.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="broadcast-module">
      {/* Overview Banner */}
      <div className="stats-banner" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card" style={{ background: "var(--bg-card, #ffffff)", padding: "18px 22px", borderRadius: "12px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted, #64748b)" }}>Newsletter Audience</span>
          <h3 style={{ fontSize: "28px", margin: "6px 0 2px", color: "var(--text-color, #0f172a)" }}>{subscribers.length}</h3>
          <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>Subscribers in database</span>
        </div>

        <div className="stat-card" style={{ background: "var(--bg-card, #ffffff)", padding: "18px 22px", borderRadius: "12px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted, #64748b)" }}>Registered Inquiries</span>
          <h3 style={{ fontSize: "28px", margin: "6px 0 2px", color: "#2563eb" }}>{inquiries.length}</h3>
          <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>Patients and parents</span>
        </div>

        <div className="stat-card" style={{ background: "var(--bg-card, #ffffff)", padding: "18px 22px", borderRadius: "12px", border: "1px solid var(--border-color, #e2e8f0)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted, #64748b)" }}>Total Broadcasts</span>
          <h3 style={{ fontSize: "28px", margin: "6px 0 2px", color: "#8b5cf6" }}>{broadcastLogs.length}</h3>
          <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>Dispatched mass announcements</span>
        </div>
      </div>

      {statusFeedback && (
        <div style={{ padding: "14px 18px", background: "#f0fdf4", color: "#16a34a", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: 600 }}>
          ✓ {statusFeedback}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "14px 18px", background: "#fef2f2", color: "#dc2626", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: 500 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Main Grid: Composer & History */}
      <div className="split-grid" style={{ gap: "24px" }}>
        {/* Broadcast Composer */}
        <div className="content-card">
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>Compose Mass Broadcast</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Send an official announcement or update directly to your user base.
              </p>
            </div>
            <Badge tone="purple">Mass Messaging</Badge>
          </div>

          <form onSubmit={handleSendBroadcast} style={{ marginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px" }}
                >
                  <option value="all_subscribers">All Newsletter Subscribers ({subscribers.length})</option>
                  <option value="all_inquiries">All Inquiries / Parents ({inquiries.length})</option>
                  <option value="all_users">All Contacts Combined (~{estimatedRecipients})</option>
                </select>
                <span style={{ display: "block", fontSize: "12px", color: "#2563eb", marginTop: "4px", fontWeight: 500 }}>
                  🎯 Estimated Delivery: {estimatedRecipients} recipient(s)
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px" }}
                >
                  <option>Announcement</option>
                  <option>Newsletter</option>
                  <option>Clinic Holiday / Schedule Change</option>
                  <option>Health Camp & Workshop</option>
                  <option>Special Update</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Subject Line
              </label>
              <input
                type="text"
                placeholder="e.g. Holiday Notice: Clinic Schedule for Upcoming Week"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Message Body
              </label>
              <textarea
                rows="6"
                placeholder="Write your broadcast announcement here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box", lineHeight: "1.6" }}
              />
            </div>

            <Button type="submit" disabled={isSending} style={{ width: "100%" }}>
              {isSending ? "Dispatching Broadcast..." : `🚀 Dispatch Broadcast (${estimatedRecipients} Recipients)`}
            </Button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="content-card">
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>Broadcast History</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Record of previously dispatched mass announcements.
              </p>
            </div>
            <Button variant="secondary" onClick={loadLogs} disabled={isLoadingLogs} style={{ fontSize: "12px", padding: "5px 10px" }}>
              {isLoadingLogs ? "..." : "🔄 Refresh"}
            </Button>
          </div>

          <div style={{ marginTop: "16px", maxHeight: "480px", overflowY: "auto" }}>
            {broadcastLogs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {broadcastLogs.map((item, idx) => {
                  const id = item.id || item._id || `bc-${idx}`;
                  return (
                    <div
                      key={id}
                      style={{
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "10px",
                        padding: "16px",
                        background: "var(--bg-input, #f8fafc)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <Badge tone="purple">{item.category || "Announcement"}</Badge>
                        <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                          {item.sentAt ? new Date(item.sentAt).toLocaleString("en-IN") : "-"}
                        </span>
                      </div>

                      <h4 style={{ margin: "6px 0 4px", fontSize: "15px", fontWeight: 600 }}>{item.subject}</h4>
                      <p style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--muted, #475569)", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                        {item.message}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderTop: "1px solid var(--border-color, #e2e8f0)", paddingTop: "8px", color: "var(--muted, #64748b)" }}>
                        <span>👥 Delivered to <strong>{item.sentCount || item.recipientCount || 0}</strong> recipients</span>
                        <Badge tone="green">Dispatched ✓</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 6px" }}>No broadcasts sent yet</p>
                <p style={{ fontSize: "13px", margin: 0 }}>
                  Compose and dispatch your first broadcast on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

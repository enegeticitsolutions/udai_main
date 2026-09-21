import React, { useState, useMemo } from "react";
import Badge from "./Badge";
import Table from "./Table";
import StatCard from "./StatCard";
import Input from "./Input";
import { getScheduleDays, normalizeDepartmentDisplay } from "./WhatsAppMessagesPage";

export default function WhatsAppBookingsPage({ bookings = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);

  // Normalize MSG91 chatbotsubmissions data to display fields
  const normalized = useMemo(() => {
    return bookings.map((item) => {
      const raw = item.rawPayload ?? {};
      const events = Array.isArray(item.events) ? item.events : [];
      const latestEvent = events.length > 0 ? events[events.length - 1] : null;

      // Parse content field (MSG91 sends JSON string)
      let contentText = item.message ?? raw.content ?? "";
      try {
        const parsed = JSON.parse(contentText);
        const body = parsed?.interactive?.body?.text ?? parsed?.text ?? contentText;
        contentText = body;
      } catch {
        // content is plain text, keep as-is
      }

      const allEventNames = events.map((e) => e.eventName).filter(Boolean);
      const isCompleted = allEventNames.includes("read");
      const session_frequency =
        item.session_frequency ??
        item.userDetails?.session_frequency ??
        raw.session_frequency ??
        "Single Session";
      const totalSessions =
        item.totalSessions ??
        item.userDetails?.totalSessions ??
        raw.totalSessions ??
        (String(session_frequency).includes("3") ? 3 : String(session_frequency).includes("2") ? 2 : 1);

      const rawDept =
        item.department ??
        item.userDetails?.department ??
        raw.department ??
        raw.service ??
        item.service ??
        "Child and Parental Counselling";
      const department = normalizeDepartmentDisplay(rawDept);

      const isCounsel = department.includes("Counsel");
      const feeCharged =
        item.feeCharged ??
        item.amount ??
        item.userDetails?.feeCharged ??
        raw.feeCharged ??
        raw.amount ??
        (isCounsel
          ? (totalSessions === 3 ? 4500 : totalSessions === 2 ? 3000 : 1500)
          : (totalSessions === 3 ? 2400 : totalSessions === 2 ? 1600 : 800));

      return {
        id: item.id ?? item._id,
        phone: item.phone ?? raw.customerNumber ?? "-",
        message: contentText || raw.text || "-",
        transactionId: item.transactionId ?? raw.requestId ?? "-",
        eventName: latestEvent?.eventName ?? raw.eventName ?? "-",
        statusCode: latestEvent?.statusCode ?? raw.statusCode ?? "-",
        allEvents: allEventNames,
        isCompleted,
        department,
        session_frequency,
        totalSessions,
        feeCharged,
        messageType: raw.messageType ?? "-",
        direction: raw.direction === "1" ? "Outgoing (Bot)" : raw.direction === "2" ? "Incoming (User)" : "-",
        receivedAt: item.createdAt ?? item.ts ?? "-",
        updatedAt: item.updatedAt ?? latestEvent?.ts ?? "-",
        rawPayload: raw,
        events,
      };
    });
  }, [bookings]);

  const filtered = useMemo(() => {
    return normalized.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        item.phone.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.transactionId.toLowerCase().includes(query);

      const matchesEvent =
        eventFilter === "All" ||
        item.allEvents.includes(eventFilter);

      const matchesDept =
        departmentFilter === "All" ||
        item.department === departmentFilter;

      return matchesSearch && matchesEvent && matchesDept;
    });
  }, [normalized, searchQuery, eventFilter, departmentFilter]);

  const completedCount = normalized.filter((b) => b.isCompleted).length;
  const outgoingCount = normalized.filter((b) => b.direction === "Outgoing (Bot)").length;
  const uniquePhones = new Set(normalized.map((b) => b.phone)).size;

  function getEventTone(eventName) {
    if (eventName === "read") return "green";
    if (eventName === "delivered") return "amber";
    if (eventName === "sent") return "blue";
    if (eventName === "incoming" || eventName === "reply") return "purple";
    return "slate";
  }

  function formatDate(isoString) {
    if (!isoString || isoString === "-") return "-";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-IN") + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>WhatsApp Appointments</h2>
        <Badge tone="green">MSG91 Live Data</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard label="Total Interactions" value={normalized.length} hint="All webhook events received" />
        <StatCard label="Read by User" value={completedCount} hint="Message was read" />
        <StatCard label="Unique Users" value={uniquePhones} hint="Distinct phone numbers" />
        <StatCard label="Bot Messages Sent" value={outgoingCount} hint="Outgoing messages" />
      </div>

      <div className="table-controls" style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <Input
            label="Search phone, message, transaction ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
          />
        </div>
        <div style={{ minWidth: "180px" }}>
          <label className="field">
            <span>Filter by Event</span>
            <select
              className="select-inline"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="All">All Events</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
            </select>
          </label>
        </div>
        <div style={{ minWidth: "220px" }}>
          <label className="field">
            <span>Filter by Department</span>
            <select
              className="select-inline"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Child and Parental Counselling">Child and Parental Counselling</option>
              <option value="OT">OT</option>
              <option value="Speech Therapy">Speech Therapy</option>
              <option value="Physiotherapy">Physiotherapy</option>
              <option value="Special Educator">Special Education</option>
              <option value="Physical Therapy">Physical Therapy</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📱</div>
          <p style={{ fontWeight: 600, marginBottom: "4px" }}>No WhatsApp data yet</p>
          <p style={{ fontSize: "13px" }}>
            MSG91 webhook events will appear here once the chatbot sends messages.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                {["Phone", "Message", "Department", "Session Freq", "Sessions", "Fee", "Events", "Direction", "Type", "Received At", "Details"].map((col) => (
                  <th key={col} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: "12px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <React.Fragment key={item.id ?? idx}>
                  <tr
                    style={{ borderBottom: "1px solid var(--line)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-soft)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{item.phone}</td>
                    <td style={{ padding: "12px 16px", maxWidth: "280px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                        {item.message}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "12px", background: "var(--surface-2)", padding: "2px 8px", borderRadius: "6px", fontWeight: 500, color: "#334155" }}>
                        {item.department}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "12px", background: "var(--surface-2)", padding: "2px 8px", borderRadius: "6px" }}>
                        {item.session_frequency}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                      {item.totalSessions}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                      ₹{item.feeCharged}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {item.allEvents.length > 0 ? (
                          item.allEvents.map((ev, i) => (
                            <Badge key={i} tone={getEventTone(ev)}>{ev}</Badge>
                          ))
                        ) : (
                          <Badge tone={getEventTone(item.eventName)}>{item.eventName}</Badge>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge tone={item.direction === "Outgoing (Bot)" ? "blue" : "purple"}>
                        {item.direction}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "13px" }}>{item.messageType}</td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "13px", whiteSpace: "nowrap" }}>{formatDate(item.receivedAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
                        onClick={(e) => { e.stopPropagation(); setExpanded(expanded === idx ? null : idx); }}
                      >
                        {expanded === idx ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === idx && (
                    <tr>
                      <td colSpan={11} style={{ padding: "0 16px 16px", background: "var(--surface-2)" }}>
                        <div style={{ padding: "16px", borderRadius: "8px", marginTop: "8px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                            <div><span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Transaction ID</span><br /><span style={{ fontFamily: "monospace", fontSize: "12px" }}>{item.transactionId}</span></div>
                            <div><span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Department</span><br /><span>{item.department}</span></div>
                            <div><span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Status Code</span><br /><span>{item.statusCode}</span></div>
                            <div><span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Message Type</span><br /><span>{item.messageType}</span></div>
                            <div><span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Received</span><br /><span>{formatDate(item.receivedAt)}</span></div>
                          </div>
                          {(() => {
                            const sDays = getScheduleDays(item);
                            if (sDays.length <= 1) return null;
                            return (
                              <div style={{ marginBottom: "12px", padding: "10px", background: "var(--bg)", borderRadius: "6px" }}>
                                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                                  Scheduled Days &amp; Timings ({sDays.length} Days)
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {sDays.map((s, sIdx) => (
                                    <div key={sIdx} style={{ background: "var(--surface-2)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
                                      <strong>Day {s.sessionNumber}:</strong> {s.date} {s.day ? `(${s.day})` : ""} {s.time}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          <div style={{ marginBottom: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Full Message</span>
                            <pre style={{ marginTop: "4px", padding: "10px", background: "var(--bg)", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "200px", overflowY: "auto" }}>
                              {item.message}
                            </pre>
                          </div>
                          {item.events.length > 0 && (
                            <div>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Event Timeline</span>
                              <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                                {item.events.map((ev, i) => (
                                  <div key={i} style={{ background: "var(--bg)", borderRadius: "6px", padding: "6px 10px", fontSize: "12px" }}>
                                    <Badge tone={getEventTone(ev.eventName)}>{ev.eventName}</Badge>
                                    <span style={{ marginLeft: "6px", color: "var(--muted)" }}>{formatDate(ev.ts)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

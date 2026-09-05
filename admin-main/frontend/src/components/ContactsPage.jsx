import React, { useState, useMemo } from "react";
import Badge from "./Badge";
import Button from "./Button";

export default function ContactsPage({ contacts = [], onUpdateContact, onDeleteContact }) {
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState("");

  const stats = useMemo(() => {
    const total = contacts.length;
    const newCount = contacts.filter((c) => !c.status || c.status === "new").length;
    const inProgressCount = contacts.filter((c) => c.status === "in_progress").length;
    const repliedCount = contacts.filter((c) => c.status === "replied").length;
    const resolvedCount = contacts.filter((c) => c.status === "resolved").length;
    return { total, newCount, inProgressCount, repliedCount, resolvedCount };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const currentStatus = c.status || "new";
      if (filterTab !== "all" && currentStatus !== filterTab) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.message?.toLowerCase().includes(q)
      );
    });
  }, [contacts, filterTab, search]);

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    try {
      if (onUpdateContact) {
        await onUpdateContact(id, { status: newStatus });
      }
      setFeedback(`Status updated to "${newStatus.replace("_", " ")}"`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      alert("Failed to update status: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete contact message from "${name || "User"}"?`)) return;
    setDeletingId(id);
    try {
      if (onDeleteContact) {
        await onDeleteContact(id);
      }
      if (selectedContact?.id === id) {
        setSelectedContact(null);
      }
      setFeedback("Contact message deleted.");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      alert("Failed to delete message: " + (err.message || err));
    } finally {
      setDeletingId(null);
    }
  }

  const getStatusTone = (status) => {
    switch (status) {
      case "replied":
        return "blue";
      case "resolved":
        return "green";
      case "in_progress":
        return "amber";
      default:
        return "purple";
    }
  };

  return (
    <div className="contacts-crm-module">
      {/* Metrics Row */}
      <div className="crm-metrics">
        <div className="metric-box" onClick={() => setFilterTab("all")} style={{ cursor: "pointer", borderLeft: filterTab === "all" ? "4px solid #2563eb" : undefined }}>
          <span className="metric-title">Total Messages</span>
          <span className="metric-number">{stats.total}</span>
          <span className="metric-desc">All website contact inquiries</span>
        </div>
        <div className="metric-box" onClick={() => setFilterTab("new")} style={{ cursor: "pointer", borderLeft: filterTab === "new" ? "4px solid #8b5cf6" : undefined }}>
          <span className="metric-title">New / Unread</span>
          <span className="metric-number" style={{ color: "#8b5cf6" }}>{stats.newCount}</span>
          <span className="metric-desc">Awaiting first response</span>
        </div>
        <div className="metric-box" onClick={() => setFilterTab("replied")} style={{ cursor: "pointer", borderLeft: filterTab === "replied" ? "4px solid #2563eb" : undefined }}>
          <span className="metric-title">Replied</span>
          <span className="metric-number" style={{ color: "#2563eb" }}>{stats.repliedCount}</span>
          <span className="metric-desc">Response sent to user</span>
        </div>
        <div className="metric-box" onClick={() => setFilterTab("resolved")} style={{ cursor: "pointer", borderLeft: filterTab === "resolved" ? "4px solid #10b981" : undefined }}>
          <span className="metric-title">Resolved</span>
          <span className="metric-number" style={{ color: "#10b981" }}>{stats.resolvedCount}</span>
          <span className="metric-desc">Inquiries closed</span>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: "12px 18px", background: "#f0fdf4", color: "#16a34a", borderRadius: "10px", margin: "16px 0", fontSize: "14px", fontWeight: 500 }}>
          ✓ {feedback}
        </div>
      )}

      {/* Main CRM Card */}
      <div className="content-card" style={{ marginTop: "20px" }}>
        {/* Filter and Search Bar */}
        <div className="crm-toolbar">
          <div className="crm-tabs">
            {[
              { id: "all", label: "All Messages" },
              { id: "new", label: `New (${stats.newCount})` },
              { id: "in_progress", label: `In Progress (${stats.inProgressCount})` },
              { id: "replied", label: `Replied (${stats.repliedCount})` },
              { id: "resolved", label: `Resolved (${stats.resolvedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`crm-tab-btn ${filterTab === tab.id ? "active" : ""}`}
                onClick={() => setFilterTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="crm-search">
            <input
              type="text"
              placeholder="Search sender, subject, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crm-search-input"
            />
          </div>
        </div>

        {/* Contacts Table */}
        <div style={{ marginTop: "16px", overflowX: "auto" }}>
          {filteredContacts.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "860px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", color: "var(--muted, #64748b)" }}>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Sender</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Subject</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Message Preview</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Date</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "left" }}>Status</th>
                  <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, idx) => {
                  const id = contact.id || contact._id || `contact-${idx}`;
                  const currentStatus = contact.status || "new";
                  return (
                    <tr
                      key={id}
                      style={{
                        borderBottom: "1px solid var(--border-color, #f1f5f9)",
                        background: currentStatus === "new" ? "rgba(139, 92, 246, 0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 10px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-color, #0f172a)" }}>{contact.name || "Anonymous"}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
                          <a href={`mailto:${contact.email}`} style={{ color: "inherit", textDecoration: "none" }}>
                            {contact.email || "-"}
                          </a>
                        </div>
                      </td>

                      <td style={{ padding: "12px 10px", verticalAlign: "top", fontWeight: 500, maxWidth: "200px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={contact.subject}>
                          {contact.subject || "No subject"}
                        </div>
                      </td>

                      <td style={{ padding: "12px 10px", verticalAlign: "top", maxWidth: "280px" }}>
                        <div
                          style={{
                            color: "var(--muted, #475569)",
                            fontSize: "13px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: "1.4",
                          }}
                        >
                          {contact.message || "-"}
                        </div>
                      </td>

                      <td style={{ padding: "12px 10px", verticalAlign: "top", fontSize: "12px", color: "var(--muted, #64748b)", whiteSpace: "nowrap" }}>
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>

                      <td style={{ padding: "12px 10px", verticalAlign: "top" }}>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(id, e.target.value)}
                          disabled={updatingId === id}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: "1px solid var(--border-color, #cbd5e1)",
                            background: "var(--bg-card, #ffffff)",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          <option value="new">🟣 New</option>
                          <option value="in_progress">🟡 In Progress</option>
                          <option value="replied">🔵 Replied</option>
                          <option value="resolved">🟢 Resolved</option>
                        </select>
                      </td>

                      <td style={{ padding: "12px 10px", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedContact(contact)}
                            title="Read full inquiry"
                            style={{
                              padding: "5px 9px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-color, #cbd5e1)",
                              background: "transparent",
                              color: "inherit",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            👁 View
                          </button>
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject || "Your inquiry with UDAI")}`}
                              title="Direct email reply"
                              style={{
                                padding: "5px 9px",
                                borderRadius: "6px",
                                border: "1px solid #93c5fd",
                                background: "#eff6ff",
                                color: "#2563eb",
                                textDecoration: "none",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              ✉️ Reply
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(id, contact.name)}
                            disabled={deletingId === id}
                            title="Delete message"
                            style={{
                              padding: "5px 9px",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            {deletingId === id ? "..." : "🗑"}
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
              <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 6px" }}>No messages found</p>
              <p style={{ fontSize: "13px", margin: 0 }}>
                {search ? `No contact inquiry matches "${search}".` : `No inquiries currently marked as "${filterTab}".`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View Message Detail Modal */}
      {selectedContact && (
        <div className="modal-backdrop" onClick={() => setSelectedContact(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "16px" }}>
              <div>
                <Badge tone={getStatusTone(selectedContact.status || "new")}>
                  {(selectedContact.status || "new").toUpperCase()}
                </Badge>
                <h2 style={{ margin: "10px 0 4px", fontSize: "20px" }}>{selectedContact.subject || "Contact Inquiry"}</h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
                  Submitted on {selectedContact.createdAt ? new Date(selectedContact.createdAt).toLocaleString("en-IN") : "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--muted, #64748b)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px 0", borderBottom: "1px solid var(--border-color, #e2e8f0)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted, #64748b)" }}>From</span>
                  <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{selectedContact.name || "-"}</p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted, #64748b)" }}>Email</span>
                  <p style={{ margin: "4px 0 0" }}>
                    <a href={`mailto:${selectedContact.email}`} style={{ color: "#2563eb" }}>{selectedContact.email || "-"}</a>
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted, #64748b)" }}>Message Content</span>
                <div style={{ background: "var(--bg-input, #f8fafc)", padding: "16px", borderRadius: "8px", marginTop: "8px", fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                  {selectedContact.message || "No content."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Update Status:</span>
                <select
                  value={selectedContact.status || "new"}
                  onChange={async (e) => {
                    const newSt = e.target.value;
                    setSelectedContact((prev) => ({ ...prev, status: newSt }));
                    await handleStatusChange(selectedContact.id, newSt);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color, #cbd5e1)",
                    background: "var(--bg-card, #ffffff)",
                    fontSize: "13px",
                  }}
                >
                  <option value="new">🟣 New</option>
                  <option value="in_progress">🟡 In Progress</option>
                  <option value="replied">🔵 Replied</option>
                  <option value="resolved">🟢 Resolved</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {selectedContact.email && (
                  <a
                    href={`mailto:${selectedContact.email}?subject=Re: ${encodeURIComponent(selectedContact.subject || "Your inquiry with UDAI")}`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ✉️ Reply via Email
                  </a>
                )}
                <Button variant="secondary" onClick={() => setSelectedContact(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .contacts-crm-module .crm-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .contacts-crm-module .metric-box {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .contacts-crm-module .metric-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .contacts-crm-module .metric-title {
          font-size: 13px;
          color: var(--muted, #64748b);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .contacts-crm-module .metric-number {
          font-size: 28px;
          font-weight: 700;
          margin: 6px 0 2px;
          color: var(--text-color, #0f172a);
        }
        .contacts-crm-module .metric-desc {
          font-size: 12px;
          color: var(--muted, #94a3b8);
        }
        .contacts-crm-module .crm-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .contacts-crm-module .crm-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .contacts-crm-module .crm-tab-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-card, #ffffff);
          color: var(--muted, #64748b);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .contacts-crm-module .crm-tab-btn.active {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .contacts-crm-module .crm-search-input {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #cbd5e1);
          font-size: 13px;
          background: var(--bg-input, #ffffff);
          color: inherit;
          min-width: 260px;
        }
      `}</style>
    </div>
  );
}

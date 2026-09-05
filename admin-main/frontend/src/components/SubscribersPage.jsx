import React, { useState, useMemo } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";

export default function SubscribersPage({ subscribers = [], onAddSubscriber, onDeleteSubscriber }) {
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const filteredSubscribers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email?.toLowerCase().includes(q));
  }, [subscribers, search]);

  async function handleAdd(e) {
    e.preventDefault();
    const emailVal = newEmail.trim().toLowerCase();
    if (!emailVal) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await onAddSubscriber(emailVal);
      setSuccessMessage(`Subscriber "${emailVal}" added successfully!`);
      setNewEmail("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to add subscriber.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id, email) {
    if (!window.confirm(`Are you sure you want to remove "${email}" from the subscribers list?`)) {
      return;
    }
    setDeletingId(id);
    try {
      if (onDeleteSubscriber) {
        await onDeleteSubscriber(id);
      }
      setSuccessMessage(`Subscriber "${email}" removed.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete subscriber.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopySingle(email, id) {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleCopyAll() {
    if (!subscribers.length) return;
    const allEmails = subscribers.map((s) => s.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(allEmails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  return (
    <div className="subscribers-module">
      {/* Top Banner Stats */}
      <div className="stats-row">
        <div className="stat-pill">
          <span className="stat-pill-label">Total Subscribers</span>
          <span className="stat-pill-val">{subscribers.length}</span>
          <span className="stat-pill-sub">Registered audience</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Status</span>
          <span className="stat-pill-val" style={{ color: "#10b981" }}>Active</span>
          <span className="stat-pill-sub">Newsletter database</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-label">Export</span>
          <Button
            variant="secondary"
            onClick={handleCopyAll}
            disabled={!subscribers.length}
            style={{ marginTop: "6px", fontSize: "13px", padding: "6px 12px" }}
          >
            {copiedAll ? "✓ Copied All Emails" : "📋 Copy All Emails"}
          </Button>
          <span className="stat-pill-sub">{subscribers.length} email addresses</span>
        </div>
      </div>

      {/* Main Grid: Add Subscriber Form & Subscriber List */}
      <div className="split-grid" style={{ marginTop: "24px", gap: "24px" }}>
        {/* Add Subscriber Card */}
        <div className="content-card" style={{ height: "fit-content" }}>
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>Add Subscriber</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Manually register an email to receive newsletters and updates.
              </p>
            </div>
            <Badge tone="blue">Manual Entry</Badge>
          </div>

          <form onSubmit={handleAdd} style={{ marginTop: "18px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  background: "var(--bg-input, #ffffff)",
                  color: "inherit",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {errorMessage && (
              <div style={{ padding: "10px", background: "#fef2f2", color: "#dc2626", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div style={{ padding: "10px", background: "#f0fdf4", color: "#16a34a", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
                {successMessage}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} style={{ width: "100%" }}>
              {isSubmitting ? "Adding..." : "+ Save Subscriber"}
            </Button>
          </form>
        </div>

        {/* Subscribers Directory Card */}
        <div className="content-card">
          <div className="section-head" style={{ flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0 }}>Subscriber Directory</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                All users who subscribed via the public footer or admin console.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  fontSize: "13px",
                  background: "var(--bg-input, #ffffff)",
                  color: "inherit",
                  minWidth: "180px",
                }}
              />
              <Badge tone={filteredSubscribers.length ? "green" : "slate"}>
                {filteredSubscribers.length} {filteredSubscribers.length === 1 ? "email" : "emails"}
              </Badge>
            </div>
          </div>

          <div style={{ marginTop: "16px", overflowX: "auto" }}>
            {filteredSubscribers.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color, #e2e8f0)", color: "var(--muted, #64748b)" }}>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>Subscriber Email</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600 }}>Subscribed On</th>
                    <th style={{ padding: "12px 10px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((item, idx) => {
                    const id = item.id || item._id || `sub-${idx}`;
                    return (
                      <tr
                        key={id}
                        style={{
                          borderBottom: "1px solid var(--border-color, #f1f5f9)",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "12px 10px", fontWeight: 500 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>📧</span>
                            <span>{item.email}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 10px", color: "var(--muted, #64748b)", fontSize: "13px" }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              onClick={() => handleCopySingle(item.email, id)}
                              title="Copy email address"
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
                              {copiedId === id ? "✓ Copied" : "Copy"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(id, item.email)}
                              disabled={deletingId === id}
                              title="Remove subscriber"
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
                              {deletingId === id ? "Removing..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <p style={{ fontSize: "16px", fontWeight: 500, margin: "0 0 6px" }}>No subscribers found</p>
                <p style={{ fontSize: "13px", margin: 0 }}>
                  {search ? `No subscriber email matches "${search}".` : "No newsletter subscribers registered yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .subscribers-module .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .subscribers-module .stat-pill {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .subscribers-module .stat-pill-label {
          font-size: 13px;
          color: var(--muted, #64748b);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .subscribers-module .stat-pill-val {
          font-size: 26px;
          font-weight: 700;
          margin: 6px 0 2px;
          color: var(--text-color, #0f172a);
        }
        .subscribers-module .stat-pill-sub {
          font-size: 12px;
          color: var(--muted, #94a3b8);
        }
      `}</style>
    </div>
  );
}

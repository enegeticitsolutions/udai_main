import React, { useState, useMemo } from "react";
import Badge from "./Badge";

export default function CorporateInquiriesPage({
  corporateInquiries = [],
  onUpdateInquiry,
  onDeleteInquiry,
}) {
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);

  const stats = useMemo(() => {
    const total = corporateInquiries.length;
    const newCount = corporateInquiries.filter(
      (c) => !c.status || c.status === "new"
    ).length;
    const contactedCount = corporateInquiries.filter(
      (c) => c.status === "contacted"
    ).length;
    const quotedCount = corporateInquiries.filter(
      (c) => c.status === "quoted"
    ).length;
    const closedCount = corporateInquiries.filter(
      (c) => c.status === "closed"
    ).length;
    return { total, newCount, contactedCount, quotedCount, closedCount };
  }, [corporateInquiries]);

  const filteredInquiries = useMemo(() => {
    return corporateInquiries.filter((item) => {
      const currentStatus = item.status || "new";
      if (filterTab !== "all" && currentStatus !== filterTab) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.companyName?.toLowerCase().includes(q) ||
        item.name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.selectedProduct?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q)
      );
    });
  }, [corporateInquiries, filterTab, search]);

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    setActiveDropdown(null);
    try {
      if (onUpdateInquiry) {
        await onUpdateInquiry(id, { status: newStatus });
      }
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setFeedback(`Status updated to "${newStatus.toUpperCase()}"`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      alert("Failed to update status: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id, companyName) {
    if (!window.confirm(`Delete corporate inquiry from "${companyName || "Company"}"?`)) return;
    setActiveDropdown(null);
    try {
      if (onDeleteInquiry) {
        await onDeleteInquiry(id);
      }
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(null);
      }
      setFeedback("Corporate inquiry deleted.");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      alert("Failed to delete inquiry: " + (err.message || err));
    }
  }

  const getStatusBadge = (status) => {
    const s = (status || "new").toLowerCase();
    switch (s) {
      case "contacted":
        return <Badge tone="blue">Contacted</Badge>;
      case "quoted":
        return <Badge tone="amber">Quoted</Badge>;
      case "closed":
        return <Badge tone="green">Closed / Won</Badge>;
      case "cancelled":
        return <Badge tone="slate">Cancelled</Badge>;
      case "new":
      default:
        return <Badge tone="purple">New Inquiry</Badge>;
    }
  };

  const formatDate = (val) => {
    if (!val) return "Just now";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(val);
    }
  };

  return (
    <div className="corporate-inquiries-module">
      <div className="section-head" style={{ marginBottom: "20px" }}>
        <div>
          <h2>Corporate Gifting Inquiries</h2>
          <p className="section-copy" style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
            Review, follow up, and quote customized corporate bulk gift orders.
          </p>
        </div>
        <Badge tone="purple">{stats.total} Inquiries</Badge>
      </div>

      {feedback && (
        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 500 }}>
          ✓ {feedback}
        </div>
      )}

      {/* Metrics Row */}
      <div className="crm-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div
          className="metric-box"
          onClick={() => setFilterTab("all")}
          style={{
            cursor: "pointer",
            borderLeft: filterTab === "all" ? "4px solid #2563eb" : "4px solid transparent",
            background: "var(--surface)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="metric-title" style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Total Inquiries</span>
          <div className="metric-number" style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0", color: "var(--text)" }}>{stats.total}</div>
          <span className="metric-desc" style={{ fontSize: "0.76rem", color: "var(--muted)" }}>All corporate requests</span>
        </div>

        <div
          className="metric-box"
          onClick={() => setFilterTab("new")}
          style={{
            cursor: "pointer",
            borderLeft: filterTab === "new" ? "4px solid #8b5cf6" : "4px solid transparent",
            background: "var(--surface)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="metric-title" style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>New Requests</span>
          <div className="metric-number" style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0", color: "#8b5cf6" }}>{stats.newCount}</div>
          <span className="metric-desc" style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Needs follow-up</span>
        </div>

        <div
          className="metric-box"
          onClick={() => setFilterTab("contacted")}
          style={{
            cursor: "pointer",
            borderLeft: filterTab === "contacted" ? "4px solid #2563eb" : "4px solid transparent",
            background: "var(--surface)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="metric-title" style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>In Discussion</span>
          <div className="metric-number" style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0", color: "#2563eb" }}>{stats.contactedCount}</div>
          <span className="metric-desc" style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Contacted client</span>
        </div>

        <div
          className="metric-box"
          onClick={() => setFilterTab("quoted")}
          style={{
            cursor: "pointer",
            borderLeft: filterTab === "quoted" ? "4px solid #d97706" : "4px solid transparent",
            background: "var(--surface)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="metric-title" style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Quoted</span>
          <div className="metric-number" style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0", color: "#d97706" }}>{stats.quotedCount}</div>
          <span className="metric-desc" style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Quote provided</span>
        </div>

        <div
          className="metric-box"
          onClick={() => setFilterTab("closed")}
          style={{
            cursor: "pointer",
            borderLeft: filterTab === "closed" ? "4px solid #10b981" : "4px solid transparent",
            background: "var(--surface)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="metric-title" style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Closed Orders</span>
          <div className="metric-number" style={{ fontSize: "1.8rem", fontWeight: 700, margin: "6px 0", color: "#10b981" }}>{stats.closedCount}</div>
          <span className="metric-desc" style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Confirmed orders</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-row" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", marginBottom: "18px" }}>
        <div className="search-box" style={{ flex: "1 1 300px", maxWidth: "450px" }}>
          <input
            type="text"
            placeholder="Search by company, name, email, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 14px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface)", fontSize: "0.88rem" }}
          />
        </div>

        <div className="filter-tabs" style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          {[
            { id: "all", label: "All" },
            { id: "new", label: "New" },
            { id: "contacted", label: "Contacted" },
            { id: "quoted", label: "Quoted" },
            { id: "closed", label: "Closed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                border: filterTab === tab.id ? "1px solid #2563eb" : "1px solid var(--line)",
                background: filterTab === tab.id ? "#2563eb" : "var(--surface)",
                color: filterTab === tab.id ? "#fff" : "var(--text)",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inquiries Table */}
      <div className="table-responsive" style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--line)", overflow: "hidden" }}>
        {filteredInquiries.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎁</div>
            <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text)" }}>No corporate inquiries found</p>
            <p style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>
              {search ? "No inquiries matched your search filter." : "Corporate gift requests submitted from the website will appear here in real time."}
            </p>
          </div>
        ) : (
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--line)", fontSize: "0.78rem", textTransform: "uppercase", color: "var(--muted)" }}>
                <th style={{ padding: "14px 16px" }}>Company & Client</th>
                <th style={{ padding: "14px 16px" }}>Contact Details</th>
                <th style={{ padding: "14px 16px" }}>Product & Quantity</th>
                <th style={{ padding: "14px 16px" }}>Requirements</th>
                <th style={{ padding: "14px 16px" }}>Date</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((item) => {
                const id = item.id || item._id;
                return (
                  <tr
                    key={id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      fontSize: "0.88rem",
                      transition: "background 0.2s",
                    }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{item.companyName || "—"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>{item.name}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div>
                        <a href={`mailto:${item.email}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                          {item.email}
                        </a>
                      </div>
                      {item.phone && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                          <a href={`tel:${item.phone}`} style={{ color: "inherit", textDecoration: "none" }}>
                            📞 {item.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{item.selectedProduct || "Gift Package"}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
                        Qty: <strong>{item.quantity ?? 100} units</strong>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: "240px" }}>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.message || "—"}
                      </p>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {formatDate(item.createdAt || item.date)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", position: "relative" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInquiry(item)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "var(--text)",
                          }}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDropdown(activeDropdown === id ? null : id)}
                          style={{
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                          }}
                        >
                          ⋮
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {activeDropdown === id && (
                        <div
                          style={{
                            position: "absolute",
                            right: "16px",
                            top: "45px",
                            width: "180px",
                            background: "var(--surface)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                            border: "1px solid var(--line)",
                            zIndex: 100,
                            textAlign: "left",
                            padding: "6px 0",
                          }}
                        >
                          <div style={{ padding: "4px 12px", fontSize: "0.7rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
                            Update Status
                          </div>
                          {[
                            { id: "new", label: "Mark as New" },
                            { id: "contacted", label: "Mark Contacted" },
                            { id: "quoted", label: "Mark Quoted" },
                            { id: "closed", label: "Mark Closed" },
                            { id: "cancelled", label: "Mark Cancelled" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleStatusChange(id, s.id)}
                              style={{
                                width: "100%",
                                padding: "6px 12px",
                                textAlign: "left",
                                background: "none",
                                border: "none",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                color: "var(--text)",
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                          <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />
                          <button
                            type="button"
                            onClick={() => handleDelete(id, item.companyName)}
                            style={{
                              width: "100%",
                              padding: "6px 12px",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              color: "#ef4444",
                              fontWeight: 600,
                            }}
                          >
                            🗑 Delete Inquiry
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            style={{
              background: "var(--surface)",
              width: "100%",
              maxWidth: "560px",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid var(--line)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
                  Corporate Inquiry Details
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>
                  {selectedInquiry.companyName || "Corporate Client"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "rgba(0,0,0,0.02)", padding: "14px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.85rem" }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Contact Person</div>
                <div style={{ fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>{selectedInquiry.name}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Current Status</div>
                <div style={{ marginTop: "2px" }}>{getStatusBadge(selectedInquiry.status)}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Work Email</div>
                <div style={{ marginTop: "2px" }}>
                  <a href={`mailto:${selectedInquiry.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    {selectedInquiry.email}
                  </a>
                </div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Phone Number</div>
                <div style={{ marginTop: "2px" }}>
                  <a href={`tel:${selectedInquiry.phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    {selectedInquiry.phone || "—"}
                  </a>
                </div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Selected Item</div>
                <div style={{ fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>{selectedInquiry.selectedProduct || "Gift Package"}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem", fontWeight: 600 }}>Estimated Quantity</div>
                <div style={{ fontWeight: 600, color: "var(--text)", marginTop: "2px" }}>{selectedInquiry.quantity ?? 100} Units</div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Special Requirements & Custom Branding Notes:
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "12px", borderRadius: "8px", fontSize: "0.88rem", color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {selectedInquiry.message || "No specific custom notes provided."}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {selectedInquiry.phone && (
                  <a
                    href={`https://wa.me/${String(selectedInquiry.phone).replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(selectedInquiry.name)},%20thank%20you%20for%20your%20corporate%20gifting%20inquiry%20with%20UDAI.`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "#25D366",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    💬 WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${selectedInquiry.email}?subject=UDAI%20Corporate%20Gifting%20Quote%20-%20${encodeURIComponent(selectedInquiry.companyName || "")}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  ✉️ Email Client
                </a>
              </div>

              <select
                value={selectedInquiry.status || "new"}
                onChange={(e) => handleStatusChange(selectedInquiry.id || selectedInquiry._id, e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                <option value="new">Status: New</option>
                <option value="contacted">Status: Contacted</option>
                <option value="quoted">Status: Quoted</option>
                <option value="closed">Status: Closed</option>
                <option value="cancelled">Status: Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

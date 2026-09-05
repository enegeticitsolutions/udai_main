import React, { useMemo } from "react";
import Badge from "./Badge";
import Button from "./Button";

export default function ReportsPage({ inquiries = [], therapists = [], donations = [], orders = [] }) {
  // Inquiries & Booking stats
  const bookingMetrics = useMemo(() => {
    const total = inquiries.length;
    const confirmed = inquiries.filter((i) => i.status === "confirmed" || i.bookingStatus === "confirmed").length;
    const completed = inquiries.filter((i) => i.status === "completed" || i.bookingStatus === "completed").length;
    const pending = inquiries.filter((i) => !i.status || i.status === "new" || i.status === "pending").length;
    const cancelled = inquiries.filter((i) => i.status === "cancelled" || i.bookingStatus === "cancelled").length;
    const rescheduled = inquiries.filter((i) => i.status === "rescheduled" || i.bookingStatus === "rescheduled").length;

    const conversionRate = total > 0 ? Math.round(((confirmed + completed) / total) * 100) : 0;

    return { total, confirmed, completed, pending, cancelled, rescheduled, conversionRate };
  }, [inquiries]);

  // Revenue & Donations stats
  const revenueMetrics = useMemo(() => {
    const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const avgDonation = donations.length > 0 ? Math.round(totalDonations / donations.length) : 0;

    const totalOrderRevenue = orders.reduce((sum, o) => {
      const amt = Number(o.totalAmount || o.subtotal || o.amount || 0);
      return sum + amt;
    }, 0);
    const paidOrders = orders.filter((o) => o.paymentStatus === "paid").length;

    return { totalDonations, avgDonation, totalOrderRevenue, paidOrders };
  }, [donations, orders]);

  // Department Distribution
  const departmentStats = useMemo(() => {
    const map = {};
    therapists.forEach((t) => {
      const dept = t.department || "General Therapy";
      if (!map[dept]) {
        map[dept] = { total: 0, active: 0 };
      }
      map[dept].total += 1;
      if (t.active !== false) {
        map[dept].active += 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [therapists]);

  // Common Concerns Analysis
  const concernStats = useMemo(() => {
    const concernMap = {
      "Speech & Language Delay": 0,
      "Sensory Processing & OT": 0,
      "Autism Spectrum / Social": 0,
      "Attention & Focus / ADHD": 0,
      "Motor Skills Development": 0,
      "Behavioral & Emotional": 0,
      "General Consultation / Other": 0,
    };

    inquiries.forEach((item) => {
      const text = `${item.concern || ""} ${item.message || ""} ${item.notes || ""}`.toLowerCase();
      if (text.includes("speech") || text.includes("talk") || text.includes("stammer") || text.includes("voice")) {
        concernMap["Speech & Language Delay"] += 1;
      } else if (text.includes("sensory") || text.includes("ot") || text.includes("tactile")) {
        concernMap["Sensory Processing & OT"] += 1;
      } else if (text.includes("autism") || text.includes("asd") || text.includes("social")) {
        concernMap["Autism Spectrum / Social"] += 1;
      } else if (text.includes("adhd") || text.includes("attention") || text.includes("hyper")) {
        concernMap["Attention & Focus / ADHD"] += 1;
      } else if (text.includes("motor") || text.includes("walk") || text.includes("handwriting")) {
        concernMap["Motor Skills Development"] += 1;
      } else if (text.includes("behavior") || text.includes("tantrum") || text.includes("anger")) {
        concernMap["Behavioral & Emotional"] += 1;
      } else {
        concernMap["General Consultation / Other"] += 1;
      }
    });

    return Object.entries(concernMap).filter(([_, count]) => count > 0);
  }, [inquiries]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="reports-analytics-module">
      {/* Header with Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px" }}>Clinic Intelligence & Operations Reports</h2>
          <p className="note" style={{ margin: "4px 0 0" }}>
            Real-time operational analytics across appointments, revenue, and clinical departments.
          </p>
        </div>
        <Button variant="secondary" onClick={handlePrint}>
          🖨️ Print / Export Report
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="reports-kpi-grid">
        <div className="report-card">
          <div className="kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>📋</div>
          <div className="kpi-body">
            <span className="kpi-label">Total Inquiries</span>
            <div className="kpi-value">{bookingMetrics.total}</div>
            <span className="kpi-sub">{bookingMetrics.confirmed + bookingMetrics.completed} confirmed sessions</span>
          </div>
        </div>

        <div className="report-card">
          <div className="kpi-icon" style={{ background: "#f0fdf4", color: "#10b981" }}>📈</div>
          <div className="kpi-body">
            <span className="kpi-label">Booking Conversion</span>
            <div className="kpi-value" style={{ color: "#10b981" }}>{bookingMetrics.conversionRate}%</div>
            <span className="kpi-sub">Inquiry to confirmed visit</span>
          </div>
        </div>

        <div className="report-card">
          <div className="kpi-icon" style={{ background: "#fdf4ff", color: "#a855f7" }}>💝</div>
          <div className="kpi-body">
            <span className="kpi-label">Donation Inflow</span>
            <div className="kpi-value">₹{revenueMetrics.totalDonations.toLocaleString("en-IN")}</div>
            <span className="kpi-sub">{donations.length} donor contributions</span>
          </div>
        </div>

        <div className="report-card">
          <div className="kpi-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>🛍️</div>
          <div className="kpi-body">
            <span className="kpi-label">Store Purchases</span>
            <div className="kpi-value">₹{revenueMetrics.totalOrderRevenue.toLocaleString("en-IN")}</div>
            <span className="kpi-sub">{revenueMetrics.paidOrders} paid orders</span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="split-grid" style={{ marginTop: "24px", gap: "24px" }}>
        {/* Booking & Patient Status Breakdown */}
        <div className="content-card">
          <div className="section-head">
            <div>
              <h3 style={{ margin: 0, fontSize: "17px" }}>Appointment Status Funnel</h3>
              <p className="note" style={{ margin: "4px 0 0" }}>Distribution of all scheduled inquiries</p>
            </div>
            <Badge tone="blue">{bookingMetrics.total} Total</Badge>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
            {[
              { label: "Confirmed Appointments", count: bookingMetrics.confirmed, color: "#10b981" },
              { label: "Completed Sessions", count: bookingMetrics.completed, color: "#2563eb" },
              { label: "Pending / New Requests", count: bookingMetrics.pending, color: "#f59e0b" },
              { label: "Rescheduled", count: bookingMetrics.rescheduled, color: "#8b5cf6" },
              { label: "Cancelled", count: bookingMetrics.cancelled, color: "#ef4444" },
            ].map((item) => {
              const pct = bookingMetrics.total > 0 ? Math.round((item.count / bookingMetrics.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                    <span>{item.label}</span>
                    <span>{item.count} ({pct}%)</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "var(--bg-input, #e2e8f0)", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: item.color, borderRadius: "6px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinical Department Roster */}
        <div className="content-card">
          <div className="section-head">
            <div>
              <h3 style={{ margin: 0, fontSize: "17px" }}>Department Workload & Team</h3>
              <p className="note" style={{ margin: "4px 0 0" }}>Therapist allocation across specializations</p>
            </div>
            <Badge tone="slate">{therapists.length} Specialists</Badge>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
            {departmentStats.length > 0 ? (
              departmentStats.map(([dept, data]) => {
                const pct = therapists.length > 0 ? Math.round((data.total / therapists.length) * 100) : 0;
                return (
                  <div key={dept} style={{ padding: "12px 14px", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "8px", background: "var(--bg-input, #f8fafc)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{dept}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb" }}>
                        {data.total} {data.total === 1 ? "therapist" : "therapists"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted, #64748b)" }}>
                      <span>Active on roster: <strong>{data.active}</strong></span>
                      <span>{pct}% of team</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="note" style={{ padding: "20px", textAlign: "center" }}>No therapist data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Concerns Breakdown */}
      <div className="content-card" style={{ marginTop: "24px" }}>
        <div className="section-head">
          <div>
            <h3 style={{ margin: 0, fontSize: "17px" }}>Patient Presentation & Specialization Demand</h3>
            <p className="note" style={{ margin: "4px 0 0" }}>Frequently addressed developmental concerns based on appointment notes</p>
          </div>
          <Badge tone="purple">Clinical Focus</Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "20px" }}>
          {concernStats.map(([concern, count]) => (
            <div
              key={concern}
              style={{
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "10px",
                padding: "16px",
                background: "var(--bg-card, #ffffff)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ display: "block", fontSize: "14px", fontWeight: 600 }}>{concern}</span>
                <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Cases recorded</span>
              </div>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#2563eb" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .reports-analytics-module .reports-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .reports-analytics-module .report-card {
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .reports-analytics-module .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .reports-analytics-module .kpi-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .reports-analytics-module .kpi-value {
          font-size: 26px;
          font-weight: 700;
          margin: 2px 0;
          color: var(--text-color, #0f172a);
        }
        .reports-analytics-module .kpi-sub {
          font-size: 12px;
          color: var(--muted, #94a3b8);
        }
      `}</style>
    </div>
  );
}

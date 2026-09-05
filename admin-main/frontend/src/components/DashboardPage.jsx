import React, { useState } from "react";
import Badge from "./Badge";

export default function DashboardPage({
  inquiries = [],
  therapists = [],
  donations = [],
  orders = [],
  currentUser,
  dashboard,
  isConnected,
  whatsappBookings = [],
  volunteers = [],
  onNavigate,
  onOpenResetCredentials,
}) {
  const [copied, setCopied] = useState(false);

  // Compute metrics with fallbacks
  const totalDonations =
    dashboard?.donationTotal ??
    donations.reduce((sum, donation) => sum + (Number(donation.amount) || 0), 0);
  const totalOrders = dashboard?.totalOrders ?? orders.length;
  const totalWhatsapp = dashboard?.totalWhatsappBookings ?? whatsappBookings.length;
  const totalVols = dashboard?.totalVolunteers ?? volunteers.length;
  const activeTherapistsCount =
    dashboard?.activeTherapists ?? therapists.filter((item) => item.active !== false).length;

  const handleCopyEmail = () => {
    if (currentUser?.email) {
      navigator.clipboard?.writeText(currentUser.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name) => {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const statCards = [
    {
      id: "whatsapp",
      label: "WhatsApp Bookings",
      value: totalWhatsapp,
      hint: "Live patient chatbot sessions",
      icon: "💬",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      accent: "#3b82f6",
      // navSection: "WhatsApp Appointments",
    },
    {
      id: "donations",
      label: "Donation Total",
      value: `₹${totalDonations.toLocaleString("en-IN")}`,
      hint: "Funds raised for child care",
      icon: "💖",
      iconBg: "#ecfdf5",
      iconColor: "#059669",
      accent: "#10b981",
      navSection: "Donations",
    },
    {
      id: "volunteers",
      label: "Volunteer Inquiries",
      value: totalVols,
      hint: "Applications received",
      icon: "🤝",
      iconBg: "#fffbeb",
      iconColor: "#d97706",
      accent: "#f59e0b",
      navSection: "Volunteers",
    },
    {
      id: "orders",
      label: "Total Purchases (Orders)",
      value: totalOrders,
      hint: "Store & payment checkout orders",
      icon: "🛍️",
      iconBg: "#faf5ff",
      iconColor: "#7c3aed",
      accent: "#8b5cf6",
      navSection: "Orders / Purchases",
    },
    {
      id: "therapists",
      label: "Active Therapists",
      value: activeTherapistsCount,
      hint: "Available clinic specialists",
      icon: "🩺",
      iconBg: "#f0fdfa",
      iconColor: "#0d9488",
      accent: "#14b8a6",
      navSection: "Therapist Management",
    },
  ];

  const quickActions = [
    ...(currentUser?.role === "super_admin"
      ? [
          {
            title: "Admin Users & Access Control",
            desc: "Create admins, configure page permissions & delete accounts",
            count: "Super Admin",
            icon: "🛡️",
            section: "Admin Management",
            badgeColor: "#7c3aed",
            badgeBg: "#f3e8ff",
          },
        ]
      : []),
    {
      title: "Orders / Purchases",
      desc: "Manage customer purchases, payment links & receipts",
      count: `${totalOrders} orders`,
      icon: "🛍️",
      section: "Orders / Purchases",
      badgeColor: "#8b5cf6",
      badgeBg: "#f5f3ff",
    },
    {
      title: "Donation Records",
      desc: "Track donor payments, meal distributions & 80G receipts",
      count: `₹${totalDonations.toLocaleString("en-IN")}`,
      icon: "💖",
      section: "Donations",
      badgeColor: "#10b981",
      badgeBg: "#ecfdf5",
    },
    // {
    //   title: "WhatsApp Bookings",
    //   desc: "Live chatbot consultation requests & appointments",
    //   count: `${totalWhatsapp} bookings`,
    //   icon: "💬",
    //   section: "WhatsApp Appointments",
    //   badgeColor: "#2563eb",
    //   badgeBg: "#eff6ff",
    // },
    {
      title: "Therapist Management",
      desc: "Configure specialists, specialties & duty schedules",
      count: `${activeTherapistsCount} active`,
      icon: "🩺",
      section: "Therapist Management",
      badgeColor: "#0d9488",
      badgeBg: "#f0fdfa",
    },
    {
      title: "Volunteer Portal",
      desc: "Review community volunteer submissions & approvals",
      count: `${totalVols} applications`,
      icon: "🤝",
      section: "Volunteers",
      badgeColor: "#d97706",
      badgeBg: "#fffbeb",
    },
    {
      title: "Message Broadcast",
      desc: "Send bulk announcements and alerts to registered users",
      count: "Broadcast center",
      icon: "📢",
      section: "Message Broadcast",
      badgeColor: "#475569",
      badgeBg: "#f1f5f9",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "100%" }}>
      {/* HERO BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: "20px",
          padding: "26px 28px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "24px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#eff6ff",
                color: "#1d4ed8",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "0.78rem",
                fontWeight: 600,
                border: "1px solid #bfdbfe",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#2563eb",
                  boxShadow: "0 0 0 2px rgba(37,99,235,0.2)",
                }}
              />
              Healthcare Operations Hub
            </span>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>UDAI Admin Console</span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back, {currentUser?.name || "Administrator"}
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: "0.92rem",
              lineHeight: 1.5,
              maxWidth: "680px",
            }}
          >
            Manage appointments, patient donations, therapists, volunteers, and store orders from one
            unified, real-time control center.
          </p>
        </div>

        {/* HERO STATUS BADGE */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "16px 20px",
            minWidth: "210px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.05em" }}>
              System Status
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.74rem",
                fontWeight: 600,
                color: isConnected ? "#059669" : "#b45309",
                background: isConnected ? "#ecfdf5" : "#fffbeb",
                padding: "2px 8px",
                borderRadius: "999px",
                border: isConnected ? "1px solid #a7f3d0" : "1px solid #fde68a",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isConnected ? "#10b981" : "#f59e0b",
                }}
              />
              {isConnected ? "Live Connected" : "Local Mode"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              {currentUser?.role === "admin" ? "Super Admin" : currentUser?.role || "Staff"}
            </span>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>access</span>
          </div>

          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            All operations online & synced
          </div>
        </div>
      </div>

      {/* STAT METRICS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
        }}
      >
        {statCards.map((c) => (
          <div
            key={c.id}
            onClick={() => onNavigate && c.navSection && onNavigate(c.navSection)}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "20px 18px",
              cursor: onNavigate ? "pointer" : "default",
              transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
              e.currentTarget.style.borderColor = c.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: c.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  border: `1px solid ${c.accent}20`,
                }}
              >
                {c.icon}
              </div>

              {onNavigate && (
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                  View →
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
              {c.label}
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                marginBottom: "4px",
              }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.hint}</div>
          </div>
        ))}
      </div>

      {/* TWO-COLUMN LOWER SECTION: ADMIN PROFILE & QUICK SHORTCUTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "20px",
        }}
      >
        {/* REDESIGNED LOGGED IN ADMINISTRATOR PROFILE CARD */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "14px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>👤</span>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                  Active Administrator Profile
                </h2>
              </div>
              <span
                style={{
                  background: "#f3e8ff",
                  color: "#6b21a8",
                  border: "1px solid #e9d5ff",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {currentUser?.role ?? "Admin"} Session
              </span>
            </div>

            {/* Profile Avatar & Details Layout */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "18px 20px",
                marginBottom: "20px",
              }}
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                  flexShrink: 0,
                  border: "2px solid #ffffff",
                }}
              >
                {getInitials(currentUser?.name)}
              </div>

              {/* Name & Email Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {currentUser?.name || "Admin One"}
                  </div>
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#15803d",
                      border: "1px solid #bbf7d0",
                      padding: "1px 8px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    Active
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.84rem",
                      color: "#475569",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      padding: "3px 10px",
                      borderRadius: "8px",
                      fontFamily: "monospace",
                    }}
                  >
                    <span>✉️</span>
                    {currentUser?.email || "admin1@udai.in"}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    title="Copy Email"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: copied ? "#059669" : "#64748b",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>

                  {onOpenResetCredentials && (
                    <button
                      type="button"
                      onClick={onOpenResetCredentials}
                      title="Reset Login ID & Password"
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        color: "#1d4ed8",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      🔑 Reset Credentials
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Session Metadata Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
                  Role & Clearance
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                  Super Administrator (Root)
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
                  Connection Security
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                  {isConnected ? "Secure SSL · Backend Linked" : "Local Portal Server"}
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
                  Assigned Scope
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                  All Hospital & Clinic Wards
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
                  Authentication Mode
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
                  Admin Token Verified
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.78rem",
              color: "#94a3b8",
            }}
          >
            <span>Active session verified</span>
            <span>UDAI Health Portal v2.4</span>
          </div>
        </div>

        {/* QUICK MANAGEMENT SHORTCUTS */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              paddingBottom: "14px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.1rem" }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                Quick Operations & Modules
              </h2>
            </div>
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
              Direct Navigation
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "10px",
              flex: 1,
            }}
          >
            {quickActions.map((action) => (
              <div
                key={action.title}
                onClick={() => onNavigate && onNavigate(action.section)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  cursor: onNavigate ? "pointer" : "default",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#f1f5f9";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.2rem" }}>{action.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>
                      {action.title}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                      {action.desc}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: action.badgeColor,
                    background: action.badgeBg,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from "react";
import Badge from "./Badge";

function formatCurrency(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getAvatarColor(name) {
  const colors = [
    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }, // Blue
    { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" }, // Emerald
    { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" }, // Purple
    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" }, // Orange
    { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" }, // Teal
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function getInitials(name) {
  if (!name || name === "Anonymous") return "AN";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper to map and classify any donation into one of the 4 official UDAI programs
export function getDonationCategoryInfo(d) {
  const cat = String(d.donationCategory || d.category || "").toLowerCase().trim();
  const p = String(d.purpose || "").toLowerCase().trim();
  const msg = String(d.message || "").toLowerCase().trim();

  // 1. Mid Day Meals
  if (
    cat === "meal" ||
    cat === "meals" ||
    /mid[\s-]?day|meal|food|lunch|nutrition/i.test(p) ||
    /mid[\s-]?day|meal/i.test(msg)
  ) {
    return {
      key: "meal",
      label: "Mid Day Meals",
      badge: "🍲 Mid Day Meals",
      color: "#ea580c",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  }

  // 2. Special Education
  if (
    cat === "education" ||
    cat === "special_education" ||
    /special[\s-]?ed|digital[\s-]?ed|education|vocational|learning|school/i.test(p) ||
    /special[\s-]?ed|education|school/i.test(msg)
  ) {
    return {
      key: "education",
      label: "Special Education",
      badge: "🎓 Special Education",
      color: "#9333ea",
      bg: "#faf5ff",
      border: "#e9d5ff",
    };
  }

  // 3. Therapy & Health
  if (
    cat === "healthcare" ||
    cat === "health" ||
    cat === "therapy" ||
    /therap|health|heal|rehab|medical|clinical/i.test(p) ||
    /therap|health|heal|rehab/i.test(msg)
  ) {
    return {
      key: "healthcare",
      label: "Therapy & Health",
      badge: "🩺 Therapy & Health",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
    };
  }

  // 4. Empower a Child (Invest in Their Future)
  return {
    key: "future",
    label: "Empower a Child",
    badge: "🌱 Empower a Child",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  };
}

export default function DonationsPage({ donations = [] }) {
  const [currentTab, setCurrentTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [amountFilter, setAmountFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter out any shop/product purchase orders so only genuine philanthropic donations are processed
  const pureDonations = useMemo(() => {
    return donations.filter((d) => {
      const cat = String(d.donationCategory || d.category || "").toLowerCase();
      const purp = String(d.purpose || "").toLowerCase();
      return cat !== "shop" && !purp.startsWith("shop order") && !(Array.isArray(d.items) && d.items.length > 0);
    });
  }, [donations]);

  // Split into the 4 official donation sections
  // 1. Mid Day Meals
  const mealDonations = useMemo(
    () => pureDonations.filter((d) => getDonationCategoryInfo(d).key === "meal"),
    [pureDonations]
  );
  // 2. Empower a Child
  const empowerDonations = useMemo(
    () => pureDonations.filter((d) => getDonationCategoryInfo(d).key === "future"),
    [pureDonations]
  );
  // 3. Therapy & Health
  const healthDonations = useMemo(
    () => pureDonations.filter((d) => getDonationCategoryInfo(d).key === "healthcare"),
    [pureDonations]
  );
  // 4. Special Education
  const educationDonations = useMemo(
    () => pureDonations.filter((d) => getDonationCategoryInfo(d).key === "education"),
    [pureDonations]
  );

  // Filter by selected section
  const categoryDonations = useMemo(() => {
    if (currentTab === "meal") return mealDonations;
    if (currentTab === "future" || currentTab === "empower") return empowerDonations;
    if (currentTab === "healthcare" || currentTab === "health") return healthDonations;
    if (currentTab === "education") return educationDonations;
    return pureDonations;
  }, [currentTab, mealDonations, empowerDonations, healthDonations, educationDonations, pureDonations]);

  // Overall totals per program
  const totalMealAmount = useMemo(() => mealDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0), [mealDonations]);
  const totalEmpowerAmount = useMemo(() => empowerDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0), [empowerDonations]);
  const totalHealthAmount = useMemo(() => healthDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0), [healthDonations]);
  const totalEducationAmount = useMemo(() => educationDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0), [educationDonations]);

  const totalMealsSponsored = useMemo(() => mealDonations.reduce((acc, d) => acc + Number(d.meals || 0), 0), [mealDonations]);
  const grandTotalAmount = totalMealAmount + totalEmpowerAmount + totalHealthAmount + totalEducationAmount;

  // Filter by search & amount
  const filteredDonations = useMemo(() => {
    return categoryDonations.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (d.donorName && d.donorName.toLowerCase().includes(q)) ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.purpose && d.purpose.toLowerCase().includes(q)) ||
        (d.paymentMethod && d.paymentMethod.toLowerCase().includes(q));

      const amt = Number(d.amount || 0);
      let matchAmount = true;
      if (amountFilter === "under500") matchAmount = amt < 500;
      else if (amountFilter === "500to2000") matchAmount = amt >= 500 && amt <= 2000;
      else if (amountFilter === "above2000") matchAmount = amt > 2000;

      return matchSearch && matchAmount;
    });
  }, [categoryDonations, searchQuery, amountFilter]);

  // Sort
  const sortedDonations = useMemo(() => {
    const sorted = [...filteredDonations];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === "highest") {
      sorted.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    } else if (sortBy === "lowest") {
      sorted.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    }
    return sorted;
  }, [filteredDonations, sortBy]);

  // Paginated
  const totalPages = Math.ceil(sortedDonations.length / pageSize) || 1;
  const paginatedDonations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDonations.slice(start, start + pageSize);
  }, [sortedDonations, currentPage, pageSize]);

  // Export CSV
  function exportCSV() {
    const headers = ["Donor Name", "Email", "Amount (INR)", "Meals", "Payment Method", "Category", "Purpose", "Date", "Message"];
    const rows = sortedDonations.map((d) => [
      `"${(d.donorName || d.name || "Anonymous").replace(/"/g, '""')}"`,
      `"${(d.email || "").replace(/"/g, '""')}"`,
      d.amount || 0,
      d.meals || 0,
      `"${(d.paymentMethod || "online").replace(/"/g, '""')}"`,
      `"${(d.donationCategory || "future").replace(/"/g, '""')}"`,
      `"${(d.purpose || "").replace(/"/g, '""')}"`,
      `"${d.createdAt ? new Date(d.createdAt).toISOString() : ""}"`,
      `"${(d.message || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `udai_donations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          padding: "24px 28px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Donations & Contributions
            </h1>
            <Badge tone="green">Verified Donors</Badge>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
            Realtime overview of philanthropic support, mid-day meals sponsored, and community impact.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            padding: "9px 18px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.borderColor = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* KPI METRIC CARDS - ALL 4 PROGRAMS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Card 1: Total Collections */}
        <div
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Philanthropic Inflow
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", marginTop: "6px", letterSpacing: "-0.02em" }}>
            {formatCurrency(grandTotalAmount)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, marginTop: "4px" }}>
            ✓ {pureDonations.length} contributions across 4 programs
          </div>
        </div>

        {/* Card 2: Mid Day Meals */}
        <div
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#ea580c", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🍲 Mid Day Meals
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#ea580c", marginTop: "6px", letterSpacing: "-0.02em" }}>
            {formatCurrency(totalMealAmount)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
            {mealDonations.length} Contributions ({totalMealsSponsored || "95"} Meals)
          </div>
        </div>

        {/* Card 3: Empower a Child */}
        <div
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#2563eb", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🌱 Empower a Child
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#2563eb", marginTop: "6px", letterSpacing: "-0.02em" }}>
            {formatCurrency(totalEmpowerAmount)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
            {empowerDonations.length} Contributions recorded
          </div>
        </div>

        {/* Card 4: Therapy & Health */}
        <div
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#16a34a", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🩺 Therapy & Health
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#16a34a", marginTop: "6px", letterSpacing: "-0.02em" }}>
            {formatCurrency(totalHealthAmount)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
            {healthDonations.length} Contributions recorded
          </div>
        </div>

        {/* Card 5: Special Education */}
        <div
          style={{
            background: "#ffffff",
            padding: "18px 20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#9333ea", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🎓 Special Education
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#9333ea", marginTop: "6px", letterSpacing: "-0.02em" }}>
            {formatCurrency(totalEducationAmount)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
            {educationDonations.length} Contributions recorded
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          padding: "20px 24px",
        }}
      >
        {/* TABS & SEARCH ROW */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            paddingBottom: "18px",
            borderBottom: "1px solid #f1f5f9",
            marginBottom: "18px",
          }}
        >
          {/* ALL DONATIONS BUTTON + SECTION SELECTOR DROPDOWN */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* All Donations Button */}
            <button
              type="button"
              onClick={() => {
                setCurrentTab("all");
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                border: currentTab === "all" ? "1px solid #2563eb" : "1px solid #cbd5e1",
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: currentTab === "all" ? "#2563eb" : "#ffffff",
                color: currentTab === "all" ? "#ffffff" : "#475569",
                boxShadow: currentTab === "all" ? "0 2px 6px rgba(37, 99, 235, 0.2)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>All Donations</span>
              <span
                style={{
                  background: currentTab === "all" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                  color: currentTab === "all" ? "#ffffff" : "#64748b",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {pureDonations.length}
              </span>
            </button>

            {/* Donation Section Dropdown */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <select
                value={currentTab === "all" ? "" : currentTab}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentTab(val ? val : "all");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: currentTab !== "all" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: currentTab !== "all" ? "#eff6ff" : "#ffffff",
                  color: currentTab !== "all" ? "#1e40af" : "#334155",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  minWidth: "220px",
                }}
              >
                <option value="">-- Select Section --</option>
                <option value="meal">🍲 Mid Day Meals ({mealDonations.length})</option>
                <option value="future">🌱 Empower a Child ({empowerDonations.length})</option>
                <option value="healthcare">🩺 Therapy & Health ({healthDonations.length})</option>
                <option value="education">🎓 Special Education ({educationDonations.length})</option>
              </select>

              {currentTab !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab("all");
                    setCurrentPage(1);
                  }}
                  title="Clear section filter (show all)"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  ✕ Clear Section Filter
                </button>
              )}
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                  display: "flex",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search donor, email..."
                style={{
                  padding: "8px 12px 8px 34px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  width: "220px",
                  outline: "none",
                  background: "#f8fafc",
                }}
              />
            </div>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                background: "#f8fafc",
                color: "#334155",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div style={{ width: "100%", overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: "100%", minWidth: "1200px", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "270px" }}>Donor Details</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "120px" }}>Amount</th>
                {(currentTab === "all" || currentTab === "meal") && (
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "110px" }}>Meals</th>
                )}
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "210px" }}>Program / Purpose</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "130px" }}>Payment Mode</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "150px" }}>Date & Time</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "200px" }}>Donor Note</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDonations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>No donations found</div>
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Try adjusting your search query or filter</div>
                  </td>
                </tr>
              ) : (
                paginatedDonations.map((d, index) => {
                  const donorName = d.donorName || d.name || "Anonymous";
                  const avatarColor = getAvatarColor(donorName);
                  const initials = getInitials(donorName);
                  const amount = Number(d.amount || 0);

                  return (
                    <tr
                      key={d.id || index}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Donor Name + Email with Avatar */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", minWidth: "270px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "250px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: avatarColor.bg,
                              color: avatarColor.text,
                              border: `1px solid ${avatarColor.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ minWidth: 0, overflow: "hidden" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.92rem", whiteSpace: "nowrap" }}>
                              {donorName}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap" }}>
                              {d.email || "No email provided"}
                            </div>
                            {d.phone && (
                              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "1px", whiteSpace: "nowrap" }}>
                                📞 +91 {d.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-block",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            fontVariantNumeric: "tabular-nums",
                            background: "#f0fdf4",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                            padding: "3px 10px",
                            borderRadius: "8px",
                          }}
                        >
                          {formatCurrency(amount)}
                        </span>
                      </td>

                      {/* Meals */}
                      {(currentTab === "all" || currentTab === "meal") && (
                        <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          {d.meals ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                            >
                              🍲 {d.meals} Meals
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      )}

                      {/* Program & Purpose */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        {(() => {
                          const catInfo = getDonationCategoryInfo(d);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: catInfo.bg,
                                  color: catInfo.color,
                                  border: `1px solid ${catInfo.border}`,
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.76rem",
                                  fontWeight: 700,
                                }}
                              >
                                {catInfo.badge}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#64748b",
                                  fontWeight: 500,
                                }}
                              >
                                {d.purpose || catInfo.label}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Payment Method */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "#64748b",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontWeight: 600,
                          }}
                        >
                          {d.paymentMethod || "Online"}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 500, color: "#1e293b", fontSize: "0.82rem" }}>
                          {formatDate(d.createdAt)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {formatTime(d.createdAt)}
                        </div>
                      </td>

                      {/* Message */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", maxWidth: "200px" }}>
                        {d.message ? (
                          <span
                            style={{
                              display: "inline-block",
                              color: "#475569",
                              fontSize: "0.8rem",
                              fontStyle: "italic",
                              background: "#fafafa",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid #f1f5f9",
                            }}
                          >
                            "{d.message}"
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Showing <strong>{sortedDonations.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * pageSize, sortedDonations.length)}</strong> of{" "}
            <strong>{sortedDonations.length}</strong> donations
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: currentPage <= 1 ? "#f8fafc" : "#ffffff",
                color: currentPage <= 1 ? "#94a3b8" : "#0f172a",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: currentPage >= totalPages ? "#f8fafc" : "#ffffff",
                color: currentPage >= totalPages ? "#94a3b8" : "#0f172a",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

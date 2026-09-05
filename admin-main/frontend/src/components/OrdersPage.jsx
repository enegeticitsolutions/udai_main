import React, { useState, useEffect, useMemo } from "react";
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

function formatPaymentMethod(method) {
  if (!method) return "Online";
  const m = String(method).toLowerCase().trim();
  if (m === "payment_link" || m === "payment-link" || m === "link") return "Payment Link";
  if (m === "upi") return "UPI";
  if (m === "card") return "Debit / Credit Card";
  if (m === "netbanking") return "Net Banking";
  if (m === "razorpay") return "Razorpay";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function getAvatarColor(name) {
  const colors = [
    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    { bg: "#fdf4ff", text: "#a21caf", border: "#f5d0fe" },
    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function getInitials(name) {
  if (!name || name === "Customer") return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function OrdersPage({ orders = [], onUpdateOrder }) {
  const [items, setItems] = useState(orders);
  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const pageSize = 12;

  useEffect(() => {
    setItems(orders);
  }, [orders]);

  // Overall calculations
  const totalOrders = items.length;
  const paidOrders = useMemo(() => items.filter((item) => (item.paymentStatus || "").toLowerCase() === "paid"), [items]);
  const initiatedOrders = useMemo(() => items.filter((item) => (item.paymentStatus || "").toLowerCase() === "initiated"), [items]);
  const failedOrders = useMemo(() => items.filter((item) => (item.paymentStatus || "").toLowerCase() === "failed"), [items]);
  const totalRevenue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.totalAmount ?? item.subtotal ?? item.amount ?? 0), 0),
    [items]
  );
  const paidRevenue = useMemo(
    () => paidOrders.reduce((sum, item) => sum + Number(item.totalAmount ?? item.subtotal ?? item.amount ?? 0), 0),
    [paidOrders]
  );

  // Filter by status tab
  const statusFiltered = useMemo(() => {
    if (statusTab === "paid") return paidOrders;
    if (statusTab === "initiated") return initiatedOrders;
    if (statusTab === "failed") return failedOrders;
    return items;
  }, [statusTab, paidOrders, initiatedOrders, failedOrders, items]);

  // Search filter
  const searchFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return statusFiltered;
    return statusFiltered.filter((o) => {
      const id = String(o.orderNumber || o.id || "").toLowerCase();
      const name = String(o.customerName || "").toLowerCase();
      const email = String(o.customerEmail || "").toLowerCase();
      const phone = String(o.customerPhone || "").toLowerCase();
      return id.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [statusFiltered, searchQuery]);

  // Sort
  const sortedOrders = useMemo(() => {
    const arr = [...searchFiltered];
    if (sortBy === "newest") {
      arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === "oldest") {
      arr.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === "highest") {
      arr.sort((a, b) => Number(b.totalAmount || b.subtotal || 0) - Number(a.totalAmount || a.subtotal || 0));
    } else if (sortBy === "lowest") {
      arr.sort((a, b) => Number(a.totalAmount || a.subtotal || 0) - Number(b.totalAmount || b.subtotal || 0));
    }
    return arr;
  }, [searchFiltered, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  // Handle status update
  async function handleStatusChange(orderId, newStatus) {
    if (!onUpdateOrder) return;
    try {
      const updated = await onUpdateOrder(orderId, { paymentStatus: newStatus });
      if (updated) {
        setItems((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: newStatus } : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, paymentStatus: newStatus }));
        }
      }
    } catch (err) {
      console.error("Order status update failed:", err);
    }
  }

  // Export CSV
  function exportCSV() {
    const headers = ["Order ID", "Customer Name", "Email", "Phone", "Amount (INR)", "Payment Status", "Payment Method", "Date"];
    const rows = sortedOrders.map((o) => [
      `"${(o.orderNumber || o.id || "").replace(/"/g, '""')}"`,
      `"${(o.customerName || "").replace(/"/g, '""')}"`,
      `"${(o.customerEmail || "").replace(/"/g, '""')}"`,
      `"${(o.customerPhone || "").replace(/"/g, '""')}"`,
      o.totalAmount || o.subtotal || o.amount || 0,
      `"${(o.paymentStatus || "initiated").replace(/"/g, '""')}"`,
      `"${formatPaymentMethod(o.paymentMethod).replace(/"/g, '""')}"`,
      `"${o.createdAt ? new Date(o.createdAt).toISOString() : ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `udai_orders_${new Date().toISOString().slice(0, 10)}.csv`);
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
              Orders & Purchases
            </h1>
            <Badge tone="blue">Payment Link Active</Badge>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
            Realtime customer store orders, payment link conversions & fulfillment records.
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
          Export Orders
        </button>
      </div>

      {/* KPI METRICS CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Orders */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Orders
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {totalOrders}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "6px" }}>
            Recorded order transactions
          </div>
        </div>

        {/* Paid Orders */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Paid / Completed
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {paidOrders.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600, marginTop: "6px" }}>
            {formatCurrency(paidRevenue)} collected
          </div>
        </div>

        {/* Initiated Orders */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Initiated / Pending
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#d97706", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {initiatedOrders.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "6px" }}>
            Awaiting gateway payment
          </div>
        </div>

        {/* Total Order Value */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Gross Order Value
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#2563eb", marginTop: "8px", letterSpacing: "-0.02em" }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "6px" }}>
            Combined order volume
          </div>
        </div>
      </div>

      {/* MAIN TABLE CONTAINER */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          padding: "20px 24px",
        }}
      >
        {/* TABS & SEARCH BAR */}
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
          {/* STATUS TABS */}
          <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "4px", borderRadius: "12px", gap: "4px" }}>
            <button
              type="button"
              onClick={() => {
                setStatusTab("all");
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: statusTab === "all" ? "#ffffff" : "transparent",
                color: statusTab === "all" ? "#0f172a" : "#64748b",
                boxShadow: statusTab === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              All Orders ({items.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusTab("paid");
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: statusTab === "paid" ? "#ffffff" : "transparent",
                color: statusTab === "paid" ? "#047857" : "#64748b",
                boxShadow: statusTab === "paid" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              ✓ Paid ({paidOrders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusTab("initiated");
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                background: statusTab === "initiated" ? "#ffffff" : "transparent",
                color: statusTab === "initiated" ? "#b45309" : "#64748b",
                boxShadow: statusTab === "initiated" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              ⏳ Initiated ({initiatedOrders.length})
            </button>
            {failedOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusTab("failed");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: statusTab === "failed" ? "#ffffff" : "transparent",
                  color: statusTab === "failed" ? "#b91c1c" : "#64748b",
                  boxShadow: statusTab === "failed" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                ✕ Failed ({failedOrders.length})
              </button>
            )}
          </div>

          {/* SEARCH & SORT */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
                placeholder="Search order ID, customer..."
                style={{
                  padding: "8px 12px 8px 34px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  width: "230px",
                  outline: "none",
                  background: "#f8fafc",
                }}
              />
            </div>

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
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "190px" }}>Order Reference</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "270px" }}>Customer</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "180px" }}>Items Purchased</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "130px" }}>Payment Mode</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "110px" }}>Status</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "110px" }}>Amount</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "140px" }}>Order Date</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", minWidth: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📦</div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>No orders found</div>
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Try adjusting your search query or status filter</div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const orderId = order.orderNumber || order.id || `ORD-${idx}`;
                  const customerName = order.customerName || "Customer";
                  const avatarColor = getAvatarColor(customerName);
                  const initials = getInitials(customerName);
                  const amount = Number(order.totalAmount ?? order.subtotal ?? order.amount ?? 0);
                  const pStatus = (order.paymentStatus || "initiated").toLowerCase();

                  // Status Badge properties
                  let statusBg = "#fffbeb";
                  let statusColor = "#b45309";
                  let statusBorder = "#fde68a";
                  let statusLabel = "Initiated";

                  if (pStatus === "paid" || pStatus === "completed" || pStatus === "success") {
                    statusBg = "#ecfdf5";
                    statusColor = "#065f46";
                    statusBorder = "#a7f3d0";
                    statusLabel = "Paid";
                  } else if (pStatus === "failed" || pStatus === "cancelled") {
                    statusBg = "#fef2f2";
                    statusColor = "#991b1b";
                    statusBorder = "#fecaca";
                    statusLabel = "Failed";
                  }

                  // Items string
                  let itemsDisplay = "Store Purchase";
                  if (Array.isArray(order.items) && order.items.length > 0) {
                    itemsDisplay = order.items.map((it) => `${it.title || "Item"} ×${it.quantity || 1}`).join(", ");
                  } else if (typeof order.items === "string" && order.items.trim()) {
                    itemsDisplay = order.items;
                  }

                  return (
                    <tr
                      key={order.id || idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Order Number (Monospace Badge) */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap", minWidth: "190px" }}>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: "#1e293b",
                            background: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            display: "inline-block",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {orderId}
                        </div>
                      </td>

                      {/* Customer Details */}
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
                              {customerName}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap" }}>
                              {order.customerEmail || "—"}
                            </div>
                            {order.customerPhone && (
                              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "1px", whiteSpace: "nowrap" }}>
                                📞 +91 {order.customerPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", maxWidth: "220px" }}>
                        <div
                          style={{
                            color: "#334155",
                            fontSize: "0.82rem",
                            lineHeight: 1.4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={itemsDisplay}
                        >
                          {itemsDisplay}
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#475569",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            display: "inline-block",
                          }}
                        >
                          {formatPaymentMethod(order.paymentMethod)}
                        </span>
                      </td>

                      {/* Payment Status (Fixed whitespace wrap) */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: statusColor,
                            }}
                          />
                          {statusLabel}
                        </span>
                      </td>

                      {/* Amount (Fixed digits wrap) */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "#0f172a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatCurrency(amount)}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 500, color: "#1e293b", fontSize: "0.82rem" }}>
                          {formatDate(order.createdAt)}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                          {formatTime(order.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            padding: "5px 12px",
                            borderRadius: "8px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#2563eb",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#eff6ff";
                            e.currentTarget.style.borderColor = "#93c5fd";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.borderColor = "#cbd5e1";
                          }}
                        >
                          Details
                        </button>
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
            Showing <strong>{sortedOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * pageSize, sortedOrders.length)}</strong> of{" "}
            <strong>{sortedOrders.length}</strong> orders
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

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              maxWidth: "560px",
              width: "100%",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              border: "1px solid #e2e8f0",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {selectedOrder.orderNumber || selectedOrder.id}
                </span>
                <h3 style={{ margin: "8px 0 0 0", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Order Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            {/* Customer Information */}
            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                Customer Information
              </div>
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>
                {selectedOrder.customerName || "Customer"}
              </div>
              <div style={{ fontSize: "0.84rem", color: "#475569", marginTop: "2px" }}>
                📧 {selectedOrder.customerEmail || "No email"}
              </div>
              {selectedOrder.customerPhone && (
                <div style={{ fontSize: "0.84rem", color: "#475569", marginTop: "2px" }}>
                  📞 +91 {selectedOrder.customerPhone}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "8px" }}>
                Purchased Items
              </div>
              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedOrder.items.map((it, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "#1e293b" }}>
                        {it.title} <span style={{ color: "#64748b" }}>× {it.quantity || 1}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                        {it.price ? formatCurrency(it.price * (it.quantity || 1)) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#f8fafc", color: "#64748b", fontSize: "0.85rem" }}>
                  Direct Store Purchase / Payment Link
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b", marginBottom: "6px" }}>
                <span>Payment Mode:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{formatPaymentMethod(selectedOrder.paymentMethod)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b", marginBottom: "6px" }}>
                <span>Date Placed:</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {formatDate(selectedOrder.createdAt)} {formatTime(selectedOrder.createdAt)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                <span>Total Amount:</span>
                <span style={{ color: "#10b981" }}>
                  {formatCurrency(selectedOrder.totalAmount ?? selectedOrder.subtotal ?? selectedOrder.amount ?? 0)}
                </span>
              </div>
            </div>

            {/* Quick Status Action */}
            <div style={{ background: "#f1f5f9", padding: "14px 16px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Payment Status
                </div>
                <div style={{ fontWeight: 700, color: selectedOrder.paymentStatus === "paid" ? "#047857" : "#b45309", fontSize: "0.9rem" }}>
                  {selectedOrder.paymentStatus || "Initiated"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {selectedOrder.paymentStatus !== "paid" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedOrder.id, "paid")}
                    style={{
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

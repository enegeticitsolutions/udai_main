import React, { useState, useEffect } from "react";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from "../services/adminApi";

const ALL_SYSTEM_PAGES = [
  { id: "Dashboard", label: "Dashboard", desc: "Overview metrics & quick operations", icon: "📊" },
  // { id: "WhatsApp Appointments", label: "WhatsApp Appointments", desc: "Patient chatbot bookings", icon: "💬" },
  { id: "WhatsApp Messages", label: "WhatsApp Messages", desc: "Live chat communication", icon: "📱" },
  { id: "Orders / Purchases", label: "Orders / Purchases", desc: "Store transactions & payment links", icon: "🛍️" },
  { id: "Donations", label: "Donations", desc: "Donor records, meals & 80G receipts", icon: "💖" },
  { id: "Volunteers", label: "Volunteers", desc: "Community volunteer requests", icon: "🤝" },
  { id: "Therapist Management", label: "Therapist Management", desc: "Doctor profiles & departments", icon: "🩺" },
  { id: "Availability Manager", label: "Availability Manager", desc: "OPD clinic calendar & slots", icon: "📅" },
  { id: "Products", label: "Products", desc: "Store items & pricing", icon: "📦" },
  { id: "Career Management", label: "Career Management", desc: "Job postings & applications", icon: "💼" },
  { id: "Subscribe", label: "Subscribe", desc: "Newsletter subscribers", icon: "📰" },
  { id: "Contacts", label: "Contacts", desc: "General website inquiries", icon: "✉️" },
  { id: "Notifications Center", label: "Notifications Center", desc: "Patient SMS / WhatsApp alerts", icon: "🔔" },
  { id: "Message Broadcast", label: "Message Broadcast", desc: "Mass notifications & announcements", icon: "📢" },
  { id: "Reports / Analytics", label: "Reports / Analytics", desc: "Financial & operational analytics", icon: "📈" },
  { id: "Settings", label: "Settings", desc: "Portal preferences & configuration", icon: "⚙️" },
];

export default function AdminManagementPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create mode
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    permissions: ALL_SYSTEM_PAGES.map((p) => p.id),
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirm Modal
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "admin",
      permissions: ALL_SYSTEM_PAGES.map((p) => p.id),
    });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "admin",
      permissions: Array.isArray(user.permissions) ? [...user.permissions] : ALL_SYSTEM_PAGES.map((p) => p.id),
    });
    setFormError("");
    setModalOpen(true);
  };

  const togglePermission = (pageId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(pageId);
      const nextPermissions = exists
        ? prev.permissions.filter((p) => p !== pageId)
        : [...prev.permissions, pageId];
      return { ...prev, permissions: nextPermissions };
    });
  };

  const selectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: ALL_SYSTEM_PAGES.map((p) => p.id),
    }));
  };

  const clearAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: ["Dashboard"], // keep at least Dashboard
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Login ID / Email is required");
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 4)) {
      setFormError("Password must be at least 4 characters long");
      return;
    }

    if (formData.permissions.length === 0) {
      setFormError("Please grant access to at least one page");
      return;
    }

    setFormLoading(true);
    try {
      if (editingUser) {
        // Edit mode
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          permissions:
            formData.role === "super_admin"
              ? ["Admin Management", ...formData.permissions]
              : formData.permissions.filter((p) => p !== "Admin Management"),
        };
        if (formData.password) {
          payload.password = formData.password;
        }

        await updateAdminUser(editingUser.id || editingUser.email, payload);
        setSuccessMsg(`Admin "${formData.name}" updated successfully!`);
      } else {
        // Create mode
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          permissions:
            formData.role === "super_admin"
              ? ["Admin Management", ...formData.permissions]
              : formData.permissions.filter((p) => p !== "Admin Management"),
        };

        const res = await createAdminUser(payload);
        setSuccessMsg(res?.message || `New admin "${formData.name}" created and login details sent to ${formData.email}!`);
      }

      setModalOpen(false);
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setFormError(err.message || "Failed to save admin user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteAdminUser(userToDelete.id || userToDelete.email, currentUser?.email);
      setSuccessMsg(`Admin "${userToDelete.email}" deleted successfully.`);
      setUserToDelete(null);
      loadUsers();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message || "Failed to delete admin user");
      setUserToDelete(null);
    } finally {
      setDeleteLoading(false);
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

  const superAdminCount = users.filter((u) => u.role === "super_admin").length;
  const standardAdminCount = users.filter((u) => u.role !== "super_admin").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "100%" }}>
      {/* HEADER BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          padding: "24px 28px",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#f3e8ff",
                color: "#7e22ce",
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "0.76rem",
                fontWeight: 700,
                border: "1px solid #e9d5ff",
              }}
            >
              🛡️ Super Admin Control
            </span>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Access Management</span>
          </div>

          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>
            Admin Users & Access Permissions
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.88rem" }}>
            Create new administrators, manage page visibility permissions, and delete admin accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "11px 20px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <span style={{ fontSize: "1.1rem" }}>➕</span>
          Add New Admin
        </button>
      </div>

      {/* ALERT / NOTIFICATION MESSAGES */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            style={{ background: "transparent", border: "none", color: "#991b1b", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            fontSize: "0.88rem",
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {/* METRIC OVERVIEW CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
            Total Admin Accounts
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            {users.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Registered login identities</div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
            Super Administrators
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#7c3aed", marginTop: "4px" }}>
            {superAdminCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Full system clearance</div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
            Restricted Admin Users
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
            {standardAdminCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Page-restricted access</div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>
            Available System Modules
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
            {ALL_SYSTEM_PAGES.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Configurable page permissions</div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "18px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              Registered Admin Accounts
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Manage credentials, grant or revoke page access, and configure privileges.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "14px 20px", fontWeight: 600, color: "#475569", fontSize: "0.82rem", minWidth: "260px" }}>
                  ADMIN USER
                </th>
                <th style={{ padding: "14px 20px", fontWeight: 600, color: "#475569", fontSize: "0.82rem", minWidth: "140px" }}>
                  ROLE
                </th>
                <th style={{ padding: "14px 20px", fontWeight: 600, color: "#475569", fontSize: "0.82rem", minWidth: "320px" }}>
                  ACCESSIBLE PAGES / PERMISSIONS
                </th>
                <th style={{ padding: "14px 20px", fontWeight: 600, color: "#475569", fontSize: "0.82rem", minWidth: "100px" }}>
                  STATUS
                </th>
                <th style={{ padding: "14px 20px", fontWeight: 600, color: "#475569", fontSize: "0.82rem", minWidth: "160px", textAlign: "right" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                    Loading administrator accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                    No admin accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuperAdmin = u.role === "super_admin";
                  const isSelf = (currentUser?.email || "").toLowerCase() === (u.email || "").toLowerCase();
                  const perms = Array.isArray(u.permissions) ? u.permissions : [];

                  return (
                    <tr
                      key={u.id || u.email}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: isSuperAdmin
                                ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              {u.name || "Admin"}
                              {isSelf && (
                                <span style={{ fontSize: "0.68rem", background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "4px" }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            background: isSuperAdmin ? "#f3e8ff" : "#eff6ff",
                            color: isSuperAdmin ? "#7e22ce" : "#1d4ed8",
                            border: isSuperAdmin ? "1px solid #e9d5ff" : "1px solid #bfdbfe",
                          }}
                        >
                          {isSuperAdmin ? "Super Admin" : u.role || "Admin"}
                        </span>
                      </td>

                      {/* Permissions List */}
                      <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                        {isSuperAdmin ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#059669",
                              background: "#ecfdf5",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            ⭐ Full Access (All {ALL_SYSTEM_PAGES.length} Pages + Admin Management)
                          </span>
                        ) : perms.length === 0 ? (
                          <span style={{ fontSize: "0.78rem", color: "#ef4444" }}>No pages granted</span>
                        ) : perms.length === ALL_SYSTEM_PAGES.length ? (
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#2563eb",
                              background: "#eff6ff",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            All Standard Pages ({perms.length})
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {perms.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 500,
                                  color: "#334155",
                                  background: "#f1f5f9",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {p}
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  background: "#e2e8f0",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                }}
                              >
                                +{perms.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 20px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            color: "#15803d",
                            background: "#dcfce7",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a" }} />
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", verticalAlign: "middle", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#334155",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#94a3b8";
                              e.currentTarget.style.background = "#f8fafc";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.background = "#ffffff";
                            }}
                          >
                            ⚙️ Permissions
                          </button>

                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            disabled={isSelf || (isSuperAdmin && superAdminCount <= 1)}
                            title={
                              isSelf
                                ? "You cannot delete your own account"
                                : isSuperAdmin && superAdminCount <= 1
                                  ? "Cannot delete the only Super Administrator"
                                  : "Delete Admin"
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              border: "1px solid #fecaca",
                              background: isSelf || (isSuperAdmin && superAdminCount <= 1) ? "#f8fafc" : "#fef2f2",
                              color: isSelf || (isSuperAdmin && superAdminCount <= 1) ? "#cbd5e1" : "#dc2626",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: isSelf || (isSuperAdmin && superAdminCount <= 1) ? "not-allowed" : "pointer",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ADMIN MODAL */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.3rem" }}>{editingUser ? "⚙️" : "👤"}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                    {editingUser ? `Edit Admin: ${editingUser.name}` : "Create New Admin User"}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    Configure credentials and grant specific page access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body (Scrollable) */}
            <form onSubmit={handleFormSubmit} style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
              {formError && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: "0.84rem",
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              {/* Basic Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Full Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Sharma"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Login ID (Email Address) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. sarah@udai.in"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "#2563eb", marginTop: "4px", display: "block" }}>
                    📧 Login ID & password will be automatically emailed to this address
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    {editingUser ? "Password (Leave blank to keep current)" : "Initial Password"} {!editingUser && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Minimum 4 characters"}
                    required={!editingUser}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Admin Role & Clearance
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  >
                    <option value="admin">Standard Admin (Custom Page Access)</option>
                    <option value="super_admin">Super Administrator (Full System Access)</option>
                  </select>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "20px 0" }} />

              {/* Granular Page Access Section */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>
                      Page Access Control ({formData.permissions.length} of {ALL_SYSTEM_PAGES.length} selected)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Select which pages and tabs this administrator is permitted to view.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#2563eb",
                        cursor: "pointer",
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Checkbox Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "10px",
                    background: "#f8fafc",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {ALL_SYSTEM_PAGES.map((page) => {
                    const isChecked = formData.permissions.includes(page.id);
                    return (
                      <label
                        key={page.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          background: isChecked ? "#ffffff" : "transparent",
                          border: isChecked ? "1px solid #93c5fd" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isChecked ? "0 1px 3px rgba(37,99,235,0.08)" : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(page.id)}
                          style={{
                            marginTop: "3px",
                            cursor: "pointer",
                            accentColor: "#2563eb",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{page.icon}</span>
                            <span style={{ fontSize: "0.84rem", fontWeight: isChecked ? 700 : 500, color: isChecked ? "#0f172a" : "#475569" }}>
                              {page.label}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                            {page.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={formLoading}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    padding: "9px 24px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: formLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                  }}
                >
                  {formLoading ? "Saving..." : editingUser ? "Update Admin & Access" : "Create Admin User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) setUserToDelete(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                margin: "0 auto 16px",
              }}
            >
              🗑️
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              Delete Admin Account?
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
              Are you sure you want to delete administrator <strong>{userToDelete.name}</strong> (
              <span style={{ fontFamily: "monospace" }}>{userToDelete.email}</span>)? They will immediately lose access to the admin portal.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleteLoading}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{
                  padding: "9px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                }}
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

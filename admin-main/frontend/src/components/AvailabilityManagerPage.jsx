import React, { useState, useEffect, useMemo, useCallback } from "react";
import Badge from "./Badge";
import StatCard from "./StatCard";
import { getAvailability, toggleAvailability } from "../services/adminApi";

export function getTherapistShiftWindow(therapistName) {
  const name = String(therapistName || "").toLowerCase().trim();
  if (name.includes("atal")) return "09:15 - 17:15 (Lunch: 1:00-1:30)";
  if (name.includes("sakshi")) return "10:00 - 14:00 (No Lunch)";
  if (name.includes("harsimran")) return "13:00 - 17:15 (No Lunch)";
  return "10:00 - 16:30 (Lunch: 1:00-1:30)";
}

// Configured clinic therapists grouped by department as specified
export const CLINIC_THERAPISTS_ROSTER = [
  { department: "OT", therapistName: "Nikki", role: "Occupational Therapist" },
  { department: "OT", therapistName: "Harsimran", role: "Occupational Therapist" },
  { department: "Physiotherapy", therapistName: "Divya", role: "Physiotherapist" },
  { department: "Special Educator", therapistName: "Sobha", role: "Special Educator" },
  { department: "Special Educator", therapistName: "Sonia", role: "Special Educator" },
  { department: "Special Educator", therapistName: "Ranjana", role: "Special Educator" },
  { department: "Speech Therapy", therapistName: "Atal", role: "Speech Therapist" },
  { department: "Speech Therapy", therapistName: "Sakshi", role: "Speech Therapist" },
  { department: "Physical Therapy", therapistName: "Durgesh", role: "Physical Therapist" },
  { department: "Academic Support", therapistName: "Sonia", role: "Academic Instructor" },
  { department: "Academic Support", therapistName: "Sobha", role: "Academic Instructor" },
  { department: "Counselling", therapistName: "Tanu", role: "Psychological Counsellor" },
  { department: "Counselling", therapistName: "Sonia", role: "Counsellor" },
];

export default function AvailabilityManagerPage() {
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate 5 days (Today + 4 days)
  const days = useMemo(() => {
    const arr = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${year}-${month}-${day}`;

      const weekdayStr = weekdays[d.getDay()];
      const dayStr = d.getDate();
      const monthStr = months[d.getMonth()];

      arr.push({
        iso,
        display: `${weekdayStr}, ${dayStr} ${monthStr}`,
        dayOfWeek: d.getDay(),
        isSunday: d.getDay() === 0,
        isToday: i === 0,
      });
    }
    return arr;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const startDate = days[0]?.iso;
      const endDate = days[days.length - 1]?.iso;
      const data = await getAvailability({ startDate, endDate });
      setAvailabilityRecords(data || []);
    } catch (err) {
      console.warn("Failed to load availability records:", err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Check availability status for a therapist on a date
  const isAvailable = (therapistName, department, dateIso, isSunday) => {
    if (isSunday) return false;
    const cleanName = String(therapistName).trim().toLowerCase();
    const cleanDept = String(department).trim().toLowerCase();

    const record = availabilityRecords.find((r) => {
      const rName = String(r.therapistName).trim().toLowerCase();
      const rDept = String(r.department || "").trim().toLowerCase();
      return rName === cleanName && r.date === dateIso && (!rDept || rDept === cleanDept);
    });

    if (record) {
      return record.isAvailable !== false;
    }
    return true; // Default available
  };

  // Toggle availability handler
  const handleToggle = async (therapist, day) => {
    if (day.isSunday) return;

    const currentStatus = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday);
    const nextStatus = !currentStatus;
    const key = `${therapist.therapistName}-${therapist.department}-${day.iso}`;

    setUpdatingKey(key);

    // Optimistic UI update
    setAvailabilityRecords((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.therapistName.toLowerCase() === therapist.therapistName.toLowerCase() &&
            r.department.toLowerCase() === therapist.department.toLowerCase() &&
            r.date === day.iso
          )
      );
      return [
        ...filtered,
        {
          therapistName: therapist.therapistName,
          department: therapist.department,
          date: day.iso,
          isAvailable: nextStatus,
        },
      ];
    });

    try {
      await toggleAvailability({
        therapistName: therapist.therapistName,
        department: therapist.department,
        date: day.iso,
        isAvailable: nextStatus,
      });

      showToast(
        `${therapist.therapistName} (${therapist.department}) marked ${
          nextStatus ? "Available" : "Not Available"
        } on ${day.display}`
      );
    } catch (err) {
      alert("Failed to update availability: " + err.message);
      // Rollback on error
      loadData();
    } finally {
      setUpdatingKey(null);
    }
  };

  // Filter therapists by department
  const departments = useMemo(() => {
    const set = new Set(CLINIC_THERAPISTS_ROSTER.map((t) => t.department));
    return ["All", ...Array.from(set)];
  }, []);

  const filteredTherapists = useMemo(() => {
    if (selectedDeptFilter === "All") return CLINIC_THERAPISTS_ROSTER;
    return CLINIC_THERAPISTS_ROSTER.filter((t) => t.department === selectedDeptFilter);
  }, [selectedDeptFilter]);

  // Total stats
  const totalSlotsTracked = filteredTherapists.length * (days.length - 1); // Exclude Sunday
  const availableSlotsCount = useMemo(() => {
    let count = 0;
    filteredTherapists.forEach((t) => {
      days.forEach((d) => {
        if (!d.isSunday && isAvailable(t.therapistName, t.department, d.iso, d.isSunday)) {
          count++;
        }
      });
    });
    return count;
  }, [filteredTherapists, days, availabilityRecords]);

  const unavailableSlotsCount = totalSlotsTracked - availableSlotsCount;

  return (
    <div style={{ padding: 0, position: "relative" }}>
      {/* ── Toast Notification ────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: "#0f172a",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            fontSize: 14,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
            📅 Availability Manager
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Real-time doctor &amp; therapist availability for WhatsApp bot bookings. Click any cell to toggle.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge tone="green">WhatsApp Bot Synced</Badge>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f2f4f7")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard label="Therapists Listed" value={filteredTherapists.length} hint="Active clinic roster" />
        <StatCard label="Available Slots" value={availableSlotsCount} hint="Open for booking" />
        <StatCard label="Marked Off / Leave" value={unavailableSlotsCount} hint="Blocked from bot flow" />
        <StatCard label="Booking Window" value="Today + 4 Days" hint="5-day rolling schedule" />
      </div>

      {/* ── Department Filter Tabs ────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {departments.map((dept) => (
          <button
            key={dept}
            type="button"
            onClick={() => setSelectedDeptFilter(dept)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: selectedDeptFilter === dept ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedDeptFilter === dept ? "#eff6ff" : "#ffffff",
              color: selectedDeptFilter === dept ? "#1d4ed8" : "#475569",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* ── Availability Table ───────────────────────────── */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflowX: "auto",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th
                style={{
                  padding: "14px 18px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderBottom: "2px solid #e2e8f0",
                  position: "sticky",
                  left: 0,
                  background: "#f8fafc",
                  zIndex: 2,
                  minWidth: 220,
                }}
              >
                Therapist &amp; Department
              </th>
              {days.map((day) => (
                <th
                  key={day.iso}
                  style={{
                    padding: "14px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: day.isSunday ? "#94a3b8" : "#475569",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "center",
                    minWidth: 140,
                    background: day.isToday ? "#eff6ff" : "#f8fafc",
                  }}
                >
                  <div>{day.display}</div>
                  {day.isToday && (
                    <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, marginTop: 2 }}>
                      TODAY
                    </div>
                  )}
                  {day.isSunday && (
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
                      OFF (SUNDAY)
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTherapists.map((therapist, idx) => {
              return (
                <tr
                  key={`${therapist.therapistName}-${therapist.department}-${idx}`}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Sticky Column: Therapist Name & Department */}
                  <td
                    style={{
                      padding: "14px 18px",
                      position: "sticky",
                      left: 0,
                      background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                      zIndex: 1,
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>
                      {therapist.therapistName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "#e0f2fe",
                          color: "#0369a1",
                        }}
                      >
                        {therapist.department}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{therapist.role}</span>
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "#f8fafc",
                          color: "#475569",
                          border: "1px solid #e2e8f0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          letterSpacing: 0.1,
                        }}
                        title="Clinical Shift Window & Lunch"
                      >
                        <span style={{ fontSize: 10 }}>🕒</span>
                        <span>{getTherapistShiftWindow(therapist.therapistName)}</span>
                      </span>
                    </div>
                  </td>

                  {/* Date Cells */}
                  {days.map((day) => {
                    const available = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday);
                    const key = `${therapist.therapistName}-${therapist.department}-${day.iso}`;
                    const isUpdating = updatingKey === key;

                    if (day.isSunday) {
                      return (
                        <td key={day.iso} style={{ padding: "10px 14px", textAlign: "center" }}>
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "#f1f5f9",
                              color: "#94a3b8",
                              fontSize: 12,
                              fontWeight: 500,
                              border: "1px dashed #cbd5e1",
                            }}
                          >
                            Closed
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={day.iso} style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggle(therapist, day)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease-in-out",
                            border: available ? "1px solid #10b981" : "1px solid #ef4444",
                            background: available ? "#ecfdf5" : "#fef2f2",
                            color: available ? "#059669" : "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            opacity: isUpdating ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (!isUpdating) {
                              e.currentTarget.style.transform = "translateY(-1px)";
                              e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "none";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                          title={`Click to mark ${available ? "Not Available" : "Available"}`}
                        >
                          <span>{available ? "●" : "✕"}</span>
                          <span>{available ? "Available" : "Not Available"}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

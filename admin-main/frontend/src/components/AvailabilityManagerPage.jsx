import React, { useState, useEffect, useMemo, useCallback } from "react";
import Badge from "./Badge";
import StatCard from "./StatCard";
import { getAvailability, toggleAvailability } from "../services/adminApi";

/**
 * Returns the formatted clinical shift window badge text for each therapist.
 */
export function getTherapistShiftWindow(therapistName) {
  const name = String(therapistName || "").toLowerCase().trim();
  if (name.includes("tanu")) return "Mon-Fri: 11:00 - 17:00 | Sat: Off";
  if (name.includes("harsimran")) return "Sat: 11:30 - 16:00 | Mon-Fri: Off";
  if (name.includes("nikki")) return "Mon-Fri: 10:00 - 17:15 | Sat: 10:00 - 15:00";
  if (name.includes("divya")) return "Mon-Fri: 10:00 - 18:00 | Sat: 10:00 - 15:00";
  if (name.includes("sonia")) return "Mon-Fri: 09:30 - 16:30 | Sat: 10:00 - 15:00";
  if (name.includes("shobha") || name.includes("sobha")) return "Mon-Fri: 09:30 - 16:30 | Sat: 10:00 - 15:00";
  if (name.includes("ranjana")) return "Mon-Fri: 09:30 - 16:30 | Sat: 10:00 - 15:00";
  if (name.includes("sakshi")) return "Mon, Wed, Fri: 10:00 - 13:00 | Tue, Thu, Sat: Off";
  if (name.includes("atal")) return "Mon, Tue, Thu, Fri: 10:00 - 18:00 | Wed: 10:00 - 15:45 | 2nd & 4th Sat: 10:00 - 16:30";
  if (name.includes("durgesh")) return "Mon-Fri: 11:30 - 17:30 | Sat: Off";
  return "Mon-Fri: 10:00 - 16:30 | Sat: 10:00 - 15:00";
}

/**
 * Determines whether a therapist has a scheduled working shift on a given calendar day.
 * Returns false if:
 *  - Sunday (Clinic completely closed)
 *  - Ms. Sakshi on Tue, Thu, Sat (Off Duty)
 *  - Ms. Harsimran on Mon, Tue, Wed, Thu, Fri (Off Duty)
 *  - Ms. Tanu Rajput on Saturday (Off Duty)
 *  - Mr. Durgesh on Saturday (Off Duty)
 *  - Mr. Atal on 1st, 3rd, 5th Saturday (Off Duty)
 */
export function isTherapistScheduledWorking(therapistName, dayIso, dayOfWeek) {
  if (dayOfWeek === 0) return false; // Sunday: Clinic closed

  const name = String(therapistName || "").toLowerCase().trim();
  const dayOfMonth = dayIso ? parseInt(dayIso.split("-")[2], 10) : 1;
  const saturdayIndex = Math.ceil(dayOfMonth / 7);

  // Ms. Sakshi: Monday, Wednesday, Friday ONLY. Tue, Thu, Sat: Off
  if (name.includes("sakshi")) {
    return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
  }

  // Ms. Harsimran: Saturday ONLY. Mon-Fri: Off
  if (name.includes("harsimran")) {
    return dayOfWeek === 6;
  }

  // Ms. Tanu Rajput: Mon-Fri. Saturday: Off
  if (name.includes("tanu")) {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // Mr. Durgesh: Mon-Fri. Saturday: Off
  if (name.includes("durgesh")) {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // Mr. Atal: Mon, Tue, Thu, Fri, Wed; 2nd & 4th Sat. 1st, 3rd, 5th Sat: Off
  if (name.includes("atal")) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) return true;
    if (dayOfWeek === 6) {
      return saturdayIndex === 2 || saturdayIndex === 4;
    }
    return false;
  }

  // Ms. Nikki, Ms. Divya, Ms. Sonia, Ms. Shobha, Ms. Ranjana work Mon-Sat
  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    return true;
  }

  return false;
}

// Configured official clinic roster with multi-department mappings
export const CLINIC_THERAPISTS_ROSTER = [
  {
    therapistName: "Ms. Tanu Rajput",
    department: "Counselling",
    departments: ["Counselling"],
    role: "Psychological Counsellor",
  },
  {
    therapistName: "Ms. Harsimran",
    department: "OT / Counselling",
    departments: ["OT", "Counselling"],
    role: "Occupational Therapist & Counsellor",
  },
  {
    therapistName: "Ms. Nikki",
    department: "OT",
    departments: ["OT"],
    role: "Occupational Therapist",
  },
  {
    therapistName: "Ms. Divya",
    department: "Physiotherapy",
    departments: ["Physiotherapy"],
    role: "Physiotherapist",
  },
  {
    therapistName: "Ms. Sonia",
    department: "Special Ed / Academic / Counselling",
    departments: ["Special Educator", "Academic Support", "Counselling"],
    role: "Special Educator & Counsellor",
  },
  {
    therapistName: "Ms. Shobha",
    department: "Special Ed / Academic",
    departments: ["Special Educator", "Academic Support"],
    role: "Special Educator & Academic Support",
  },
  {
    therapistName: "Ms. Ranjana",
    department: "Special Educator",
    departments: ["Special Educator"],
    role: "Special Educator",
  },
  {
    therapistName: "Ms. Sakshi",
    department: "Speech Therapy",
    departments: ["Speech Therapy"],
    role: "Speech Therapist",
  },
  {
    therapistName: "Mr. Atal",
    department: "Speech Therapy",
    departments: ["Speech Therapy"],
    role: "Speech Therapist",
  },
  {
    therapistName: "Mr. Durgesh",
    department: "Physical Therapy",
    departments: ["Physical Therapy"],
    role: "Physical Therapist",
  },
];

export const DEPARTMENT_FILTERS = [
  "All",
  "OT",
  "Speech Therapy",
  "Physiotherapy",
  "Special Educator",
  "Physical Therapy",
  "Academic Support",
  "Counselling",
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
    const cleanName = String(therapistName || "").trim().toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");

    const record = availabilityRecords.find((r) => {
      const rName = String(r.therapistName || "").trim().toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");
      return (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName)) && r.date === dateIso;
    });

    if (record) {
      return record.isAvailable !== false;
    }
    return true; // Default available
  };

  // Toggle availability handler
  const handleToggle = async (therapist, day) => {
    if (day.isSunday) return;
    if (!isTherapistScheduledWorking(therapist.therapistName, day.iso, day.dayOfWeek)) return;

    const currentStatus = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday);
    const nextStatus = !currentStatus;
    const key = `${therapist.therapistName}-${day.iso}`;

    setUpdatingKey(key);

    // Optimistic UI update
    setAvailabilityRecords((prev) => {
      const cleanTName = therapist.therapistName.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
      const filtered = prev.filter((r) => {
        const rClean = String(r.therapistName || "").toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
        return !(rClean === cleanTName && r.date === day.iso);
      });
      return [
        ...filtered,
        {
          therapistName: therapist.therapistName,
          department: therapist.departments ? therapist.departments[0] : therapist.department,
          date: day.iso,
          isAvailable: nextStatus,
        },
      ];
    });

    try {
      await toggleAvailability({
        therapistName: therapist.therapistName,
        department: therapist.departments ? therapist.departments[0] : therapist.department,
        date: day.iso,
        isAvailable: nextStatus,
      });

      showToast(
        `${therapist.therapistName} marked ${
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

  // Filter therapists by department (supporting multi-department clinicians)
  const filteredTherapists = useMemo(() => {
    if (selectedDeptFilter === "All") return CLINIC_THERAPISTS_ROSTER;
    return CLINIC_THERAPISTS_ROSTER.filter((t) => {
      if (Array.isArray(t.departments)) {
        return t.departments.includes(selectedDeptFilter);
      }
      return t.department === selectedDeptFilter;
    });
  }, [selectedDeptFilter]);

  // Total stats based on scheduled working shifts
  const { totalScheduledSlots, availableSlotsCount, unavailableSlotsCount } = useMemo(() => {
    let totalScheduled = 0;
    let availableCount = 0;

    filteredTherapists.forEach((t) => {
      days.forEach((d) => {
        if (!d.isSunday && isTherapistScheduledWorking(t.therapistName, d.iso, d.dayOfWeek)) {
          totalScheduled++;
          if (isAvailable(t.therapistName, t.department, d.iso, d.isSunday)) {
            availableCount++;
          }
        }
      });
    });

    return {
      totalScheduledSlots: totalScheduled,
      availableSlotsCount: availableCount,
      unavailableSlotsCount: totalScheduled - availableCount,
    };
  }, [filteredTherapists, days, availabilityRecords]);

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
        <StatCard label="Available Shifts" value={availableSlotsCount} hint="Open for booking" />
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
        {DEPARTMENT_FILTERS.map((dept) => (
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
                  minWidth: 260,
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
                    minWidth: 145,
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
                  key={`${therapist.therapistName}-${idx}`}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Sticky Column: Therapist Name & Department Badges */}
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
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>
                      {therapist.therapistName}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 4 }}>
                      {(therapist.departments || [therapist.department]).map((dept) => (
                        <span
                          key={dept}
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        >
                          {dept}
                        </span>
                      ))}
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>• {therapist.role}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
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
                        title="Official Clinical Shift Rules"
                      >
                        <span style={{ fontSize: 10 }}>🕒</span>
                        <span>{getTherapistShiftWindow(therapist.therapistName)}</span>
                      </span>
                    </div>
                  </td>

                  {/* Date Cells */}
                  {days.map((day) => {
                    // 1. Sunday: Completely closed
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
                              fontWeight: 600,
                              border: "1px dashed #cbd5e1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                            }}
                            title="Clinic is closed on Sundays"
                          >
                            <span>🔒</span>
                            <span>Clinic Closed</span>
                          </div>
                        </td>
                      );
                    }

                    // 2. Scheduled Weekly Off
                    const isScheduled = isTherapistScheduledWorking(therapist.therapistName, day.iso, day.dayOfWeek);
                    if (!isScheduled) {
                      return (
                        <td key={day.iso} style={{ padding: "10px 14px", textAlign: "center" }}>
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background: "#f8fafc",
                              color: "#94a3b8",
                              fontSize: 12,
                              fontWeight: 600,
                              border: "1px dashed #e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                            }}
                            title="Scheduled Weekly Off according to clinical roster"
                          >
                            <span style={{ fontSize: 10 }}>☕</span>
                            <span>Weekly Off</span>
                          </div>
                        </td>
                      );
                    }

                    // 3. Active Scheduled Working Day Toggle
                    const available = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday);
                    const key = `${therapist.therapistName}-${day.iso}`;
                    const isUpdating = updatingKey === key;

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

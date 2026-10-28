import React, { useState, useEffect, useMemo } from "react";
import Button from "./Button";
import Badge from "./Badge";
import { getSchedules, patchSchedule } from "../services/adminApi";

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function generateDefaultShiftWindow(days, satRule, start = "10:00", end = "17:00") {
  const hasMonFri = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every((d) => days.includes(d));
  const hasSat = days.includes("Saturday");

  let baseStr = "";
  if (hasMonFri && days.length === 5 && !hasSat) {
    baseStr = `Mon-Fri: ${start} - ${end} | Sat: Off`;
  } else if (hasMonFri && hasSat && satRule === "ALL") {
    baseStr = `Mon-Fri: ${start} - ${end} | Sat: ${start} - 15:00`;
  } else if (hasMonFri && hasSat && satRule === "2ND_4TH") {
    baseStr = `Mon-Fri: ${start} - ${end} | 2nd & 4th Sat: ${start} - 16:30`;
  } else {
    const shortDays = days.map((d) => d.slice(0, 3)).join(", ");
    const satSuffix = hasSat
      ? satRule === "2ND_4TH"
        ? " (2nd & 4th Sat)"
        : satRule === "NONE"
        ? " (Sat Off)"
        : ""
      : " (Sat Off)";
    baseStr = `${shortDays}: ${start} - ${end}${satSuffix}`;
  }
  return baseStr;
}

export default function TherapistShiftModal({
  isOpen = true,
  therapist,
  liveTherapists = [],
  schedules: propSchedules = [],
  onClose,
  onSave,
  onSchedulesUpdated,
}) {
  const [selectedDays, setSelectedDays] = useState([]);
  const [saturdayRule, setSaturdayRule] = useState("ALL");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [customShiftWindow, setCustomShiftWindow] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [liveSchedules, setLiveSchedules] = useState(propSchedules);
  const [reassignTherapist, setReassignTherapist] = useState("");

  useEffect(() => {
    if (Array.isArray(propSchedules) && propSchedules.length > 0) {
      setLiveSchedules(propSchedules);
      return;
    }
    getSchedules()
      .then((res) => {
        const list = res?.data || res || [];
        if (Array.isArray(list)) setLiveSchedules(list);
      })
      .catch(() => {});
  }, [propSchedules]);

  const therapistName = therapist?.name || therapist?.therapistName || "";

  // Identify sessions currently booked on days that are being removed/turned off
  const affectedSessions = useMemo(() => {
    if (!therapistName || !Array.isArray(liveSchedules) || liveSchedules.length === 0) return [];
    const tClean = therapistName.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
    const list = [];

    liveSchedules.forEach((sched) => {
      const childName = sched.child_name || "Child";
      const schedId = sched.id || sched._id;
      const slots = sched.recurring_slots || sched.sessions || [];
      slots.forEach((slot, sIdx) => {
        const slotT = String(slot.therapist_id || slot.therapistId || sched.therapist_id || "").toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
        if (slotT && (slotT === tClean || tClean.includes(slotT) || slotT.includes(tClean))) {
          const slotDay = slot.day_of_week || slot.dayOfWeek;
          const isDayKept = selectedDays.includes(slotDay);
          const isSatRemoved = slotDay === "Saturday" && saturdayRule === "NONE";
          if (!isDayKept || isSatRemoved) {
            list.push({
              schedId,
              childName,
              slotIndex: sIdx,
              slot,
              day: slotDay,
              time: slot.start_time || slot.startTime,
              therapy: slot.therapy_name || slot.therapy_type || "Therapy",
            });
          }
        }
      });
    });
    return list;
  }, [therapistName, liveSchedules, selectedDays, saturdayRule]);

  // Other active clinicians available for quick handover/transfer
  const otherTherapists = useMemo(() => {
    if (!Array.isArray(liveTherapists) || liveTherapists.length === 0) return [];
    const tClean = therapistName.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
    return liveTherapists.filter((t) => {
      const name = String(t.name || t.therapistName || "").toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
      return name && name !== tClean && t.active !== false;
    });
  }, [liveTherapists, therapistName]);

  // Initialize from therapist data or establish sensible defaults
  useEffect(() => {
    if (!therapist) return;

    const lower = String(therapistName).toLowerCase();
    let initialDays = therapist.workingDays;
    let initialSatRule = therapist.saturdayRule;
    let initialStart = therapist.workingHours?.start || "10:00";
    let initialEnd = therapist.workingHours?.end || "18:00";
    let initialWindow = therapist.shiftWindow || "";

    if (!Array.isArray(initialDays) || initialDays.length === 0) {
      if (lower.includes("sakshi")) {
        initialDays = ["Monday", "Wednesday", "Friday"];
        initialSatRule = "NONE";
        initialStart = "10:00";
        initialEnd = "13:00";
      } else if (lower.includes("harsimran")) {
        initialDays = ["Saturday"];
        initialSatRule = "ALL";
        initialStart = "11:30";
        initialEnd = "16:00";
      } else if (lower.includes("tanu")) {
        initialDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        initialSatRule = "NONE";
        initialStart = "11:00";
        initialEnd = "17:00";
      } else if (lower.includes("durgesh")) {
        initialDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        initialSatRule = "NONE";
        initialStart = "11:30";
        initialEnd = "17:30";
      } else if (lower.includes("atal")) {
        initialDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        initialSatRule = "2ND_4TH";
        initialStart = "10:00";
        initialEnd = "18:00";
      } else {
        initialDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        initialSatRule = "ALL";
        initialStart = "10:00";
        initialEnd = "17:00";
      }
    }

    if (!initialWindow) {
      initialWindow = generateDefaultShiftWindow(initialDays, initialSatRule, initialStart, initialEnd);
    }

    setSelectedDays(initialDays);
    setSaturdayRule(initialSatRule || "ALL");
    setStartTime(initialStart);
    setEndTime(initialEnd);
    setCustomShiftWindow(initialWindow);
    setError("");
  }, [therapist, therapistName]);

  const toggleDay = (day) => {
    setSelectedDays((prev) => {
      const exists = prev.includes(day);
      let next;
      if (exists) {
        next = prev.filter((d) => d !== day);
      } else {
        // Keep in calendar order
        next = ALL_DAYS.filter((d) => prev.includes(d) || d === day);
      }
      // Auto-update shift description if user hasn't heavily customized
      const autoDesc = generateDefaultShiftWindow(next, saturdayRule, startTime, endTime);
      setCustomShiftWindow(autoDesc);
      return next;
    });
  };

  const handleSaturdayRuleChange = (rule) => {
    setSaturdayRule(rule);
    let nextDays = [...selectedDays];
    if (rule === "NONE" && nextDays.includes("Saturday")) {
      nextDays = nextDays.filter((d) => d !== "Saturday");
      setSelectedDays(nextDays);
    } else if (rule !== "NONE" && !nextDays.includes("Saturday")) {
      nextDays = ALL_DAYS.filter((d) => nextDays.includes(d) || d === "Saturday");
      setSelectedDays(nextDays);
    }
    const autoDesc = generateDefaultShiftWindow(nextDays, rule, startTime, endTime);
    setCustomShiftWindow(autoDesc);
  };

  const handleAutoGenerateDesc = () => {
    const autoDesc = generateDefaultShiftWindow(selectedDays, saturdayRule, startTime, endTime);
    setCustomShiftWindow(autoDesc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setError("Please select at least 1 working day for this clinician.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Reassign affected booked sessions to the selected replacement clinician
      if (reassignTherapist && affectedSessions.length > 0) {
        const bySched = {};
        affectedSessions.forEach((item) => {
          if (!bySched[item.schedId]) bySched[item.schedId] = [];
          bySched[item.schedId].push(item);
        });

        for (const schedId of Object.keys(bySched)) {
          const targetSched = liveSchedules.find((s) => String(s.id || s._id) === String(schedId));
          if (targetSched) {
            const currentSlots = targetSched.recurring_slots || targetSched.sessions || [];
            const updatedSlots = currentSlots.map((slot) => {
              const sDay = slot.day_of_week || slot.dayOfWeek;
              const sTime = slot.start_time || slot.startTime;
              const isHit = bySched[schedId].some((aff) => aff.day === sDay && aff.time === sTime);
              if (isHit) {
                return {
                  ...slot,
                  therapist_id: reassignTherapist,
                  therapistId: reassignTherapist,
                  therapist_name: reassignTherapist,
                };
              }
              return slot;
            });
            await patchSchedule(schedId, { recurring_slots: updatedSlots, sessions: updatedSlots }).catch(() => {});
          }
        }
        if (onSchedulesUpdated) {
          onSchedulesUpdated();
        }
      }

      // 2. Save therapist shift
      const updates = {
        workingDays: selectedDays,
        saturdayRule: selectedDays.includes("Saturday") ? saturdayRule : "NONE",
        workingHours: {
          start: startTime,
          end: endTime,
        },
        shiftWindow: customShiftWindow.trim() || generateDefaultShiftWindow(selectedDays, saturdayRule, startTime, endTime),
      };
      await onSave(therapist.id || therapist._id || therapistName, updates);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to update shift schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (isOpen === false || !therapist) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #cbd5e1)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 620,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text, #0f172a)" }}>
                ⚙️ Manage Working Shift & Offs
              </h3>
              <Badge tone="teal">{therapist.department || "Clinical Department"}</Badge>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
              Configure live recurring working days and weekly offs for <strong>{therapistName}</strong>. No code changes required!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--muted, #64748b)",
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Section 1: Weekly Working Days */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)", marginBottom: 8 }}>
              🗓️ 1. Active Working Days in a Week:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: isSelected ? "2px solid #0284c7" : "1px solid var(--line, #cbd5e1)",
                      background: isSelected ? "#e0f2fe" : "var(--surface-2, #f8fafc)",
                      color: isSelected ? "#0369a1" : "var(--muted, #64748b)",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{day}</span>
                    <span>{isSelected ? "✓" : "—"}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted, #64748b)", marginTop: 6 }}>
              Days marked with "—" will automatically display as <strong>☕ Weekly Off</strong> across Recurring Slots & Availability Manager.
            </div>
          </div>

          {/* Section 2: Saturday Policy */}
          <div style={{ background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line, #e2e8f0)", borderRadius: 12, padding: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)", marginBottom: 8 }}>
              📅 2. Saturday Working Policy:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: saturdayRule === "ALL" && selectedDays.includes("Saturday") ? "#ecfdf5" : "#fff",
                  border: saturdayRule === "ALL" && selectedDays.includes("Saturday") ? "1.5px solid #10b981" : "1px solid var(--line, #cbd5e1)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="satRule"
                  value="ALL"
                  checked={saturdayRule === "ALL" && selectedDays.includes("Saturday")}
                  onChange={() => handleSaturdayRuleChange("ALL")}
                />
                <div>
                  <strong style={{ fontSize: 13, color: "#065f46" }}>🟢 Every Saturday Working</strong>
                  <div style={{ fontSize: 11.5, color: "#047857" }}>Therapist is available every Saturday of the month (Mon - Sat).</div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: saturdayRule === "2ND_4TH" ? "#eff6ff" : "#fff",
                  border: saturdayRule === "2ND_4TH" ? "1.5px solid #0284c7" : "1px solid var(--line, #cbd5e1)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="satRule"
                  value="2ND_4TH"
                  checked={saturdayRule === "2ND_4TH"}
                  onChange={() => handleSaturdayRuleChange("2ND_4TH")}
                />
                <div>
                  <strong style={{ fontSize: 13, color: "#0369a1" }}>⚡ Alternate Working (2nd & 4th Saturday Working)</strong>
                  <div style={{ fontSize: 11.5, color: "#0284c7" }}>
                    Works on 2nd and 4th Saturday. 1st, 3rd, and 5th Saturdays are automatically scheduled as <strong>Weekly Off</strong>. (Like Mr. Atal)
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: !selectedDays.includes("Saturday") || saturdayRule === "NONE" ? "#fef2f2" : "#fff",
                  border: !selectedDays.includes("Saturday") || saturdayRule === "NONE" ? "1.5px solid #ef4444" : "1px solid var(--line, #cbd5e1)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="satRule"
                  value="NONE"
                  checked={!selectedDays.includes("Saturday") || saturdayRule === "NONE"}
                  onChange={() => handleSaturdayRuleChange("NONE")}
                />
                <div>
                  <strong style={{ fontSize: 13, color: "#991b1b" }}>🔴 Every Saturday Off</strong>
                  <div style={{ fontSize: 11.5, color: "#b91c1c" }}>Clinic shifts run Monday to Friday only. Saturday is always Off. (Like Ms. Tanu, Mr. Durgesh)</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Shift Hours */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--text, #1e293b)", marginBottom: 4 }}>
                🕒 Shift Start Time:
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line, #cbd5e1)",
                  background: "var(--surface, #fff)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--text, #1e293b)", marginBottom: 4 }}>
                🕒 Shift End Time:
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="18:00"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line, #cbd5e1)",
                  background: "var(--surface, #fff)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Section 4: Shift Window Description Preview */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text, #1e293b)" }}>
                📝 Shift Window Label (Shown to Admins & Parents):
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateDesc}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Auto-generate 🔄
              </button>
            </div>
            <input
              type="text"
              value={customShiftWindow}
              onChange={(e) => setCustomShiftWindow(e.target.value)}
              placeholder="Mon-Fri: 10:00 - 18:00 | Sat: 10:00 - 15:00"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line, #cbd5e1)",
                background: "var(--surface, #fff)",
                fontWeight: 600,
                fontSize: 13,
              }}
            />
          </div>

          {/* Live Preview Box */}
          <div style={{ padding: 12, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              ✓ Live Preview on Admin Panel
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "#14532d" }}>
                📅 {therapistName}'s Weekly Schedule
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 6, border: "1px solid #86efac" }}>
                🕒 {customShiftWindow || generateDefaultShiftWindow(selectedDays, saturdayRule, startTime, endTime)}
              </span>
            </div>
          </div>

          {/* Affected Booked Sessions Warning & Quick Reassignment */}
          {affectedSessions.length > 0 && (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fffbeb",
                border: "1.5px solid #f59e0b",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#92400e" }}>
                    {affectedSessions.length} Active Sessions Booked on Removed Days!
                  </div>
                  <div style={{ fontSize: 11.5, color: "#b45309" }}>
                    You unchecked days where <strong>{therapistName}</strong> has scheduled patients:
                  </div>
                </div>
              </div>

              {/* Affected List */}
              <div
                style={{
                  maxHeight: 110,
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                {affectedSessions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 11.5,
                      color: "#78350f",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 0",
                      borderBottom: idx < affectedSessions.length - 1 ? "1px dashed #fef3c7" : "none",
                    }}
                  >
                    <span>
                      <strong>{item.childName}</strong> • {item.day} at {item.time}
                    </span>
                    <Badge tone="amber">{item.therapy}</Badge>
                  </div>
                ))}
              </div>

              {/* Reassign Dropdown */}
              <div style={{ background: "#fef3c7", padding: "10px 12px", borderRadius: 8, border: "1px solid #fde68a" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#78350f", marginBottom: 4 }}>
                  🔁 Quick Reassign to Another Clinician (1-Click Transfer):
                </label>
                <select
                  value={reassignTherapist}
                  onChange={(e) => setReassignTherapist(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #d97706",
                    background: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <option value="">Do not reassign automatically (keep flagged as ⚠️ Off-Day Clash)</option>
                  {otherTherapists.map((t) => (
                    <option key={t.name || t.therapistName} value={t.name || t.therapistName}>
                      Transfer all {affectedSessions.length} slots to {t.name || t.therapistName} ({t.department || "Therapist"})
                    </option>
                  ))}
                </select>
                {reassignTherapist ? (
                  <div style={{ fontSize: 11, color: "#065f46", fontWeight: 700, marginTop: 4 }}>
                    ✓ When you click Save, all {affectedSessions.length} slots will be automatically transferred to {reassignTherapist}!
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>
                    💡 If not reassigned now, these slots will remain visible with red ⚠️ Off-Day Clash chips in Recurring Slots for manual rescheduling.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, paddingTop: 14, borderTop: "1px solid var(--line, #e2e8f0)" }}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving to Database..." : "💾 Save Dynamic Shift Schedule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Badge from "./Badge";
import StatCard from "./StatCard";
import Button from "./Button";
import { getAvailability, toggleAvailability, getSchedules, getAdminBootstrap, patchTherapist } from "../services/adminApi";
import TherapistShiftModal from "./TherapistShiftModal";

/**
/**
 * Resolves therapist's shift configuration dynamically.
 * Prioritizes admin-saved dynamic settings in database (workingDays, saturdayRule, shiftWindow),
 * with sensible roster defaults as fallback.
 */
export function getTherapistShiftConfig(therapistName, liveTherapists = []) {
  const name = String(therapistName || "").toLowerCase().trim();

  if (Array.isArray(liveTherapists) && liveTherapists.length > 0) {
    const found = liveTherapists.find((t) => {
      const n = String(t.name || t.therapistName || "").toLowerCase().trim();
      return n === name || name.includes(n) || n.includes(name);
    });
    if (found && (Array.isArray(found.workingDays) || found.saturdayRule || found.shiftWindow)) {
      return {
        workingDays: Array.isArray(found.workingDays) && found.workingDays.length > 0
          ? found.workingDays
          : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        saturdayRule: found.saturdayRule || "ALL",
        shiftWindow: found.shiftWindow || "Mon-Sat: 10:00 - 17:00",
        workingHours: found.workingHours || { start: "10:00", end: "17:00" },
      };
    }
  }

  // Fallback defaults for legacy or unconfigured records:
  if (name.includes("sakshi")) {
    return {
      workingDays: ["Monday", "Wednesday", "Friday"],
      saturdayRule: "NONE",
      shiftWindow: "Mon, Wed, Fri: 10:00 - 13:00 | Tue, Thu, Sat: Off",
      workingHours: { start: "10:00", end: "13:00" },
    };
  }
  if (name.includes("harsimran")) {
    return {
      workingDays: ["Saturday"],
      saturdayRule: "ALL",
      shiftWindow: "Sat: 11:30 - 16:00 | Mon-Fri: Off",
      workingHours: { start: "11:30", end: "16:00" },
    };
  }
  if (name.includes("tanu")) {
    return {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      saturdayRule: "NONE",
      shiftWindow: "Mon-Fri: 11:00 - 17:00 | Sat: Off",
      workingHours: { start: "11:00", end: "17:00" },
    };
  }
  if (name.includes("durgesh")) {
    return {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      saturdayRule: "NONE",
      shiftWindow: "Mon-Fri: 11:30 - 17:30 | Sat: Off",
      workingHours: { start: "11:30", end: "17:30" },
    };
  }
  if (name.includes("atal")) {
    return {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      saturdayRule: "2ND_4TH",
      shiftWindow: "Mon, Tue, Thu, Fri: 10:00 - 18:00 | Wed: 10:00 - 15:45 | 2nd & 4th Sat: 10:00 - 16:30",
      workingHours: { start: "10:00", end: "18:00" },
    };
  }
  return {
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    saturdayRule: "ALL",
    shiftWindow: "Mon-Fri: 10:00 - 17:00 | Sat: 10:00 - 15:00",
    workingHours: { start: "10:00", end: "17:00" },
  };
}

/**
 * Returns the formatted clinical shift window badge text for each therapist dynamically.
 */
export function getTherapistShiftWindow(therapistName, liveTherapists = []) {
  const config = getTherapistShiftConfig(therapistName, liveTherapists);
  return config.shiftWindow;
}

/**
 * Determines whether a therapist has a scheduled working shift on a given calendar day dynamically.
 * Reads admin-saved shift settings from database/state first, eliminating code modifications.
 */
export function isTherapistScheduledWorking(therapistName, dayIso, dayOfWeek, liveTherapists = []) {
  if (dayOfWeek === 0) return false; // Sunday: Clinic closed

  const config = getTherapistShiftConfig(therapistName, liveTherapists);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = DAYS[dayOfWeek];

  if (!config.workingDays.includes(dayName)) {
    return false;
  }

  // Saturday Policy Evaluation
  if (dayOfWeek === 6) {
    if (config.saturdayRule === "NONE") return false;
    if (config.saturdayRule === "ALL") return true;
    if (config.saturdayRule === "2ND_4TH") {
      if (!dayIso) return true; // Weekly template without date -> 2nd & 4th Sat is an active shift
      const dayOfMonth = parseInt(dayIso.split("-")[2], 10);
      const saturdayIndex = Math.ceil(dayOfMonth / 7);
      return saturdayIndex === 2 || saturdayIndex === 4;
    }
  }

  return true;
}

// Configured official clinic roster with multi-department mappings
export const CLINIC_THERAPISTS_ROSTER = [
  {
    therapistName: "Ms. Tanu Rajput",
    department: "Child and Parental Counselling",
    departments: ["Child and Parental Counselling", "Counselling"],
    role: "Psychological Counsellor",
  },
  {
    therapistName: "Ms. Harsimran",
    department: "OT / Child and Parental Counselling",
    departments: ["OT", "Child and Parental Counselling", "Counselling"],
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
    department: "Special Ed / Academic / Child and Parental Counselling",
    departments: ["Special Educator", "Academic Support", "Child and Parental Counselling", "Counselling"],
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
  "Child and Parental Counselling",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function buildDaysForMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const arr = [];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIso = new Date().toISOString().split("T")[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(d).padStart(2, "0");
    const iso = `${year}-${monthStr}-${dayStr}`;

    arr.push({
      d,
      iso,
      dayOfWeek,
      weekdayStr: weekdays[dayOfWeek],
      dayOfWeekFull: weekdayFull[dayOfWeek],
      monthNum: month,
      year,
      monthStr: MONTH_NAMES[month].slice(0, 3),
      monthNameFull: MONTH_NAMES[month],
      display: `${weekdays[dayOfWeek]}, ${d} ${MONTH_NAMES[month].slice(0, 3)}`,
      isSunday: dayOfWeek === 0,
      isToday: iso === todayIso,
    });
  }
  return arr;
}

export default function AvailabilityManagerPage({ therapists: propTherapists = [], onUpdateTherapist }) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0-11
  const [monthViewMode, setMonthViewMode] = useState("dual"); // "dual" | "current" | "next"
  const [activeView, setActiveView] = useState("calendar"); // "calendar" | "matrix"
  const [selectedTherapistName, setSelectedTherapistName] = useState(CLINIC_THERAPISTS_ROSTER[2].therapistName); // Default Ms. Nikki
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  const [liveTherapists, setLiveTherapists] = useState(propTherapists);

  // Dynamic Shift & Working Days Modal State
  const [shiftModalTherapist, setShiftModalTherapist] = useState(null);

  const openShiftModalForTherapist = (therapistName) => {
    const found = (liveTherapists || []).find((t) => {
      const n = String(t.name || t.therapistName || "").toLowerCase().trim();
      const target = String(therapistName || "").toLowerCase().trim();
      return n === target || target.includes(n) || n.includes(target);
    });
    setShiftModalTherapist(found || { name: therapistName, therapistName });
  };

  const handleSaveShiftModal = async (therapistIdOrName, updates) => {
    try {
      const target = (liveTherapists || []).find((t) => {
        const idMatch = String(t.id || t._id) === String(therapistIdOrName);
        const nameMatch = (t.name || t.therapistName) === therapistIdOrName;
        return idMatch || nameMatch;
      });

      const targetId = target?.id || target?._id || therapistIdOrName;
      if (onUpdateTherapist) {
        await onUpdateTherapist(targetId, updates);
      } else if (targetId) {
        await patchTherapist(targetId, updates).catch(() => {});
      }

      setLiveTherapists((prev) =>
        prev.map((t) => {
          const match =
            (t.id && (String(t.id) === String(targetId) || String(t._id) === String(targetId))) ||
            (t.name && (t.name === therapistIdOrName || t.therapistName === therapistIdOrName));
          return match ? { ...t, ...updates } : t;
        })
      );
      setShiftModalTherapist(null);
    } catch (err) {
      console.error("Failed to update therapist shift:", err);
    }
  };

  useEffect(() => {
    if (Array.isArray(propTherapists) && propTherapists.length > 0) {
      setLiveTherapists(propTherapists);
      return;
    }
    getAdminBootstrap()
      .then((data) => {
        if (data?.therapists?.length > 0) {
          setLiveTherapists(data.therapists);
        }
      })
      .catch(() => {});
  }, [propTherapists]);

  const dynamicRoster = useMemo(() => {
    const roster = [];
    const seen = new Set();

    if (Array.isArray(liveTherapists) && liveTherapists.length > 0) {
      liveTherapists.filter((t) => t.active !== false).forEach((t) => {
        const name = (t.name || t.therapistName || "").trim();
        if (!name || seen.has(name.toLowerCase())) return;
        seen.add(name.toLowerCase());

        const existing = CLINIC_THERAPISTS_ROSTER.find(
          (c) => c.therapistName.toLowerCase() === name.toLowerCase()
        );

        roster.push({
          id: t.id || t._id,
          therapistName: name,
          department: t.department || existing?.department || "General",
          departments: existing?.departments || [t.department || "General"],
          role: t.role || existing?.role || t.department || "Therapist",
        });
      });
    }

    CLINIC_THERAPISTS_ROSTER.forEach((c) => {
      if (!seen.has(c.therapistName.toLowerCase())) {
        seen.add(c.therapistName.toLowerCase());
        roster.push(c);
      }
    });

    return roster;
  }, [liveTherapists]);

  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal for inspecting full details of a clicked day
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const maxDate = new Date(minYear, minMonth, 1);
  maxDate.setMonth(maxDate.getMonth() + 5);
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();

  const isAtMinMonth = selectedYear === minYear && selectedMonth === minMonth;
  const isAtMaxMonth = selectedYear === maxYear && selectedMonth === maxMonth;

  // Month navigation helpers (Current Month to +5 Months)
  const handlePrevMonth = () => {
    if (isAtMinMonth) return;
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isAtMaxMonth) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Next month index & year calculations
  const nextMonthNum = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const nextMonthYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;

  // Generate days for both current month and next month
  const currentMonthDays = useMemo(() => {
    return buildDaysForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const nextMonthDays = useMemo(() => {
    return buildDaysForMonth(nextMonthYear, nextMonthNum);
  }, [nextMonthYear, nextMonthNum]);

  // First day offset (0 = Sunday, 1 = Monday, etc.) for monthly calendar grids
  const firstDayOfWeekCurrent = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  }, [selectedYear, selectedMonth]);

  const firstDayOfWeekNext = useMemo(() => {
    return new Date(nextMonthYear, nextMonthNum, 1).getDay();
  }, [nextMonthYear, nextMonthNum]);

  // Combined days array for fetching full 2-month dataset
  const allDaysToLoad = useMemo(() => {
    return [...currentMonthDays, ...nextMonthDays];
  }, [currentMonthDays, nextMonthDays]);

  // Active days list based on user's active view mode
  const activeDisplayDays = useMemo(() => {
    if (monthViewMode === "current") return currentMonthDays;
    if (monthViewMode === "next") return nextMonthDays;
    return allDaysToLoad;
  }, [monthViewMode, currentMonthDays, nextMonthDays, allDaysToLoad]);

  // Load availability from MongoDB and recurring slots from schedules database across both months
  const loadData = useCallback(async () => {
    try {
      const startDate = allDaysToLoad[0]?.iso;
      const endDate = allDaysToLoad[allDaysToLoad.length - 1]?.iso;
      const [availData, schedRes] = await Promise.all([
        getAvailability({ startDate, endDate }),
        getSchedules().catch(() => ({ data: [] })),
      ]);
      setAvailabilityRecords(availData || []);
      const schedList = schedRes?.data || schedRes || [];
      setSchedules(Array.isArray(schedList) ? schedList : []);
    } catch (err) {
      console.warn("Failed to load availability or schedules:", err);
    } finally {
      setLoading(false);
    }
  }, [allDaysToLoad]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Map active recurring routine slots by therapist name and day of week
  const recurringByTherapist = useMemo(() => {
    const map = {};
    for (const s of schedules) {
      if (s.status !== "ACTIVE") continue;
      const rawSlots = s.recurring_slots || s.sessions || [];
      for (const slot of rawSlots) {
        const tRaw = slot.therapist_id || slot.therapistId || s.therapist_id || "";
        const tClean = String(tRaw).replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
        if (!tClean) continue;
        if (!map[tClean]) map[tClean] = {};

        const day = slot.day_of_week || slot.dayOfWeek || "Monday";
        if (!map[tClean][day]) map[tClean][day] = [];
        const slotType = slot.slot_type || slot.slotType || s.slot_type || s.slotType || "OTA";
        map[tClean][day].push({
          childName: s.child_name,
          parentPhone: s.parent_phone,
          startTime: slot.start_time || slot.startTime || "10:00",
          endTime: slot.end_time || slot.endTime || "10:45",
          therapyName: slot.therapy_name || slot.therapy_type || s.therapy_type || "Therapy",
          therapistId: tRaw,
          slotType: slotType,
        });
      }
    }

    // Sort slots chronologically
    for (const t in map) {
      for (const d in map[t]) {
        map[t][d].sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    }
    return map;
  }, [schedules]);

  // Helper: check availability status for a therapist on a specific date
  const isAvailable = (therapistName, department, dateIso, isSunday, isScheduled) => {
    const cleanName = String(therapistName || "").trim().toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");

    const record = availabilityRecords.find((r) => {
      const rName = String(r.therapistName || "").trim().toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");
      return (rName === cleanName || rName.includes(cleanName) || cleanName.includes(rName)) && r.date === dateIso;
    });

    // If an explicit database record exists for this date, ALWAYS honor the admin's setting!
    if (record) {
      return record.isAvailable === true;
    }

    // Default when no database record exists:
    // Sunday or off-duty days are naturally off (false).
    // Scheduled working days are naturally available (true).
    if (isSunday || isScheduled === false) {
      return false;
    }

    return true; // Default available for normal working days
  };

  // Helper: get recurring sessions for a therapist on a calendar day
  const getDayRecurringSessions = (therapistName, dayOfWeekFull) => {
    const cleanName = String(therapistName || "").trim().toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");
    for (const tKey in recurringByTherapist) {
      if (tKey === cleanName || tKey.includes(cleanName) || cleanName.includes(tKey)) {
        return recurringByTherapist[tKey]?.[dayOfWeekFull] || [];
      }
    }
    return [];
  };

  // Toggle availability handler (supports dynamically opening Sunday & Week-off days)
  const handleToggle = async (therapist, day, e) => {
    e?.stopPropagation();

    const isScheduled = isTherapistScheduledWorking(therapist.therapistName, day.iso, day.dayOfWeek, liveTherapists);
    const currentStatus = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday, isScheduled);
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

      const label = nextStatus
        ? (day.isSunday || !isScheduled ? "Special Working Day (Slots Opened)" : "Available")
        : "Off / Closed";

      showToast(
        `${therapist.therapistName} marked ${label} on ${day.display}`
      );
    } catch (err) {
      alert("Failed to update availability: " + err.message);
      loadData();
    } finally {
      setUpdatingKey(null);
    }
  };

  // Filter therapists by department
  const filteredTherapists = useMemo(() => {
    if (selectedDeptFilter === "All") return dynamicRoster;
    return dynamicRoster.filter((t) => {
      if (Array.isArray(t.departments)) {
        return (
          t.departments.includes(selectedDeptFilter) ||
          (selectedDeptFilter === "Child and Parental Counselling" && t.departments.includes("Counselling"))
        );
      }
      return (
        t.department === selectedDeptFilter ||
        (selectedDeptFilter === "Child and Parental Counselling" && (t.department === "Counselling" || t.department?.includes("Counselling")))
      );
    });
  }, [dynamicRoster, selectedDeptFilter]);

  // Selected therapist object
  const currentTherapistObj = useMemo(() => {
    return dynamicRoster.find((t) => t.therapistName === selectedTherapistName) || dynamicRoster[0] || CLINIC_THERAPISTS_ROSTER[0];
  }, [dynamicRoster, selectedTherapistName]);

  // Total stats for the active view
  const { totalScheduledDays, totalAvailableDays, totalLeaveDays, totalRecurringSessionsInClinic } = useMemo(() => {
    let scheduled = 0;
    let avail = 0;

    filteredTherapists.forEach((t) => {
      activeDisplayDays.forEach((d) => {
        const isScheduled = isTherapistScheduledWorking(t.therapistName, d.iso, d.dayOfWeek, liveTherapists);
        const availOnDay = isAvailable(t.therapistName, t.department, d.iso, d.isSunday, isScheduled);
        if (availOnDay) {
          scheduled++;
          avail++;
        } else if (!d.isSunday && isScheduled) {
          scheduled++;
        }
      });
    });

    let recurringCount = 0;
    for (const t in recurringByTherapist) {
      for (const d in recurringByTherapist[t]) {
        recurringCount += recurringByTherapist[t][d].length;
      }
    }

    return {
      totalScheduledDays: scheduled,
      totalAvailableDays: avail,
      totalLeaveDays: scheduled - avail,
      totalRecurringSessionsInClinic: recurringCount,
    };
  }, [filteredTherapists, activeDisplayDays, availabilityRecords, recurringByTherapist]);

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

      {/* ── Top Header & Navigation ───────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text, #1a1a2e)" }}>
              📅 Clinic Availability & Monthly Roster
            </h2>
            <Badge tone="teal">Pure Month Calendar</Badge>
            <Badge tone="green">WhatsApp Bot &amp; Recurring Synced</Badge>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #64748b)" }}>
            Full calendar month schedule for all clinic therapists. Live linked with Recurring Slot reservations &amp; WhatsApp Bot booking rules.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* View Switcher */}
          <div style={{ display: "flex", background: "var(--surface-2, #f1f5f9)", padding: 3, borderRadius: 8, border: "1px solid var(--line, #e2e8f0)" }}>
            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: activeView === "calendar" ? "var(--accent, #0284c7)" : "transparent",
                color: activeView === "calendar" ? "#fff" : "var(--text, #334155)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              📅 Month Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveView("matrix")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: activeView === "matrix" ? "var(--accent, #0284c7)" : "transparent",
                color: activeView === "matrix" ? "#fff" : "var(--text, #334155)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              📋 All Therapists Matrix
            </button>
          </div>

          <Button variant="secondary" onClick={loadData}>
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* ── Month Navigation Bar ──────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: 12,
          padding: "12px 18px",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isAtMinMonth}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--line, #cbd5e1)",
                background: isAtMinMonth ? "#f1f5f9" : "var(--surface-2, #f8fafc)",
                cursor: isAtMinMonth ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                opacity: isAtMinMonth ? 0.4 : 1,
              }}
              title={isAtMinMonth ? "Current month is start point" : "Previous Month"}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--line, #cbd5e1)",
                background: "var(--surface-2, #f8fafc)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isAtMaxMonth}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--line, #cbd5e1)",
                background: isAtMaxMonth ? "#f1f5f9" : "var(--surface-2, #f8fafc)",
                cursor: isAtMaxMonth ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                opacity: isAtMaxMonth ? 0.4 : 1,
              }}
              title={isAtMaxMonth ? "Maximum +5 months limit reached" : "Next Month"}
            >
              Next ▶
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1.5px solid var(--accent, #0284c7)",
                background: "#f0f9ff",
                color: "#0369a1",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((offset) => {
                const d = new Date(minYear, minMonth, 1);
                d.setMonth(d.getMonth() + offset);
                const y = d.getFullYear();
                const m = d.getMonth();
                return (
                  <option key={`${y}-${m}`} value={`${y}-${m}`}>
                    {MONTH_NAMES[m]} {y} {offset === 0 ? "📍 (Current Month)" : `(+${offset} mo)`}
                  </option>
                );
              })}
            </select>
            <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
              + Next: <strong>{MONTH_NAMES[nextMonthNum]} {nextMonthYear}</strong>
            </span>
          </div>
        </div>

        {/* Month View Mode Switcher: Current / Next / Dual */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--surface-2, #f1f5f9)", padding: 3, borderRadius: 8, border: "1px solid var(--line, #e2e8f0)" }}>
            <button
              type="button"
              onClick={() => setMonthViewMode("current")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: monthViewMode === "current" ? "var(--accent, #0284c7)" : "transparent",
                color: monthViewMode === "current" ? "#fff" : "var(--text, #334155)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📅 {MONTH_NAMES[selectedMonth].slice(0, 3)} (Current)
            </button>
            <button
              type="button"
              onClick={() => setMonthViewMode("next")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: monthViewMode === "next" ? "var(--accent, #0284c7)" : "transparent",
                color: monthViewMode === "next" ? "#fff" : "var(--text, #334155)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📅 {MONTH_NAMES[nextMonthNum].slice(0, 3)} (Next Month)
            </button>
            <button
              type="button"
              onClick={() => setMonthViewMode("dual")}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: monthViewMode === "dual" ? "var(--accent, #0284c7)" : "transparent",
                color: monthViewMode === "dual" ? "#fff" : "var(--text, #334155)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              👥 Dual Month View (Both)
            </button>
          </div>

          {/* Quick Month Selector Dropdown */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #cbd5e1)", background: "var(--surface, #fff)", fontWeight: 600, fontSize: 13 }}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line, #cbd5e1)", background: "var(--surface, #fff)", fontWeight: 600, fontSize: 13 }}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatCard label="Clinic Therapists" value={filteredTherapists.length} hint="Active roster" />
        <StatCard label="Monthly Shifts" value={totalScheduledDays} hint="Scheduled working days" />
        <StatCard label="Available Shifts" value={totalAvailableDays} hint="Open for booking" />
        <StatCard label="Leaves / Marked Off" value={totalLeaveDays} hint="Blocked from bot" />
        <StatCard label="Recurring Slots Active" value={totalRecurringSessionsInClinic} hint="Prescribed routines / week" />
      </div>

      {/* ── VIEW 1: THERAPIST FULL MONTH CALENDAR VIEW (RECOMMENDED) ── */}
      {activeView === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Therapist Pills Bar */}
          <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--line, #e2e8f0)", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #1e293b)" }}>
                Step 1: Choose Therapist to inspect their full month calendar &amp; recurring client routine:
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted, #64748b)" }}>
                🟢 Click any working day to toggle Available vs Leave
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 130, overflowY: "auto", padding: "2px 0" }}>
              {filteredTherapists.map((t) => {
                const isSelected = t.therapistName === selectedTherapistName;
                const cleanT = t.therapistName.replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
                let recurringSessionsCount = 0;
                for (const d in recurringByTherapist[cleanT] || {}) {
                  recurringSessionsCount += (recurringByTherapist[cleanT][d] || []).length;
                }

                // Count available days in active view
                let availThisMonth = 0;
                activeDisplayDays.forEach((d) => {
                  if (!d.isSunday && isTherapistScheduledWorking(t.therapistName, d.iso, d.dayOfWeek, liveTherapists)) {
                    if (isAvailable(t.therapistName, t.department, d.iso, d.isSunday)) {
                      availThisMonth++;
                    }
                  }
                });

                return (
                  <button
                    key={t.therapistName}
                    type="button"
                    onClick={() => setSelectedTherapistName(t.therapistName)}
                    className={`therapist-pill ${isSelected ? "is-active" : ""}`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: isSelected ? "2px solid var(--accent, #0284c7)" : "1px solid var(--line, #e2e8f0)",
                      background: isSelected ? "var(--accent, #0284c7)" : "var(--surface, #fff)",
                      color: isSelected ? "#fff" : "var(--text, #1e293b)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{t.therapistName}</span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: isSelected ? "rgba(255,255,255,0.25)" : "var(--surface-2, #f1f5f9)",
                        color: isSelected ? "#fff" : "var(--muted, #64748b)",
                        fontWeight: 700,
                      }}
                    >
                      {t.department.split(" ")[0]}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isSelected ? "#fff" : "#059669" }}>
                      🟢 {availThisMonth}d
                    </span>
                    {recurringSessionsCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: isSelected ? "#fff" : "#7c3aed" }}>
                        • {recurringSessionsCount} slots
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Therapist Overview Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--surface-2, #f8fafc)",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: 12,
              padding: "10px 16px",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text, #1e293b)" }}>
                👤 {currentTherapistObj.therapistName}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>• {currentTherapistObj.role}</span>
              <Badge tone="blue">{currentTherapistObj.department}</Badge>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "#fff",
                  border: "1px solid var(--line, #cbd5e1)",
                  color: "#334155",
                }}
              >
                🕒 Shift: {getTherapistShiftWindow(currentTherapistObj.therapistName, liveTherapists)}
              </span>
              <button
                type="button"
                onClick={() => openShiftModalForTherapist(currentTherapistObj.therapistName)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  cursor: "pointer",
                }}
                title="Edit working days, Saturdays off, and working hours for this therapist"
              >
                ⚙️ Shift Settings
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                Active:
              </span>
              <Badge tone="blue">{MONTH_NAMES[selectedMonth]} {selectedYear}</Badge>
              <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>&amp;</span>
              <Badge tone="purple">{MONTH_NAMES[nextMonthNum]} {nextMonthYear} (Next Month)</Badge>
            </div>
          </div>

          {/* ── 7-Day Monthly Calendar Grid(s) ─────────────────── */}
          {(() => {
            const renderCalendarGrid = (daysList, monthTitle, startOffset, isNextMonth) => {
              return (
                <div
                  key={monthTitle}
                  style={{
                    background: "var(--surface, #fff)",
                    border: isNextMonth ? "2px solid #d8b4fe" : "1px solid var(--line, #e2e8f0)",
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Month Header Banner */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 18px",
                      background: isNextMonth ? "#faf5ff" : "#f0f9ff",
                      borderBottom: "1px solid var(--line, #e2e8f0)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: isNextMonth ? "#6b21a8" : "#0369a1" }}>
                        📅 {monthTitle}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                        ({daysList.length} Days)
                      </span>
                      {isNextMonth ? (
                        <Badge tone="purple">NEXT MONTH</Badge>
                      ) : (
                        <Badge tone="blue">CURRENT MONTH</Badge>
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, color: isNextMonth ? "#7c3aed" : "var(--muted, #64748b)", fontWeight: 600 }}>
                      {isNextMonth ? "🔮 Advance Planning & Next Month Booking Roster" : "⚡ Live Clinic Operations"}
                    </span>
                  </div>

                  {/* Weekday Header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      background: "var(--surface-2, #f8fafc)",
                      borderBottom: "2px solid var(--line, #e2e8f0)",
                      textAlign: "center",
                    }}
                  >
                    {["SUN (Closed)", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dName, idx) => (
                      <div
                        key={dName}
                        style={{
                          padding: "10px 6px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: idx === 0 ? "#94a3b8" : "var(--text, #475569)",
                          letterSpacing: 0.5,
                        }}
                      >
                        {dName}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Matrix */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gridAutoRows: "minmax(125px, auto)",
                      gap: 1,
                      background: "var(--line, #e2e8f0)",
                    }}
                  >
                    {/* Leading Empty Cells */}
                    {Array.from({ length: startOffset }).map((_, idx) => (
                      <div key={`lead-${idx}`} style={{ background: "#f8fafc", opacity: 0.5 }} />
                    ))}

                    {/* Month Day Cells */}
                    {daysList.map((day) => {
                      const isScheduled = isTherapistScheduledWorking(currentTherapistObj.therapistName, day.iso, day.dayOfWeek, liveTherapists);
                      const available = isAvailable(currentTherapistObj.therapistName, currentTherapistObj.department, day.iso, day.isSunday, isScheduled);
                      const isSpecialShift = (day.isSunday || !isScheduled) && available;
                      const recurringSessions = getDayRecurringSessions(currentTherapistObj.therapistName, day.dayOfWeekFull);
                      const isUpdating = updatingKey === `${currentTherapistObj.therapistName}-${day.iso}`;

                      return (
                        <div
                          key={day.iso}
                          onClick={() =>
                            setSelectedDayDetails({
                              day,
                              therapist: currentTherapistObj,
                              available,
                              isScheduled,
                              recurringSessions,
                            })
                          }
                          style={{
                            background: day.isToday ? "#f0f9ff" : isSpecialShift ? "#faf5ff" : "#ffffff",
                            padding: "8px 9px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "background 0.15s",
                            position: "relative",
                            border: day.isToday ? "2px solid var(--accent, #0284c7)" : isSpecialShift ? "1.5px dashed #8b5cf6" : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!day.isToday) e.currentTarget.style.background = isSpecialShift ? "#f3e8ff" : "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            if (!day.isToday) e.currentTarget.style.background = isSpecialShift ? "#faf5ff" : "#ffffff";
                          }}
                        >
                          {/* Day Top: Date Number & Indicators */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: day.isToday ? "var(--accent, #0284c7)" : day.isSunday ? "#94a3b8" : "var(--text, #1e293b)",
                                }}
                              >
                                {day.d}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--muted, #64748b)" }}>
                                {day.monthStr}
                              </span>
                            </div>
                            {day.isToday && (
                              <span style={{ fontSize: 9.5, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "var(--accent, #0284c7)", color: "#fff" }}>
                                TODAY
                              </span>
                            )}
                            {isSpecialShift && (
                              <span style={{ fontSize: 9.5, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "#8b5cf6", color: "#fff" }}>
                                OPEN
                              </span>
                            )}
                          </div>

                          {/* Day Middle: Status / Shift / Toggle */}
                          <div style={{ marginBottom: 6 }}>
                            {day.isSunday && !available ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => handleToggle(currentTherapistObj, day, e)}
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "1px dashed #94a3b8",
                                  background: "#f8fafc",
                                  color: "#64748b",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 3,
                                  opacity: isUpdating ? 0.6 : 1,
                                }}
                                title="Sunday closed - Click to Open Special Shift for Bookings"
                              >
                                <span>🔒 Sun</span>
                                <span style={{ fontWeight: 800, color: "#0284c7" }}>+ Open</span>
                              </button>
                            ) : !isScheduled && !available ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => handleToggle(currentTherapistObj, day, e)}
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  border: "1px dashed #f59e0b",
                                  background: "#fffbeb",
                                  color: "#b45309",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 3,
                                  opacity: isUpdating ? 0.6 : 1,
                                }}
                                title="Weekly off - Click to Open Special Shift for Bookings"
                              >
                                <span>☕ Off</span>
                                <span style={{ fontWeight: 800, color: "#d97706" }}>+ Open</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => handleToggle(currentTherapistObj, day, e)}
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  border: isSpecialShift
                                    ? "1px solid #8b5cf6"
                                    : available
                                    ? "1px solid #10b981"
                                    : "1px solid #ef4444",
                                  background: isSpecialShift
                                    ? "#f5f3ff"
                                    : available
                                    ? "#ecfdf5"
                                    : "#fef2f2",
                                  color: isSpecialShift
                                    ? "#6d28d9"
                                    : available
                                    ? "#059669"
                                    : "#dc2626",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                  opacity: isUpdating ? 0.6 : 1,
                                }}
                                title={
                                  isSpecialShift
                                    ? "Special shift is ACTIVE and open for user bookings (Click to Close)"
                                    : available
                                    ? "Click to mark On Leave"
                                    : "Click to mark Available"
                                }
                              >
                                <span>{isSpecialShift ? "✨" : available ? "●" : "✕"}</span>
                                <span>
                                  {isSpecialShift
                                    ? "Open (Special)"
                                    : available
                                    ? "Available"
                                    : "Not Available"}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Day Bottom: Recurring Slot Reservations */}
                          <div style={{ minHeight: 32 }}>
                            {recurringSessions.length > 0 ? (
                              <div>
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: "#6b21a8",
                                    background: "rgba(147, 51, 234, 0.08)",
                                    padding: "2px 5px",
                                    borderRadius: 4,
                                    marginBottom: 3,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <span>👥 {recurringSessions.length} Recurring</span>
                                  <span style={{ fontSize: 9.5 }}>View →</span>
                                </div>
                                {/* Mini previews */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {recurringSessions.slice(0, 2).map((s, sIdx) => (
                                    <div
                                      key={sIdx}
                                      style={{
                                        fontSize: 10,
                                        color: "var(--text, #334155)",
                                        background: "#f1f5f9",
                                        padding: "1px 4px",
                                        borderRadius: 3,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                      title={`${s.startTime} - ${s.childName} (${s.therapyName})`}
                                    >
                                      <strong>{s.startTime}</strong> {s.childName}
                                    </div>
                                  ))}
                                  {recurringSessions.length > 2 && (
                                    <span style={{ fontSize: 9.5, color: "var(--muted, #64748b)" }}>
                                      +{recurringSessions.length - 2} more...
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : isScheduled && available ? (
                              <div style={{ fontSize: 10, color: "#059669", fontWeight: 600 }}>
                                ✓ All Slots Free
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Trailing Empty Cells */}
                    {Array.from({ length: (7 - ((startOffset + daysList.length) % 7)) % 7 }).map((_, idx) => (
                      <div key={`trail-${idx}`} style={{ background: "#f8fafc", opacity: 0.5 }} />
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {(monthViewMode === "dual" || monthViewMode === "current") &&
                  renderCalendarGrid(
                    currentMonthDays,
                    `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
                    firstDayOfWeekCurrent,
                    false
                  )}

                {(monthViewMode === "dual" || monthViewMode === "next") &&
                  renderCalendarGrid(
                    nextMonthDays,
                    `${MONTH_NAMES[nextMonthNum]} ${nextMonthYear}`,
                    firstDayOfWeekNext,
                    true
                  )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VIEW 2: CLINIC MASTER MONTH MATRIX SPREADSHEET ── */}
      {activeView === "matrix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Department Filter Tabs */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {DEPARTMENT_FILTERS.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDeptFilter(dept)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: selectedDeptFilter === dept ? "1px solid var(--accent, #0284c7)" : "1px solid var(--line, #e2e8f0)",
                  background: selectedDeptFilter === dept ? "var(--accent-soft, #e0f2fe)" : "var(--surface, #ffffff)",
                  color: selectedDeptFilter === dept ? "var(--accent, #0284c7)" : "var(--text, #475569)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Scrollable Month Matrix Table */}
          <div
            style={{
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: 12,
              overflowX: "auto",
              background: "var(--surface, #ffffff)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #f8fafc)", textAlign: "left" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--muted, #64748b)",
                      textTransform: "uppercase",
                      borderBottom: "2px solid var(--line, #e2e8f0)",
                      position: "sticky",
                      left: 0,
                      background: "var(--surface-2, #f8fafc)",
                      zIndex: 3,
                      minWidth: 240,
                    }}
                  >
                    Therapist &amp; Role
                  </th>
                  {activeDisplayDays.map((day) => (
                    <th
                      key={day.iso}
                      style={{
                        padding: "10px 12px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: day.isSunday ? "#94a3b8" : "var(--text, #475569)",
                        borderBottom: "2px solid var(--line, #e2e8f0)",
                        textAlign: "center",
                        minWidth: 105,
                        background: day.isToday ? "#e0f2fe" : day.isSunday ? "#f8fafc" : undefined,
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--muted, #64748b)" }}>{day.monthStr}</div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{day.d}</div>
                      <div>{day.weekdayStr}</div>
                      {day.isToday && <span style={{ fontSize: 9, color: "var(--accent, #0284c7)", fontWeight: 800 }}>TODAY</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTherapists.map((therapist, idx) => (
                  <tr
                    key={therapist.therapistName}
                    style={{
                      borderBottom: "1px solid var(--line, #f1f5f9)",
                      background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                    }}
                  >
                    {/* Sticky Therapist Name Column */}
                    <td
                      style={{
                        padding: "12px 16px",
                        position: "sticky",
                        left: 0,
                        background: idx % 2 === 0 ? "#ffffff" : "#fafbfc",
                        zIndex: 2,
                        borderRight: "1px solid var(--line, #e2e8f0)",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--text, #1e293b)", fontSize: 13.5 }}>
                        {therapist.therapistName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
                        {therapist.department}
                      </div>
                    </td>

                    {/* Cells for all active days */}
                    {activeDisplayDays.map((day) => {
                      const isScheduled = isTherapistScheduledWorking(therapist.therapistName, day.iso, day.dayOfWeek, liveTherapists);
                      const available = isAvailable(therapist.therapistName, therapist.department, day.iso, day.isSunday, isScheduled);
                      const isSpecialShift = (day.isSunday || !isScheduled) && available;
                      const recurringSessions = getDayRecurringSessions(therapist.therapistName, day.dayOfWeekFull);
                      const key = `${therapist.therapistName}-${day.iso}`;
                      const isUpdating = updatingKey === key;

                      if (day.isSunday && !available) {
                        return (
                          <td key={day.iso} style={{ padding: "6px 4px", textAlign: "center", background: "#f8fafc" }}>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={(e) => handleToggle(therapist, day, e)}
                              style={{
                                width: "100%",
                                padding: "4px 3px",
                                borderRadius: 5,
                                fontSize: 9.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px dashed #94a3b8",
                                background: "#ffffff",
                                color: "#64748b",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                              title="Sunday closed - Click to Open Special Shift"
                            >
                              + Sun
                            </button>
                          </td>
                        );
                      }

                      if (!isScheduled && !available) {
                        return (
                          <td key={day.iso} style={{ padding: "6px 4px", textAlign: "center" }}>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={(e) => handleToggle(therapist, day, e)}
                              style={{
                                width: "100%",
                                padding: "4px 3px",
                                borderRadius: 5,
                                fontSize: 9.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px dashed #f59e0b",
                                background: "#fffbeb",
                                color: "#b45309",
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                              title="Weekly off - Click to Open Special Shift"
                            >
                              + Off
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={day.iso} style={{ padding: "8px 6px", textAlign: "center", background: isSpecialShift ? "#faf5ff" : undefined }}>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={(e) => handleToggle(therapist, day, e)}
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: 6,
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              border: isSpecialShift
                                ? "1px solid #8b5cf6"
                                : available
                                ? "1px solid #10b981"
                                : "1px solid #ef4444",
                              background: isSpecialShift
                                ? "#f5f3ff"
                                : available
                                ? "#ecfdf5"
                                : "#fef2f2",
                              color: isSpecialShift
                                ? "#6d28d9"
                                : available
                                ? "#059669"
                                : "#dc2626",
                              opacity: isUpdating ? 0.6 : 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 1,
                            }}
                            title={
                              isSpecialShift
                                ? "Special shift is ACTIVE (Click to Close)"
                                : available
                                ? "Available (Click to Mark Off)"
                                : "Off (Click to Mark Available)"
                            }
                          >
                            <span>{isSpecialShift ? "✨ Special" : available ? "● Avail" : "✕ Off"}</span>
                            {recurringSessions.length > 0 && (
                              <span style={{ fontSize: 9.5, color: "#7c3aed", fontWeight: 800 }}>
                                {recurringSessions.length} slots
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Day Details & Recurring Slot Breakdown Modal ── */}
      {selectedDayDetails && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedDayDetails(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 600,
              width: "92%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                    📅 {selectedDayDetails.day.display} ({selectedDayDetails.day.iso})
                  </h3>
                  {selectedDayDetails.day.isToday && <Badge tone="blue">TODAY</Badge>}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  Therapist: <strong>{selectedDayDetails.therapist.therapistName}</strong> ({selectedDayDetails.therapist.department})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Shift & Working Status Card */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Official Shift Window:</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                    🕒 {getTherapistShiftWindow(selectedDayDetails.therapist.therapistName, liveTherapists)}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleToggle(selectedDayDetails.therapist, selectedDayDetails.day, e);
                      setSelectedDayDetails((prev) => ({
                        ...prev,
                        available: !prev.available,
                      }));
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: selectedDayDetails.available
                        ? (selectedDayDetails.day.isSunday || !selectedDayDetails.isScheduled ? "1px solid #8b5cf6" : "1px solid #10b981")
                        : "1px solid #ef4444",
                      background: selectedDayDetails.available
                        ? (selectedDayDetails.day.isSunday || !selectedDayDetails.isScheduled ? "#f5f3ff" : "#ecfdf5")
                        : "#fef2f2",
                      color: selectedDayDetails.available
                        ? (selectedDayDetails.day.isSunday || !selectedDayDetails.isScheduled ? "#6d28d9" : "#059669")
                        : "#dc2626",
                    }}
                  >
                    {selectedDayDetails.available
                      ? (selectedDayDetails.day.isSunday || !selectedDayDetails.isScheduled
                          ? "✨ Special Shift: Active & Open (Click to Close)"
                          : "● Status: Available (Click to Mark Off)")
                      : (selectedDayDetails.day.isSunday || !selectedDayDetails.isScheduled
                          ? "🔒 Closed / Off — Click to + Open Special Shift"
                          : "✕ Status: On Leave (Click to Mark Available)")}
                  </button>
                </div>
              </div>
            </div>

            {/* Recurring Slot Appointments on this Day */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                  👥 Prescribed Recurring Routine Sessions ({selectedDayDetails.recurringSessions.length}):
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>Every {selectedDayDetails.day.dayOfWeekFull}</span>
              </div>

              {selectedDayDetails.recurringSessions.length === 0 ? (
                <div style={{ background: "#ecfdf5", border: "1px dashed #10b981", borderRadius: 10, padding: 14, textAlign: "center", color: "#059669", fontSize: 13 }}>
                  ✓ No recurring routines booked on this day yet. All working hours are open for new bookings!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedDayDetails.recurringSessions.map((session, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{session.childName}</span>
                          <span style={{ fontWeight: 500, color: "#64748b", fontSize: 12 }}>({session.parentPhone})</span>
                          {session.slotType === "School" ? (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#b45309", border: "1px solid #f59e0b", padding: "1px 6px", borderRadius: 4 }}>
                              🏫 School Hold (Hidden from WA)
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "1px 6px", borderRadius: 4 }}>
                              🌐 OTA
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginTop: 2 }}>
                          {session.therapyName}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0284c7", background: "#e0f2fe", padding: "3px 8px", borderRadius: 6 }}>
                          ⏰ {session.startTime} - {session.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Booking Slots Status */}
            <div style={{ marginTop: 16, background: selectedDayDetails.available ? "#f0fdf4" : "#fef2f2", border: selectedDayDetails.available ? "1px solid #bbf7d0" : "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: selectedDayDetails.available ? "#15803d" : "#b91c1c" }}>
                  {selectedDayDetails.available
                    ? "🟢 Date is OPEN for WhatsApp, Online & Admin Bookings"
                    : "🔒 Date is CLOSED — No appointments can be booked on this date"}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: selectedDayDetails.available ? "#166534" : "#991b1b" }}>
                  {selectedDayDetails.available ? "Active Slots Ready" : "Click button above to + Open"}
                </span>
              </div>
              {selectedDayDetails.available && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {["10:00", "10:45", "11:30", "12:15", "13:30", "14:15", "15:00", "15:45"].map((time) => {
                    const isOccupiedByRoutine = (selectedDayDetails.recurringSessions || []).some(
                      (s) => s.startTime === time || s.start_time === time
                    );
                    return (
                      <span
                        key={time}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: isOccupiedByRoutine ? "#fef3c7" : "#ffffff",
                          border: isOccupiedByRoutine ? "1px solid #f59e0b" : "1px solid #86efac",
                          color: isOccupiedByRoutine ? "#b45309" : "#15803d",
                        }}
                        title={isOccupiedByRoutine ? `Booked for recurring routine session at ${time}` : `Available for booking at ${time}`}
                      >
                        {time} {isOccupiedByRoutine ? "🔒 Routine" : "✓ Open"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
              <Button onClick={() => setSelectedDayDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Therapist Shift & Working Days Modal */}
      {shiftModalTherapist && (
        <TherapistShiftModal
          therapist={shiftModalTherapist}
          onClose={() => setShiftModalTherapist(null)}
          onSave={handleSaveShiftModal}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import Badge from "./Badge";
import Button from "./Button";
import StatCard from "./StatCard";
import {
  getSchedules,
  createSchedule,
  patchSchedule,
  deleteSchedule,
  bulkUploadSchedules,
  getAvailableSlots,
  verifyParentPhone,
  confirmWeeklySchedule,
  getAvailability,
} from "../services/adminApi";
import {
  CLINIC_THERAPISTS_ROSTER,
  getTherapistShiftWindow,
  isTherapistScheduledWorking,
} from "./AvailabilityManagerPage";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_NAME_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Sourced dynamically from Availability Manager official roster
export const THERAPISTS = CLINIC_THERAPISTS_ROSTER.map((t) => t.therapistName);

export const THERAPY_TYPES = [
  "Occupational Therapy",
  "Speech Therapy",
  "Physiotherapy",
  "Physical Therapy",
  "Special Education",
  "Special Educator",
  "Child and Parental Counselling",
  "Counselling",
  "Remedial & Academic Support",
];

// Sourced dynamically from Availability Manager official departments
export const THERAPIST_DEFAULT_DISCIPLINE = CLINIC_THERAPISTS_ROSTER.reduce((acc, t) => {
  const primaryDept = t.departments ? t.departments[0] : t.department;
  if (primaryDept === "OT") acc[t.therapistName] = "Occupational Therapy";
  else if (primaryDept === "Special Educator") acc[t.therapistName] = "Special Education";
  else acc[t.therapistName] = primaryDept;
  return acc;
}, {});

function getDefaultDiscipline(therapistId) {
  if (!therapistId) return THERAPY_TYPES[0];
  const tClean = therapistId.trim().toLowerCase();
  const match = Object.entries(THERAPIST_DEFAULT_DISCIPLINE).find(([t]) =>
    t.toLowerCase() === tClean || tClean.includes(t.toLowerCase()) || t.toLowerCase().includes(tClean)
  );
  return match ? match[1] : THERAPY_TYPES[0];
}

export function getTherapyStyle(therapyName = "") {
  const t = String(therapyName).toLowerCase();
  if (t.includes("occupational") || t.includes("ot")) {
    return {
      bg: "#ecfdf5",
      border: "#a7f3d0",
      text: "#065f46",
      tagBg: "#d1fae5",
      tagText: "#047857",
      icon: "🧘",
      label: "OT",
    };
  }
  if (t.includes("speech")) {
    return {
      bg: "#f5f3ff",
      border: "#ddd6fe",
      text: "#5b21b6",
      tagBg: "#ede9fe",
      tagText: "#6d28d9",
      icon: "🗣️",
      label: "Speech",
    };
  }
  if (t.includes("physio") || t.includes("physical")) {
    return {
      bg: "#eff6ff",
      border: "#bfdbfe",
      text: "#1e40af",
      tagBg: "#dbeafe",
      tagText: "#1d4ed8",
      icon: "🏃",
      label: "Physio",
    };
  }
  if (t.includes("special") || t.includes("academic") || t.includes("remedial")) {
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#92400e",
      tagBg: "#fef3c7",
      tagText: "#b45309",
      icon: "📚",
      label: "Special Ed",
    };
  }
  if (t.includes("counsel") || t.includes("parental")) {
    return {
      bg: "#fff1f2",
      border: "#fecdd3",
      text: "#9f1239",
      tagBg: "#ffe4e6",
      tagText: "#be123c",
      icon: "💬",
      label: "Counselling",
    };
  }
  return {
    bg: "#f8fafc",
    border: "#e2e8f0",
    text: "#334155",
    tagBg: "#f1f5f9",
    tagText: "#475569",
    icon: "🩺",
    label: "Therapy",
  };
}

export function getAvatarGradient(name = "") {
  const colors = [
    "linear-gradient(135deg, #0284c7, #2563eb)",
    "linear-gradient(135deg, #7c3aed, #9333ea)",
    "linear-gradient(135deg, #059669, #10b981)",
    "linear-gradient(135deg, #d97706, #f59e0b)",
    "linear-gradient(135deg, #e11d48, #f43f5e)",
    "linear-gradient(135deg, #0891b2, #06b6d4)",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
}


const STANDARD_TIMES = [
  "10:00",
  "10:45",
  "11:30",
  "12:15",
  "13:30",
  "14:15",
  "15:00",
  "15:45",
  "16:30",
  "17:15",
];

function calculateEndTime(startTime) {
  if (!startTime || !startTime.includes(":")) return "10:45";
  const [hStr, mStr] = startTime.split(":");
  const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 45;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function RecurringSlotsPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCell, setSavingCell] = useState(null); // { id, field }
  const [saveSuccess, setSaveSuccess] = useState(null); // { id, field }

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTherapist, setFilterTherapist] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // Inline editing active cell tracker: { id, field }
  const [editingCell, setEditingCell] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const editInputRef = useRef(null);

  // New row inline creation (multi-session clinical routine)
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    child_name: "",
    parent_phone: "",
    recurring_slots: [
      {
        day_of_week: "Monday",
        start_time: "10:00",
        end_time: "10:45",
        therapy_name: "Occupational Therapy",
        therapist_id: THERAPISTS[0],
      },
    ],
    status: "ACTIVE",
    notes: "",
  });

  // Track expanded rows for inline session slot manager
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());
  const toggleRowExpanded = (id) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Dedicated Clinical Session Management Modal
  const [sessionModal, setSessionModal] = useState(null); // { schedule, slots: [] }
  const [modalTab, setModalTab] = useState("picker"); // "picker" (visual matrix) or "table" (session list)
  const [modalPickerTherapist, setModalPickerTherapist] = useState(THERAPISTS[0]);
  const [modalPickerTherapy, setModalPickerTherapy] = useState(THERAPIST_DEFAULT_DISCIPLINE[THERAPISTS[0]] || THERAPY_TYPES[0]);

  // Tab per expanded row: { [id]: "picker" | "table" }
  const [expandedRowTabs, setExpandedRowTabs] = useState({});
  const [expandedRowTherapists, setExpandedRowTherapists] = useState({});

  // Global Therapist Weekly Availability Roster Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTherapist, setRosterTherapist] = useState(THERAPISTS[0]);

  const openSessionModal = (schedule) => {
    const rawSlots = schedule.recurring_slots || schedule.sessions || [];
    const normalized = rawSlots.map((s) => ({
      day_of_week: s.day_of_week || s.dayOfWeek || "Monday",
      start_time: s.start_time || s.startTime || "10:00",
      end_time: s.end_time || s.endTime || calculateEndTime(s.start_time || s.startTime || "10:00"),
      therapy_name: s.therapy_name || s.therapy_type || s.sessionName || schedule.therapy_type || getDefaultDiscipline(s.therapist_id || schedule.therapist_id),
      therapist_id: s.therapist_id || s.therapistId || schedule.therapist_id || THERAPISTS[0],
    }));
    const initialTherapist = normalized[0]?.therapist_id || schedule.therapist_id || THERAPISTS[0];
    setSessionModal({
      schedule,
      slots: normalized.length > 0 ? normalized : [
        {
          day_of_week: "Monday",
          start_time: "10:00",
          end_time: "10:45",
          therapy_name: schedule.therapy_type || getDefaultDiscipline(initialTherapist),
          therapist_id: initialTherapist,
        },
      ],
    });
    setModalTab("picker");
    setModalPickerTherapist(initialTherapist);
    setModalPickerTherapy(getDefaultDiscipline(initialTherapist));
  };

  const closeSessionModal = () => {
    setSessionModal(null);
  };

  // Bulk CSV Upload Drawer
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkParseError, setBulkParseError] = useState("");
  const [bulkParsedRows, setBulkParsedRows] = useState([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Slot Inspector / WhatsApp Bot Simulation Tool
  const [showBotSimulator, setShowBotSimulator] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [botTestResult, setBotTestResult] = useState(null);
  const [botTesting, setBotTesting] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);

  // Anti-collision Slot Inspector
  const [showSlotInspector, setShowSlotInspector] = useState(false);
  const [inspectorDate, setInspectorDate] = useState(() => {
    const today = new Date();
    // next day format YYYY-MM-DD
    return today.toISOString().split("T")[0];
  });
  const [inspectorTherapist, setInspectorTherapist] = useState(THERAPISTS[0]);
  const [slotInspectResult, setSlotInspectResult] = useState(null);
  const [slotInspectLoading, setSlotInspectLoading] = useState(false);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);

  // Load schedules and live availability from Availability Manager
  const fetchSchedules = async () => {
    setLoading(true);
    setError("");
    try {
      const [res, availData] = await Promise.all([
        getSchedules(),
        getAvailability().catch(() => []),
      ]);
      const list = Array.isArray(res) ? res : res?.data || [];
      setSchedules(list);
      setAvailabilityRecords(Array.isArray(availData) ? availData : []);
    } catch (err) {
      setError(err?.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Focus input when editing cell opens
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Flash save success helper
  const triggerSaveSuccess = (id, field) => {
    setSaveSuccess({ id, field });
    setTimeout(() => {
      setSaveSuccess((curr) => (curr?.id === id && curr?.field === field ? null : curr));
    }, 1500);
  };

  // Direct cell update
  const handleCellSave = async (id, field, value) => {
    setEditingCell(null);
    const schedule = schedules.find((s) => String(s.id || s._id) === String(id));
    if (!schedule || schedule[field] === value) return;

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) => (String(s.id || s._id) === String(id) ? { ...s, [field]: value } : s))
    );

    setSavingCell({ id, field });
    try {
      await patchSchedule(id, { [field]: value });
      triggerSaveSuccess(id, field);
    } catch (err) {
      alert(`Save failed for ${field}: ${err.message}`);
      // Revert on error
      fetchSchedules();
    } finally {
      setSavingCell(null);
    }
  };

  // Status toggle
  const handleStatusToggle = async (schedule) => {
    const id = schedule.id || schedule._id;
    const nextStatus = schedule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

    setSchedules((prev) =>
      prev.map((s) => (String(s.id || s._id) === String(id) ? { ...s, status: nextStatus } : s))
    );

    setSavingCell({ id, field: "status" });
    try {
      await patchSchedule(id, { status: nextStatus });
      triggerSaveSuccess(id, "status");
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
      fetchSchedules();
    } finally {
      setSavingCell(null);
    }
  };

  // Recurring slots update with backend patch
  const handleSlotsUpdate = async (schedule, updatedSlots) => {
    const id = schedule.id || schedule._id;
    setSchedules((prev) =>
      prev.map((s) =>
        String(s.id || s._id) === String(id)
          ? { ...s, recurring_slots: updatedSlots, sessions: updatedSlots }
          : s
      )
    );

    setSavingCell({ id, field: "recurring_slots" });
    try {
      const res = await patchSchedule(id, { recurring_slots: updatedSlots, sessions: updatedSlots });
      if (res?.data) {
        setSchedules((prev) =>
          prev.map((s) => (String(s.id || s._id) === String(id) ? res.data : s))
        );
      }
      triggerSaveSuccess(id, "recurring_slots");
    } catch (err) {
      alert("Failed to save slots: " + (err.message || err));
      fetchSchedules();
    } finally {
      setSavingCell(null);
    }
  };

  // Helper: map of booked slots for a therapist across active children
  const getTherapistOccupiedSlots = (therapistId, excludeScheduleId) => {
    const tClean = String(therapistId || "").replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
    const map = {};
    for (const s of schedules) {
      if (s.status !== "ACTIVE") continue;
      const sId = String(s.id || s._id);
      if (excludeScheduleId && sId === String(excludeScheduleId)) continue;
      const slots = s.recurring_slots || s.sessions || [];
      for (const slot of slots) {
        const slotTherapist = String(slot.therapist_id || slot.therapistId || s.therapist_id || "").replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim().toLowerCase();
        if (slotTherapist && (slotTherapist === tClean || slotTherapist.includes(tClean) || tClean.includes(slotTherapist))) {
          map[`${slot.day_of_week || slot.dayOfWeek}_${slot.start_time || slot.startTime}`] = s.child_name;
        }
      }
    }
    return map;
  };

  // Helper: check slot availability status
  const getSlotAvailabilityStatus = (therapistId, day, time, excludeScheduleId) => {
    const occupiedMap = getTherapistOccupiedSlots(therapistId, excludeScheduleId);
    const bookedChild = occupiedMap[`${day}_${time}`];
    return {
      isAvailable: !bookedChild,
      bookedChild: bookedChild || null,
    };
  };

  // Helper: get weekly summary stats for a therapist
  const getTherapistWeekStats = (therapistId, excludeScheduleId) => {
    const occupiedMap = getTherapistOccupiedSlots(therapistId, excludeScheduleId);
    const total = DAYS_OF_WEEK.length * STANDARD_TIMES.length;
    const booked = Object.keys(occupiedMap).length;
    const available = Math.max(0, total - booked);
    return {
      total,
      booked,
      available,
      occupiedMap,
    };
  };

  // Toggle slot in modal via 1-click grid
  const handleToggleSlotInModal = (day, time, therapy, therapist) => {
    if (!sessionModal) return;
    const existingIndex = sessionModal.slots.findIndex(
      (s) =>
        (s.day_of_week === day || s.dayOfWeek === day) &&
        (s.start_time === time || s.startTime === time)
    );

    if (existingIndex >= 0) {
      setSessionModal((prev) => ({
        ...prev,
        slots: prev.slots.filter((_, idx) => idx !== existingIndex),
      }));
    } else {
      if (sessionModal.slots.length >= 25) {
        alert("Maximum 25 prescribed slots permitted per child.");
        return;
      }
      const newSlot = createDefaultSlot(
        day,
        time,
        therapy || modalPickerTherapy || getDefaultDiscipline(therapist),
        therapist || modalPickerTherapist || THERAPISTS[0]
      );
      setSessionModal((prev) => ({
        ...prev,
        slots: [...prev.slots, newSlot],
      }));
    }
  };

  // Toggle slot in row via 1-click grid
  const handleToggleSlotInRow = (schedule, day, time, therapy, therapist) => {
    const currentSlots = schedule.recurring_slots || schedule.sessions || [];
    const existingIndex = currentSlots.findIndex(
      (s) =>
        (s.day_of_week === day || s.dayOfWeek === day) &&
        (s.start_time === time || s.startTime === time)
    );

    if (existingIndex >= 0) {
      if (currentSlots.length <= 1) {
        alert("At least 1 recurring session is required. You can pause the schedule if inactive.");
        return;
      }
      const updated = currentSlots.filter((_, idx) => idx !== existingIndex);
      handleSlotsUpdate(schedule, updated);
    } else {
      if (currentSlots.length >= 25) {
        alert("Maximum 25 prescribed slots permitted per child.");
        return;
      }
      const newSlot = createDefaultSlot(
        day,
        time,
        therapy || getDefaultDiscipline(therapist),
        therapist || THERAPISTS[0]
      );
      handleSlotsUpdate(schedule, [...currentSlots, newSlot]);
    }
  };

  // Render Visual Weekly Availability Matrix for any therapist & child
  const renderWeeklyAvailabilityGrid = ({
    therapistId,
    discipline,
    onTherapistChange,
    onDisciplineChange,
    currentSlots,
    onToggleSlot,
    excludeScheduleId,
    childName,
  }) => {
    const stats = getTherapistWeekStats(therapistId, excludeScheduleId);
    const occupiedMap = stats.occupiedMap;

    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        {/* Step 1: Therapist Selector Bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
              Step 1: Choose Therapist to view their open slots:
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              🟢 Click green buttons in the calendar to assign slots instantly
            </span>
          </div>

          {/* Scrollable / Flex Wrap of Therapist Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 110, overflowY: "auto", padding: "2px 0" }}>
            {THERAPISTS.map((t) => {
              const isSelected = t === therapistId;
              const tStats = getTherapistWeekStats(t, excludeScheduleId);
              const defDept = getDefaultDiscipline(t).split(" ")[0];

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onTherapistChange(t);
                    if (onDisciplineChange) onDisciplineChange(getDefaultDiscipline(t));
                  }}
                  className={`therapist-pill ${isSelected ? "is-active" : ""}`}
                  title={`${t}: ${tStats.available} available / ${tStats.booked} booked`}
                >
                  <span>{t}</span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      borderRadius: 6,
                      background: isSelected ? "rgba(255,255,255,0.25)" : "var(--surface-2)",
                      color: isSelected ? "#fff" : "var(--muted)",
                      fontWeight: 700,
                    }}
                  >
                    {defDept}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: isSelected ? "#fff" : "#059669" }}>
                    🟢 {tStats.available} free
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Therapist Summary & Department Override */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "8px 14px",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)" }}>
              📅 {therapistId}'s Weekly Schedule
            </span>
            <Badge tone="teal">{stats.booked} Booked · {stats.available} Available Slots</Badge>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 6,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--muted)",
              }}
            >
              🕒 {getTherapistShiftWindow(therapistId)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Clinical Department:</span>
            <select
              value={discipline}
              onChange={(e) => onDisciplineChange && onDisciplineChange(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface)", fontSize: 12, fontWeight: 600 }}
            >
              {THERAPY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Weekly Matrix Calendar Grid */}
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)" }}>
                <th style={{ width: 95, padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontWeight: 700 }}>Time</th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d} style={{ padding: "8px 6px", fontWeight: 700 }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STANDARD_TIMES.map((time) => {
                const endTime = calculateEndTime(time);

                return (
                  <tr key={time} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--muted)", background: "var(--surface-2)", whiteSpace: "nowrap" }}>
                      {time} - {endTime}
                    </td>
                    {DAYS_OF_WEEK.map((day) => {
                      const dayIdx = DAY_NAME_TO_INDEX[day];
                      const isWorking = isTherapistScheduledWorking(therapistId, null, dayIdx);

                      if (!isWorking) {
                        return (
                          <td key={day} style={{ padding: "4px 5px", background: "rgba(0,0,0,0.015)" }}>
                            <div
                              style={{
                                width: "100%",
                                padding: "6px 2px",
                                borderRadius: 6,
                                background: "#fef3c7",
                                border: "1px dashed #f59e0b",
                                color: "#b45309",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 3,
                                cursor: "not-allowed",
                              }}
                              title={`${therapistId} is scheduled Weekly Off on ${day}s in Availability Manager.`}
                            >
                              <span>☕</span>
                              <span>Weekly Off</span>
                            </div>
                          </td>
                        );
                      }

                      const childSlot = (currentSlots || []).find(
                        (s) =>
                          (s.day_of_week === day || s.dayOfWeek === day) &&
                          (s.start_time === time || s.startTime === time)
                      );

                      const occupiedBy = occupiedMap[`${day}_${time}`];

                      if (childSlot) {
                        const isSameTherapist = String(childSlot.therapist_id || childSlot.therapistId || "").toLowerCase().includes(String(therapistId).toLowerCase()) ||
                          String(therapistId).toLowerCase().includes(String(childSlot.therapist_id || childSlot.therapistId || "").toLowerCase());

                        return (
                          <td key={day} style={{ padding: "4px 5px" }}>
                            <button
                              type="button"
                              className="selected-slot-chip"
                              onClick={() => onToggleSlot(day, time, discipline, therapistId)}
                              title="Click to remove from routine"
                              style={{
                                background: isSameTherapist ? "var(--accent-soft)" : "rgba(147, 51, 234, 0.12)",
                                borderColor: isSameTherapist ? "var(--accent)" : "#9333ea",
                                color: isSameTherapist ? "var(--accent)" : "#9333ea",
                              }}
                            >
                              ✓ {time} {isSameTherapist ? "" : `(${childSlot.therapist_id})`} ✕
                            </button>
                          </td>
                        );
                      }

                      if (occupiedBy) {
                        return (
                          <td key={day} style={{ padding: "4px 5px" }}>
                            <div
                              className="occupied-slot-chip"
                              title={`Conflict: ${therapistId} is booked on ${day} at ${time} with ${occupiedBy}`}
                              onClick={() => alert(`Conflict: Therapist "${therapistId}" is already booked on ${day} at ${time} for "${occupiedBy}".`)}
                            >
                              🔒 {occupiedBy.length > 9 ? `${occupiedBy.slice(0, 8)}…` : occupiedBy}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={day} style={{ padding: "4px 5px" }}>
                          <button
                            type="button"
                            className="availability-slot-btn"
                            onClick={() => onToggleSlot(day, time, discipline, therapistId)}
                            title={`Click to add ${day} ${time} with ${therapistId} (${discipline})`}
                          >
                            + Free ({time})
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

        {/* Selected Slots Tray for this child */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
              Prescribed Routine for {childName || "Child"} ({(currentSlots || []).length} Sessions / Week):
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Tip: Switch therapist above to add slots for other disciplines!
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 32, alignItems: "center" }}>
            {(currentSlots || []).map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--surface-2)",
                  border: "1px solid var(--accent)",
                  padding: "3px 8px",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <strong style={{ color: "var(--accent)" }}>{(s.day_of_week || s.dayOfWeek || "Mon").slice(0, 3)}</strong>
                <span>{s.start_time || s.startTime}</span>
                <span style={{ color: "var(--muted)" }}>•</span>
                <span>{(s.therapy_name || s.therapy_type || "Therapy").split(" ")[0]}</span>
                <span style={{ color: "var(--muted)" }}>•</span>
                <span style={{ color: "var(--text)" }}>{s.therapist_id || s.therapistId}</span>
                <button
                  type="button"
                  onClick={() => onToggleSlot(s.day_of_week || s.dayOfWeek, s.start_time || s.startTime, s.therapy_name, s.therapist_id)}
                  style={{ border: "none", background: "none", color: "var(--danger)", cursor: "pointer", padding: "0 2px", fontSize: 11 }}
                  title="Remove slot"
                >
                  ✕
                </button>
              </div>
            ))}
            {(!currentSlots || currentSlots.length === 0) && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>No sessions added yet. Click any green button in the calendar above to assign!</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper to get default clinical slot
  const createDefaultSlot = (day = "Monday", time = "10:00", therapy = THERAPY_TYPES[0], therapist = THERAPISTS[0]) => ({
    day_of_week: day,
    start_time: time,
    end_time: calculateEndTime(time),
    therapy_name: therapy,
    therapist_id: therapist,
  });

  // Add slot to child row inline
  const handleAddSlotToRow = (schedule) => {
    const currentSlots = schedule.recurring_slots || schedule.sessions || [];
    if (currentSlots.length >= 25) {
      alert("Maximum 25 prescribed slots permitted per child.");
      return;
    }
    const usedDays = currentSlots.map((s) => s.day_of_week || s.dayOfWeek);
    const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || currentSlots[currentSlots.length - 1]?.day_of_week || "Monday";
    const lastSlot = currentSlots[currentSlots.length - 1];
    const nextTime = "10:00";

    const nextSlots = [
      ...currentSlots,
      createDefaultSlot(
        nextDay,
        nextTime,
        lastSlot?.therapy_name || lastSlot?.therapy_type || schedule.therapy_type || THERAPY_TYPES[0],
        lastSlot?.therapist_id || lastSlot?.therapistId || schedule.therapist_id || THERAPISTS[0]
      ),
    ];
    handleSlotsUpdate(schedule, nextSlots);
  };

  // Remove slot from child row inline
  const handleRemoveSlotFromRow = (schedule, slotIndex) => {
    const currentSlots = schedule.recurring_slots || schedule.sessions || [];
    if (currentSlots.length <= 1) {
      alert("At least 1 recurring session is required. You can pause the schedule if inactive.");
      return;
    }
    const nextSlots = currentSlots.filter((_, idx) => idx !== slotIndex);
    handleSlotsUpdate(schedule, nextSlots);
  };

  // Modify individual slot in child row inline
  const handleSlotFieldChange = (schedule, slotIndex, subField, subVal) => {
    const currentSlots = [...(schedule.recurring_slots || schedule.sessions || [])];
    const target = { ...currentSlots[slotIndex] };
    target[subField] = subVal;
    if (subField === "start_time") {
      target.end_time = calculateEndTime(subVal);
    }
    currentSlots[slotIndex] = target;
    handleSlotsUpdate(schedule, currentSlots);
  };

  // Modal slot handlers
  const handleAddSlotInModal = (therapyPreset) => {
    if (!sessionModal) return;
    if (sessionModal.slots.length >= 25) {
      alert("Maximum 25 prescribed slots permitted per child.");
      return;
    }
    const usedDays = sessionModal.slots.map((s) => s.day_of_week || s.dayOfWeek);
    const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || "Monday";
    const lastSlot = sessionModal.slots[sessionModal.slots.length - 1];
    const newSlot = createDefaultSlot(
      nextDay,
      "10:00",
      therapyPreset || lastSlot?.therapy_name || sessionModal.schedule?.therapy_type || THERAPY_TYPES[0],
      lastSlot?.therapist_id || sessionModal.schedule?.therapist_id || THERAPISTS[0]
    );
    setSessionModal((prev) => ({
      ...prev,
      slots: [...prev.slots, newSlot],
    }));
  };

  const handleRemoveSlotInModal = (slotIndex) => {
    if (!sessionModal) return;
    if (sessionModal.slots.length <= 1) {
      alert("At least 1 recurring session is required.");
      return;
    }
    setSessionModal((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, idx) => idx !== slotIndex),
    }));
  };

  const handleModalSlotFieldChange = (slotIndex, subField, subVal) => {
    if (!sessionModal) return;
    const currentSlots = [...sessionModal.slots];
    const target = { ...currentSlots[slotIndex] };
    target[subField] = subVal;
    if (subField === "start_time") {
      target.end_time = calculateEndTime(subVal);
    }
    currentSlots[slotIndex] = target;
    setSessionModal((prev) => ({ ...prev, slots: currentSlots }));
  };

  const handleSaveModalSessions = async () => {
    if (!sessionModal) return;
    if (sessionModal.slots.length === 0) {
      alert("At least 1 recurring session is required.");
      return;
    }
    await handleSlotsUpdate(sessionModal.schedule, sessionModal.slots);
    setSessionModal(null);
  };

  // Delete row
  const handleDeleteRow = async (id, name) => {
    if (!window.confirm(`Delete recurring schedule for "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => String(s.id || s._id) !== String(id)));
    } catch (err) {
      alert("Failed to delete row: " + err.message);
    }
  };

  // Create new child row handler
  const handleCreateNewRow = async () => {
    if (!newRowData.child_name.trim() || !newRowData.parent_phone.trim()) {
      alert("Child Name and Parent Phone are required.");
      return;
    }
    try {
      const res = await createSchedule(newRowData);
      const created = res.data || res;
      setSchedules((prev) => [created, ...prev]);
      setIsAddingRow(false);
      setNewRowData({
        child_name: "",
        parent_phone: "",
        recurring_slots: [
          createDefaultSlot("Monday", "10:00", "Occupational Therapy", THERAPISTS[0]),
        ],
        status: "ACTIVE",
        notes: "",
      });
    } catch (err) {
      alert("Failed to create child schedule: " + err.message);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const name = String(s.child_name || "").toLowerCase();
      const phone = String(s.parent_phone || "");
      const topTherapist = String(s.therapist_id || "").toLowerCase();
      const topTherapy = String(s.therapy_type || "").toLowerCase();
      const st = String(s.status || "").toUpperCase();
      const slots = s.recurring_slots || s.sessions || [];

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = name.includes(query);
        const matchesPhone = phone.includes(query);
        const matchesTopTherapist = topTherapist.includes(query);
        const matchesTopTherapy = topTherapy.includes(query);
        const matchesSlot = slots.some((slot) =>
          String(slot.therapy_name || slot.therapy_type || "").toLowerCase().includes(query) ||
          String(slot.therapist_id || slot.therapistId || "").toLowerCase().includes(query)
        );
        if (!matchesName && !matchesPhone && !matchesTopTherapist && !matchesTopTherapy && !matchesSlot) {
          return false;
        }
      }
      if (filterTherapist) {
        const tMatch = topTherapist.includes(filterTherapist.toLowerCase()) ||
          slots.some((slot) => String(slot.therapist_id || slot.therapistId || "").toLowerCase().includes(filterTherapist.toLowerCase()));
        if (!tMatch) return false;
      }
      if (filterStatus && st !== filterStatus.toUpperCase()) {
        return false;
      }
      if (filterDay) {
        const hasDay = slots.some((slot) => (slot.day_of_week || slot.dayOfWeek) === filterDay);
        if (!hasDay) return false;
      }
      return true;
    }).sort((a, b) => {
      const nameA = String(a.child_name || "").trim();
      const nameB = String(b.child_name || "").trim();
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      return sortAsc ? cmp : -cmp;
    });
  }, [schedules, searchTerm, filterTherapist, filterStatus, filterDay, sortAsc]);

  // Metrics
  const metrics = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((s) => s.status === "ACTIVE").length;
    const paused = total - active;
    let totalSlots = 0;
    const therapistCounts = {};
    schedules.forEach((s) => {
      if (s.status === "ACTIVE") {
        const slots = s.recurring_slots || s.sessions || [];
        totalSlots += slots.length;
        slots.forEach((slot) => {
          const t = slot.therapist_id || slot.therapistId || s.therapist_id;
          if (t) therapistCounts[t] = (therapistCounts[t] || 0) + 1;
        });
      }
    });
    return {
      total,
      active,
      paused,
      totalSlots,
      therapistCount: Object.keys(therapistCounts).length,
    };
  }, [schedules]);

  // Export to CSV
  const handleExportCsv = () => {
    const maxSlotsCount = Math.min(
      25,
      Math.max(3, ...filteredSchedules.map((s) => (s.recurring_slots || s.sessions || []).length))
    );

    const headers = ["Child Name", "Parent Phone"];
    for (let i = 1; i <= maxSlotsCount; i++) {
      headers.push(`Slot ${i} Day`, `Slot ${i} Time`, `Slot ${i} Therapy`, `Slot ${i} Therapist`);
    }
    headers.push("Status", "Notes");

    const rows = filteredSchedules.map((s) => {
      const row = [
        `"${(s.child_name || "").replace(/"/g, '""')}"`,
        `"${(s.parent_phone || "").replace(/"/g, '""')}"`,
      ];
      const slots = s.recurring_slots || s.sessions || [];
      for (let i = 0; i < maxSlotsCount; i++) {
        const slot = slots[i] || {};
        row.push(
          `"${slot.day_of_week || slot.dayOfWeek || ""}"`,
          `"${slot.start_time ? `${slot.start_time}-${slot.end_time || calculateEndTime(slot.start_time)}` : ""}"`,
          `"${(slot.therapy_name || slot.therapy_type || s.therapy_type || "").replace(/"/g, '""')}"`,
          `"${(slot.therapist_id || slot.therapistId || s.therapist_id || "").replace(/"/g, '""')}"`
        );
      }
      row.push(`"${s.status || "ACTIVE"}"`, `"${(s.notes || "").replace(/"/g, '""')}"`);
      return row.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `udai_clinical_schedules_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Raw Text / CSV for Bulk Import (supports multi-session columns)
  const handleParseCsvText = (text) => {
    setBulkCsvText(text);
    setBulkParseError("");
    if (!text.trim()) {
      setBulkParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) return;

      const parsed = [];
      const isHeader = lines[0].toLowerCase().includes("child") || lines[0].toLowerCase().includes("name");
      const startIndex = isHeader ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.includes("\t")
          ? line.split("\t").map((p) => p.trim())
          : line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));

        if (!parts[0] || !parts[1]) continue;

        const child_name = parts[0];
        const parent_phone = parts[1];
        const defaultTherapist = parts[2] || THERAPISTS[0];
        const defaultTherapy = parts[3] || THERAPY_TYPES[0];

        const slots = [];
        let col = 4;
        while (col < parts.length) {
          const val = parts[col];
          if (!val) { col++; continue; }
          const upper = val.toUpperCase();
          if (upper.includes("ACT") || upper.includes("PAUS")) break;
          const matchedDay = DAYS_OF_WEEK.find((d) => d.toLowerCase().startsWith(val.toLowerCase()));
          if (matchedDay && col + 1 < parts.length) {
            const timeVal = parts[col + 1] || "10:00";
            const [st, et] = timeVal.split("-");
            const therapyVal = parts[col + 2] && !DAYS_OF_WEEK.some(d => d.toLowerCase().startsWith(parts[col + 2].toLowerCase()))
              ? parts[col + 2]
              : defaultTherapy;
            const therapistVal = parts[col + 3] && !DAYS_OF_WEEK.some(d => d.toLowerCase().startsWith(parts[col + 3].toLowerCase()))
              ? parts[col + 3]
              : defaultTherapist;

            slots.push({
              day_of_week: matchedDay,
              start_time: st || "10:00",
              end_time: et || calculateEndTime(st || "10:00"),
              therapy_name: therapyVal,
              therapist_id: therapistVal,
            });
            col += (parts[col + 2] && parts[col + 3]) ? 4 : 2;
          } else {
            col++;
          }
        }

        parsed.push({
          child_name,
          parent_phone,
          therapist_id: defaultTherapist,
          therapy_type: defaultTherapy,
          recurring_slots: slots.length > 0 ? slots : [
            createDefaultSlot("Monday", "10:00", defaultTherapy, defaultTherapist),
          ],
          status: "ACTIVE",
          notes: "",
        });
      }

      setBulkParsedRows(parsed);
    } catch (err) {
      setBulkParseError("Parse error: " + err.message);
    }
  };

  // Submit bulk upload
  const handleBulkSubmit = async () => {
    if (bulkParsedRows.length === 0) {
      alert("No valid rows to import.");
      return;
    }
    setBulkSubmitting(true);
    try {
      await bulkUploadSchedules(bulkParsedRows);
      alert(`Successfully imported ${bulkParsedRows.length} recurring schedules!`);
      setShowBulkModal(false);
      setBulkCsvText("");
      setBulkParsedRows([]);
      fetchSchedules();
    } catch (err) {
      alert("Bulk upload failed: " + err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // WhatsApp bot test runner
  const handleTestBotPhone = async (e) => {
    e?.preventDefault();
    if (!testPhone.trim()) return;
    setBotTesting(true);
    setBotTestResult(null);
    setConfirmResult(null);
    try {
      const res = await verifyParentPhone(testPhone.trim());
      setBotTestResult(res);
    } catch (err) {
      alert("Bot test error: " + err.message);
    } finally {
      setBotTesting(false);
    }
  };

  // Simulate replying '1' to confirm weekly slots
  const handleSimulateReply1 = async () => {
    if (!testPhone.trim()) return;
    try {
      const res = await confirmWeeklySchedule(testPhone.trim());
      setConfirmResult(res);
    } catch (err) {
      alert("Confirmation simulation error: " + err.message);
    }
  };

  // Slot Inspector check
  const handleRunSlotInspect = async () => {
    setSlotInspectLoading(true);
    try {
      const res = await getAvailableSlots(inspectorDate, inspectorTherapist);
      setSlotInspectResult(res);
    } catch (err) {
      alert("Slot inspector error: " + err.message);
    } finally {
      setSlotInspectLoading(false);
    }
  };

  return (
    <div className="recurring-slots-container">
      {/* Top Banner & Quick Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)" }}>
              🔄 Prescribed Recurring Routines &amp; Slot Manager
            </h2>
            <Badge tone="teal">MongoDB Synced</Badge>
            <Badge tone="green">WhatsApp Bot Active</Badge>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Manage weekly recurring appointments for returning children. Integrated with availability roster &amp; anti-collision engine.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Action Tools Group */}
          <div style={{ display: "flex", background: "var(--surface-2)", padding: 3, borderRadius: 8, border: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => setShowRosterModal(true)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
              title="Open Clinic Therapist Weekly Roster"
            >
              📅 Roster
            </button>
            <button
              type="button"
              onClick={() => setShowSlotInspector(!showSlotInspector)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: showSlotInspector ? "var(--accent-soft)" : "transparent",
                color: showSlotInspector ? "var(--accent)" : "var(--text)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
              title="Inspect slot anti-collision"
            >
              🛡️ Anti-Collision
            </button>
            <button
              type="button"
              onClick={() => setShowBotSimulator(!showBotSimulator)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: showBotSimulator ? "#dcf8c6" : "transparent",
                color: showBotSimulator ? "#128c7e" : "var(--text)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
              title="Test WhatsApp Returning Parent Bot"
            >
              💬 Bot Simulator
            </button>
          </div>

          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            📥 Import CSV
          </Button>
          <Button variant="secondary" onClick={handleExportCsv}>
            📤 Export CSV
          </Button>
          <Button onClick={() => setIsAddingRow(true)}>
            ➕ Add Child Schedule
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Active Returning Kids
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.active}
            </div>
            <span style={{ fontSize: 11.5, color: "#059669", fontWeight: 600 }}>
              ✓ Out of {metrics.total} enrolled
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            👥
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Weekly Reserved Slots
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.totalSlots}
            </div>
            <span style={{ fontSize: 11.5, color: "#0284c7", fontWeight: 600 }}>
              🔒 Excluded from public booking
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            📅
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Therapists Assigned
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.therapistCount}
            </div>
            <span style={{ fontSize: 11.5, color: "#7c3aed", fontWeight: 600 }}>
              Active clinic practitioners
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🩺
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Paused Schedules
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.paused}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>
              Temporarily on hold
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            ⏸️
          </div>
        </div>
      </div>

      {/* Anti-Collision Slot Inspector Drawer / Panel */}
      {showSlotInspector && (
        <div className="content-card" style={{ marginBottom: 20, border: "1px solid var(--accent)", background: "var(--surface-2)" }}>
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>🛡️ Slot Availability & Anti-Collision Engine Inspector</h3>
              <p className="section-copy">
                Simulates <code>GET /api/slots/available</code> to verify that recurring weekly slots are permanently excluded from new public bookings.
              </p>
            </div>
            <button className="icon-button" onClick={() => setShowSlotInspector(false)}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date (YYYY-MM-DD)</label>
              <input
                type="date"
                className="input-field"
                value={inspectorDate}
                onChange={(e) => setInspectorDate(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Therapist</label>
              <select
                className="input-field"
                value={inspectorTherapist}
                onChange={(e) => setInspectorTherapist(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}
              >
                {THERAPISTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleRunSlotInspect} disabled={slotInspectLoading}>
              {slotInspectLoading ? "Calculating..." : "Inspect Available vs Reserved"}
            </Button>
          </div>

          {slotInspectResult && (
            <div style={{ background: "var(--surface)", padding: 14, borderRadius: 12, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Day: {slotInspectResult.day_of_week} ({slotInspectResult.date})</strong>
                <Badge tone={slotInspectResult.reserved_slots?.length > 0 ? "orange" : "slate"}>
                  {slotInspectResult.reserved_slots?.length || 0} Reserved Recurring Slots
                </Badge>
              </div>

              {slotInspectResult.reserved_slots?.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>🔒 HELD / RESERVED (Hidden from public users):</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {slotInspectResult.reserved_slots.map((time) => (
                      <span key={time} style={{ background: "rgba(185, 28, 28, 0.1)", color: "var(--danger)", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {time} (Held for recurring child)
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>No recurring child holds for this therapist on {slotInspectResult.day_of_week}.</p>
              )}

              <div>
                <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>✅ OPEN CLINICAL SLOTS (Bookable by public):</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {slotInspectResult.available_slots?.map((s) => (
                    <span key={s.time} style={{ background: "rgba(15, 118, 110, 0.1)", color: "var(--success)", padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
                      {s.time}
                    </span>
                  ))}
                  {(!slotInspectResult.available_slots || slotInspectResult.available_slots.length === 0) && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>No slots available</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Bot Simulation Tool */}
      {showBotSimulator && (
        <div className="content-card" style={{ marginBottom: 20, border: "1px solid #25D366", background: "var(--surface-2)" }}>
          <div className="section-head" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "#128C7E" }}>💬 WhatsApp MSG91 Returning Parent Bot Simulation</h3>
              <p className="section-copy">
                Simulates <code>POST /api/whatsapp/verify-parent</code> to check how returning parents receive their recurring schedule and 1-click confirmation.
              </p>
            </div>
            <button className="icon-button" onClick={() => setShowBotSimulator(false)}>✕</button>
          </div>

          <form onSubmit={handleTestBotPhone} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Enter Parent Phone (e.g. 9876543210)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              style={{ flex: 1, maxWidth: 320, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
            />
            <Button type="submit" disabled={botTesting}>
              {botTesting ? "Verifying..." : "Verify Parent"}
            </Button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Tip: Copy any phone number from the table below
            </span>
          </form>

          {botTestResult && (
            <div style={{ background: "var(--surface)", padding: 14, borderRadius: 12, border: "1px solid var(--line)" }}>
              {botTestResult.isReturningParent ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Badge tone="green">Returning Parent Detected</Badge>
                    <strong>Child: {botTestResult.child_name}</strong>
                    <span>({botTestResult.therapy_type} with {botTestResult.therapist_id})</span>
                  </div>

                  {/* Simulated WhatsApp message bubble */}
                  <div style={{ background: "#DCF8C6", padding: 12, borderRadius: "8px 8px 8px 0", maxWidth: 500, color: "#111", fontSize: 13, marginBottom: 10, border: "1px solid #c0e8a7" }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>{botTestResult.bot_message}</p>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Button onClick={handleSimulateReply1} style={{ background: "#25D366", borderColor: "#25D366", color: "#fff" }}>
                      👉 Simulate Reply "1" (Confirm All)
                    </Button>
                    <Button variant="secondary" onClick={() => alert("Parent requested reschedule: admin notified via WhatsApp Messages tab.")}>
                      👉 Simulate Reply "2" (Request Change)
                    </Button>
                  </div>

                  {confirmResult && (
                    <div style={{ marginTop: 12, padding: 10, background: "rgba(15, 118, 110, 0.08)", borderRadius: 8, border: "1px solid var(--success)" }}>
                      <strong style={{ color: "var(--success)" }}>✅ Confirmation Bot Reply:</strong>
                      <p style={{ margin: "4px 0 0", fontSize: 13 }}>{confirmResult.bot_response}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Badge tone="slate">New Intake Flow</Badge>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
                    Phone number not found in active recurring schedules. WhatsApp bot automatically routes user to the first-time consultation intake flow with unreserved slots.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Real-Time Filter Toolbar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 14 }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by child name or parent phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: 13,
              fontWeight: 500,
              outline: "none",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={filterTherapist}
            onChange={(e) => setFilterTherapist(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: 12.5,
              fontWeight: 600,
              color: filterTherapist ? "var(--accent)" : "var(--text)",
            }}
          >
            <option value="">👤 All Therapists</option>
            {THERAPISTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: 12.5,
              fontWeight: 600,
              color: filterDay ? "var(--accent)" : "var(--text)",
            }}
          >
            <option value="">📅 All Days</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface-2, #f8fafc)",
              fontSize: 12.5,
              fontWeight: 600,
              color: filterStatus ? "var(--accent)" : "var(--text)",
            }}
          >
            <option value="">⚡ All Statuses</option>
            <option value="ACTIVE">● ACTIVE Only</option>
            <option value="PAUSED">⏸ PAUSED Only</option>
          </select>

          {(searchTerm || filterTherapist || filterDay || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterTherapist("");
                setFilterDay("");
                setFilterStatus("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #fecdd3",
                background: "#fff1f2",
                color: "#be123c",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          )}

          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginLeft: 4 }}>
            ({filteredSchedules.length} {filteredSchedules.length === 1 ? "child" : "children"})
          </span>
        </div>
      </div>

      {/* Spreadsheet / Inline Editing Table */}
      <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "auto", background: "var(--surface)" }}>
        <table className="excel-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
              <th style={{ width: 44, padding: "12px 8px", textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>#</th>
              <th
                style={{ width: 230, padding: "12px 12px", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortAsc((prev) => !prev)}
                title="Click to sort A-Z or Z-A"
              >
                Child &amp; Parent {sortAsc ? "▲ (A-Z)" : "▼ (Z-A)"} ✎
              </th>
              <th style={{ minWidth: 420, padding: "12px 12px", fontWeight: 700 }}>
                Prescribed Weekly Routine (Day • Time • Therapy • Therapist)
              </th>
              <th style={{ width: 120, padding: "12px 10px", textAlign: "center", fontWeight: 700 }}>Weekly Load</th>
              <th style={{ width: 95, padding: "12px 8px", textAlign: "center", fontWeight: 700 }}>Status ⚡</th>
              <th style={{ width: 85, padding: "12px 8px", textAlign: "center", fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Inline Add Row Form */}
            {isAddingRow && (
              <tr style={{ background: "var(--accent-soft)", borderBottom: "2px solid var(--accent)" }}>
                <td style={{ textAlign: "center", fontWeight: 800, color: "var(--accent)", fontSize: 16 }}>★</td>
                {/* Child Name & Parent Phone stacked */}
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Child Name (e.g. Aarav Sharma)"
                      value={newRowData.child_name}
                      onChange={(e) => setNewRowData((d) => ({ ...d, child_name: e.target.value }))}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)", fontWeight: 700 }}
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Parent Phone (e.g. 9876543210)"
                      value={newRowData.parent_phone}
                      onChange={(e) => setNewRowData((d) => ({ ...d, parent_phone: e.target.value }))}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)", fontFamily: "monospace" }}
                    />
                  </div>
                </td>
                {/* Slot Builder */}
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {newRowData.recurring_slots.map((slot, sIdx) => {
                      const thStyle = getTherapyStyle(slot.therapy_name);
                      return (
                        <div
                          key={sIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            background: "var(--surface)",
                            border: `1px solid ${thStyle.border}`,
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 800, color: "var(--accent)", width: 16 }}>{sIdx + 1}.</span>
                          <select
                            value={slot.day_of_week}
                            onChange={(e) => {
                              const updated = [...newRowData.recurring_slots];
                              updated[sIdx].day_of_week = e.target.value;
                              setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 700, color: "var(--accent)" }}
                          >
                            {DAYS_OF_WEEK.map((d) => (
                              <option key={d} value={d}>{d.slice(0, 3)}</option>
                            ))}
                          </select>
                          <select
                            value={slot.start_time}
                            onChange={(e) => {
                              const updated = [...newRowData.recurring_slots];
                              updated[sIdx].start_time = e.target.value;
                              updated[sIdx].end_time = calculateEndTime(e.target.value);
                              setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 600 }}
                          >
                            {STANDARD_TIMES.map((time) => {
                              const tOccupied = getTherapistOccupiedSlots(slot.therapist_id, null);
                              const bookedChild = tOccupied[`${slot.day_of_week}_${time}`];
                              return (
                                <option key={time} value={time}>
                                  {time} {bookedChild ? `(🔒 ${bookedChild.length > 8 ? bookedChild.slice(0, 7) + "…" : bookedChild})` : "(✓ Free)"}
                                </option>
                              );
                            })}
                          </select>
                          <select
                            value={slot.therapy_name}
                            onChange={(e) => {
                              const updated = [...newRowData.recurring_slots];
                              updated[sIdx].therapy_name = e.target.value;
                              setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", maxWidth: 170, fontWeight: 600 }}
                          >
                            {THERAPY_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <select
                            value={slot.therapist_id}
                            onChange={(e) => {
                              const updated = [...newRowData.recurring_slots];
                              updated[sIdx].therapist_id = e.target.value;
                              setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", maxWidth: 140, fontWeight: 600 }}
                          >
                            {THERAPISTS.map((t) => {
                              const tOccupied = getTherapistOccupiedSlots(t, null);
                              const bookedChild = tOccupied[`${slot.day_of_week}_${slot.start_time}`];
                              return (
                                <option key={t} value={t}>
                                  {t} {bookedChild ? `(🔒 ${bookedChild.length > 8 ? bookedChild.slice(0, 7) + "…" : bookedChild})` : "(✓ Free)"}
                                </option>
                              );
                            })}
                          </select>
                          {newRowData.recurring_slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newRowData.recurring_slots.filter((_, idx) => idx !== sIdx);
                                setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                              }}
                              style={{ border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer", padding: "0 4px", fontWeight: 700 }}
                              title="Remove slot"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const used = newRowData.recurring_slots.map((s) => s.day_of_week);
                          const nextD = DAYS_OF_WEEK.find((d) => !used.includes(d)) || "Monday";
                          const lastSlot = newRowData.recurring_slots[newRowData.recurring_slots.length - 1];
                          setNewRowData((d) => ({
                            ...d,
                            recurring_slots: [
                              ...d.recurring_slots,
                              createDefaultSlot(
                                nextD,
                                "10:00",
                                lastSlot?.therapy_name || THERAPY_TYPES[0],
                                lastSlot?.therapist_id || THERAPISTS[0]
                              ),
                            ],
                          }));
                        }}
                        style={{
                          border: "1px dashed var(--accent)",
                          background: "transparent",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          cursor: "pointer",
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        + Add Prescribed Slot
                      </button>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        ({newRowData.recurring_slots.length} weekly sessions)
                      </span>
                    </div>
                  </div>
                </td>
                {/* Weekly Load */}
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  <Badge tone="teal">{newRowData.recurring_slots.length} Slots / wk</Badge>
                </td>
                {/* Status Toggle */}
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  <button
                    type="button"
                    onClick={() => setNewRowData((d) => ({ ...d, status: d.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }))}
                    style={{
                      border: newRowData.status === "ACTIVE" ? "1px solid #10b981" : "1px solid #f59e0b",
                      borderRadius: 12,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: newRowData.status === "ACTIVE" ? "#ecfdf5" : "#fffbeb",
                      color: newRowData.status === "ACTIVE" ? "#059669" : "#b45309",
                    }}
                  >
                    {newRowData.status}
                  </button>
                </td>
                {/* Save / Cancel */}
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={handleCreateNewRow}
                      style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11.5, fontWeight: 700 }}
                      title="Save row"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingRow(false)}
                      style={{ background: "transparent", border: "1px solid var(--line)", padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11.5 }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty State */}
            {!loading && filteredSchedules.length === 0 && !isAddingRow && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No recurring schedules found matching your criteria.
                  <div style={{ marginTop: 8 }}>
                    <Button onClick={() => setIsAddingRow(true)}>+ Add First Child Row</Button>
                  </div>
                </td>
              </tr>
            )}

            {/* Table Rows */}
            {filteredSchedules.map((schedule, index) => {
              const id = schedule.id || schedule._id;
              const isChildEditing = editingCell?.id === id && editingCell?.field === "child_name";
              const isPhoneEditing = editingCell?.id === id && editingCell?.field === "parent_phone";

              const isSavingChild = savingCell?.id === id && savingCell?.field === "child_name";
              const isSavingPhone = savingCell?.id === id && savingCell?.field === "parent_phone";
              const isSavingSlots = savingCell?.id === id && savingCell?.field === "recurring_slots";
              const isSavingStatus = savingCell?.id === id && savingCell?.field === "status";

              const isSuccessChild = saveSuccess?.id === id && saveSuccess?.field === "child_name";
              const isSuccessPhone = saveSuccess?.id === id && saveSuccess?.field === "parent_phone";

              const slots = schedule.recurring_slots || schedule.sessions || [];
              const isExpanded = expandedRowIds.has(id);

              const uniqueTherapists = Array.from(
                new Set(slots.map((s) => s.therapist_id || s.therapistId || schedule.therapist_id).filter(Boolean))
              );

              return (
                <React.Fragment key={id}>
                  <tr
                    style={{
                      borderBottom: isExpanded ? "none" : "1px solid var(--line)",
                      background: isExpanded ? "var(--surface-2)" : undefined,
                      transition: "background 0.15s ease",
                    }}
                    className="table-row-hover"
                  >
                    {/* Row Number & Expand Toggle */}
                    <td style={{ textAlign: "center", padding: "12px 6px", fontSize: 12 }}>
                      <button
                        type="button"
                        onClick={() => toggleRowExpanded(id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: isExpanded ? "var(--accent)" : "var(--muted)",
                          fontWeight: 700,
                        }}
                        title={isExpanded ? "Collapse sessions matrix" : "Expand sessions matrix"}
                      >
                        <span style={{ fontSize: 10 }}>{isExpanded ? "▼" : "▶"}</span>
                        <span>{index + 1}</span>
                      </button>
                    </td>

                    {/* Child Name & Parent Contact (Click Inline Edit) */}
                    <td
                      style={{
                        padding: "10px 12px",
                        position: "relative",
                        background: (isSuccessChild || isSuccessPhone) ? "rgba(15, 118, 110, 0.08)" : undefined,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Avatar Initial Circle */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: getAvatarGradient(schedule.child_name || "Child"),
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 14,
                            flexShrink: 0,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          {(schedule.child_name || "C").trim().charAt(0).toUpperCase()}
                        </div>

                        {/* Name & Phone Stack */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Child Name Inline Edit */}
                          {isChildEditing ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={() => handleCellSave(id, "child_name", tempValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCellSave(id, "child_name", tempValue);
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "2px solid var(--accent)",
                                outline: "none",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCell({ id, field: "child_name" });
                                setTempValue(schedule.child_name || "");
                              }}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                              title="Click to edit child name"
                            >
                              <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {schedule.child_name}
                              </span>
                              {isSavingChild ? (
                                <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                              ) : isSuccessChild ? (
                                <span style={{ fontSize: 12, color: "var(--success)" }}>✓</span>
                              ) : (
                                <span className="cell-edit-hint" style={{ fontSize: 11, color: "var(--muted)", opacity: 0.4 }}>✎</span>
                              )}
                            </div>
                          )}

                          {/* Parent Phone Inline Edit + WhatsApp button */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            {isPhoneEditing ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => handleCellSave(id, "parent_phone", tempValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCellSave(id, "parent_phone", tempValue);
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "3px 6px",
                                  borderRadius: 4,
                                  border: "2px solid var(--accent)",
                                  outline: "none",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                }}
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingCell({ id, field: "parent_phone" });
                                  setTempValue(schedule.parent_phone || "");
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                                title="Click to edit parent phone"
                              >
                                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>
                                  📞 {schedule.parent_phone}
                                </span>
                                {isSavingPhone ? (
                                  <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                                ) : (
                                  <span className="cell-edit-hint" style={{ fontSize: 10, color: "var(--muted)", opacity: 0.4 }}>✎</span>
                                )}
                              </div>
                            )}

                            {/* WhatsApp Direct Chat Link */}
                            {schedule.parent_phone && (
                              <a
                                href={`https://wa.me/91${schedule.parent_phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 11,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "#dcf8c6",
                                  color: "#128c7e",
                                  textDecoration: "none",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                                title="Open WhatsApp Chat with parent"
                              >
                                💬 WA
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Prescribed Sessions Chips + Manager */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {slots.map((slot, sIdx) => {
                          const dayShort = (slot.day_of_week || slot.dayOfWeek || "Mon").slice(0, 3);
                          const time = slot.start_time || slot.startTime || "10:00";
                          const endTime = slot.end_time || slot.endTime || calculateEndTime(time);
                          const therapyName = slot.therapy_name || slot.therapy_type || schedule.therapy_type || "Therapy";
                          const therapistName = (slot.therapist_id || slot.therapistId || schedule.therapist_id || "").replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "");
                          const thStyle = getTherapyStyle(therapyName);

                          return (
                            <div
                              key={sIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: thStyle.bg,
                                border: `1px solid ${thStyle.border}`,
                                color: thStyle.text,
                                padding: "4px 8px",
                                borderRadius: 8,
                                fontSize: 11.5,
                                fontWeight: 500,
                                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                              }}
                              title={`${slot.day_of_week || slot.dayOfWeek}: ${time} - ${endTime} • ${therapyName} with ${slot.therapist_id || slot.therapistId || schedule.therapist_id}`}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  background: thStyle.tagBg,
                                  color: thStyle.tagText,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  textTransform: "uppercase",
                                }}
                              >
                                {dayShort}
                              </span>
                              <span style={{ fontWeight: 700 }}>{time}</span>
                              <span style={{ opacity: 0.6 }}>•</span>
                              <span style={{ fontWeight: 600 }}>{thStyle.icon} {thStyle.label}</span>
                              {therapistName && (
                                <>
                                  <span style={{ opacity: 0.6 }}>•</span>
                                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{therapistName}</span>
                                </>
                              )}
                              {slots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlotFromRow(schedule, sIdx)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--muted)",
                                    cursor: "pointer",
                                    padding: "0 2px",
                                    fontSize: 11,
                                    lineHeight: 1,
                                    fontWeight: 700,
                                    marginLeft: 2,
                                  }}
                                  title="Remove session"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Quick Add Slot Button */}
                        <button
                          type="button"
                          onClick={() => handleAddSlotToRow(schedule)}
                          style={{
                            border: "1px dashed var(--accent)",
                            background: "transparent",
                            padding: "4px 8px",
                            borderRadius: 8,
                            fontSize: 11,
                            cursor: "pointer",
                            color: "var(--accent)",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                          title="Add new slot to child's routine"
                        >
                          + Slot
                        </button>

                        {/* Open Clinical Session Modal */}
                        <button
                          type="button"
                          onClick={() => openSessionModal(schedule)}
                          style={{
                            border: "1px solid var(--accent)",
                            background: "var(--accent-soft)",
                            padding: "4px 9px",
                            borderRadius: 8,
                            fontSize: 11,
                            cursor: "pointer",
                            color: "var(--accent)",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Manage routine matrix"
                        >
                          ⚡ Manage ({slots.length})
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleRowExpanded(id)}
                          style={{
                            border: "1px solid var(--line)",
                            background: isExpanded ? "var(--accent)" : "transparent",
                            color: isExpanded ? "#fff" : "var(--muted)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                          title={isExpanded ? "Collapse inline matrix" : "Expand inline matrix"}
                        >
                          {isExpanded ? "▲ Hide" : "▼ Matrix"}
                        </button>

                        {isSavingSlots && (
                          <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                        )}
                      </div>
                    </td>

                    {/* Weekly Load */}
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <Badge tone={schedule.status === "ACTIVE" ? "teal" : "slate"}>
                        {slots.length} Sessions / wk
                      </Badge>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                        {uniqueTherapists.length} Therapist{uniqueTherapists.length > 1 ? "s" : ""}
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(schedule)}
                        disabled={isSavingStatus}
                        style={{
                          border: schedule.status === "ACTIVE" ? "1px solid #10b981" : "1px solid #f59e0b",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          background: schedule.status === "ACTIVE" ? "#ecfdf5" : "#fffbeb",
                          color: schedule.status === "ACTIVE" ? "#059669" : "#b45309",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          opacity: isSavingStatus ? 0.6 : 1,
                        }}
                        title="Click to toggle status (ACTIVE / PAUSED)"
                      >
                        <span>{schedule.status === "ACTIVE" ? "●" : "⏸"}</span>
                        <span>{schedule.status}</span>
                      </button>
                    </td>

                    {/* Actions: Quick Modal & Delete */}
                    <td style={{ textAlign: "center", padding: "10px 8px" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => openSessionModal(schedule)}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            padding: "4px 6px",
                            color: "var(--accent)",
                          }}
                          title="Open routine manager"
                        >
                          ⚡
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(id, schedule.child_name)}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                            color: "var(--danger, #ef4444)",
                            cursor: "pointer",
                            fontSize: 12,
                            padding: "4px 6px",
                          }}
                          title="Delete child schedule"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Accordion Row for Clinical Therapy Breakdown */}
                  {isExpanded && (
                    <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)" }}>
                      <td colSpan={6} style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--accent)",
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                                  Clinical Therapy Routine · {schedule.child_name}
                                </h4>
                                <Badge tone="teal">{slots.length} Sessions / Week</Badge>
                              </div>
                              <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--muted)" }}>
                                Each session slot has its own independent Day, Time Window, Therapy Department, and Assigned Therapist.
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button variant="secondary" onClick={() => openSessionModal(schedule)}>
                                ⚡ Open Fullscreen Matrix Modal
                              </Button>
                              <button
                                type="button"
                                onClick={() => toggleRowExpanded(id)}
                                style={{
                                  background: "transparent",
                                  border: "1px solid var(--line)",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: "var(--muted)",
                                }}
                              >
                                ▲ Collapse
                              </button>
                            </div>
                          </div>

                          {/* Tab Switcher inside Expanded Row */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 14, borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                            <button
                              type="button"
                              onClick={() => setExpandedRowTabs((prev) => ({ ...prev, [id]: "picker" }))}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: (expandedRowTabs[id] || "picker") === "picker" ? "2px solid var(--accent)" : "1px solid var(--line)",
                                background: (expandedRowTabs[id] || "picker") === "picker" ? "var(--accent)" : "var(--surface)",
                                color: (expandedRowTabs[id] || "picker") === "picker" ? "#fff" : "var(--text)",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span>📅 1-Click Weekly Matrix</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: (expandedRowTabs[id] || "picker") === "picker" ? "rgba(255,255,255,0.25)" : "rgba(16, 185, 129, 0.15)",
                                  color: (expandedRowTabs[id] || "picker") === "picker" ? "#fff" : "#059669",
                                  fontWeight: 800,
                                }}
                              >
                                Recommended
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedRowTabs((prev) => ({ ...prev, [id]: "table" }))}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: expandedRowTabs[id] === "table" ? "2px solid var(--accent)" : "1px solid var(--line)",
                                background: expandedRowTabs[id] === "table" ? "var(--accent)" : "var(--surface)",
                                color: expandedRowTabs[id] === "table" ? "#fff" : "var(--text)",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span>📋 Session List Table</span>
                              <Badge tone={slots.length > 0 ? "teal" : "slate"}>{slots.length}</Badge>
                            </button>
                          </div>

                          {(expandedRowTabs[id] || "picker") === "picker" ? (
                            renderWeeklyAvailabilityGrid({
                              therapistId: expandedRowTherapists[id] || slots[0]?.therapist_id || schedule.therapist_id || THERAPISTS[0],
                              discipline: getDefaultDiscipline(expandedRowTherapists[id] || slots[0]?.therapist_id || schedule.therapist_id || THERAPISTS[0]),
                              onTherapistChange: (t) => {
                                setExpandedRowTherapists((prev) => ({ ...prev, [id]: t }));
                              },
                              onDisciplineChange: () => {},
                              currentSlots: slots,
                              onToggleSlot: (day, time, therapy, therapist) =>
                                handleToggleSlotInRow(schedule, day, time, therapy, therapist),
                              excludeScheduleId: id,
                              childName: schedule.child_name,
                            })
                          ) : (
                            <>
                              {/* Inline Table of Sessions */}
                              <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                                  <thead>
                                    <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                                      <th style={{ width: 40, padding: "8px 10px", textAlign: "center", color: "var(--muted)" }}>#</th>
                                      <th style={{ width: 150, padding: "8px 10px" }}>Day of Week</th>
                                      <th style={{ width: 170, padding: "8px 10px" }}>Time Slot (45m)</th>
                                      <th style={{ width: 230, padding: "8px 10px" }}>Specific Therapy / Service</th>
                                      <th style={{ width: 210, padding: "8px 10px" }}>Assigned Therapist</th>
                                      <th style={{ width: 70, padding: "8px 10px", textAlign: "center" }}>Remove</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slots.map((slot, sIdx) => {
                                      const slotTherapist = slot.therapist_id || slot.therapistId || THERAPISTS[0];
                                      const slotDay = slot.day_of_week || slot.dayOfWeek || "Monday";
                                      const slotTime = slot.start_time || slot.startTime || "10:00";

                                      return (
                                        <tr key={sIdx} style={{ borderBottom: "1px solid var(--line)" }}>
                                          <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                                            {sIdx + 1}
                                          </td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <select
                                              value={slotDay}
                                              onChange={(e) => handleSlotFieldChange(schedule, sIdx, "day_of_week", e.target.value)}
                                              style={{
                                                width: "100%",
                                                padding: "6px 8px",
                                                borderRadius: 6,
                                                border: "1px solid var(--line)",
                                                background: "var(--surface)",
                                                fontWeight: 700,
                                                color: "var(--accent)",
                                              }}
                                            >
                                              {DAYS_OF_WEEK.map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <select
                                              value={slotTime}
                                              onChange={(e) => handleSlotFieldChange(schedule, sIdx, "start_time", e.target.value)}
                                              style={{
                                                width: "100%",
                                                padding: "6px 8px",
                                                borderRadius: 6,
                                                border: "1px solid var(--line)",
                                                background: "var(--surface)",
                                              }}
                                            >
                                              {STANDARD_TIMES.map((time) => {
                                                const tOccupied = getTherapistOccupiedSlots(slotTherapist, id);
                                                const bookedChild = tOccupied[`${slotDay}_${time}`];
                                                const isCurrent = slotTime === time;
                                                return (
                                                  <option key={time} value={time}>
                                                    {time} - {calculateEndTime(time)} {bookedChild && !isCurrent ? `(🔒 Booked: ${bookedChild.length > 8 ? bookedChild.slice(0, 7) + "…" : bookedChild})` : "(✓ Free)"}
                                                  </option>
                                                );
                                              })}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <select
                                              value={slot.therapy_name || slot.therapy_type || THERAPY_TYPES[0]}
                                              onChange={(e) => handleSlotFieldChange(schedule, sIdx, "therapy_name", e.target.value)}
                                              style={{
                                                width: "100%",
                                                padding: "6px 8px",
                                                borderRadius: 6,
                                                border: "1px solid var(--line)",
                                                background: "var(--surface)",
                                                fontWeight: 500,
                                              }}
                                            >
                                              {THERAPY_TYPES.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 10px" }}>
                                            <select
                                              value={slotTherapist}
                                              onChange={(e) => handleSlotFieldChange(schedule, sIdx, "therapist_id", e.target.value)}
                                              style={{
                                                width: "100%",
                                                padding: "6px 8px",
                                                borderRadius: 6,
                                                border: "1px solid var(--line)",
                                                background: "var(--surface)",
                                              }}
                                            >
                                              {THERAPISTS.map((t) => {
                                                const tOccupied = getTherapistOccupiedSlots(t, id);
                                                const bookedChild = tOccupied[`${slotDay}_${slotTime}`];
                                                const isCurrent = slotTherapist === t;
                                                return (
                                                  <option key={t} value={t}>
                                                    {t} {bookedChild && !isCurrent ? `(🔒 Booked: ${bookedChild.length > 8 ? bookedChild.slice(0, 7) + "…" : bookedChild})` : "(✓ Free)"}
                                                  </option>
                                                );
                                              })}
                                            </select>
                                          </td>
                                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                            {slots.length > 1 ? (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlotFromRow(schedule, sIdx)}
                                                style={{
                                                  border: "none",
                                                  background: "transparent",
                                                  color: "var(--danger)",
                                                  cursor: "pointer",
                                                  fontSize: 14,
                                                }}
                                                title="Delete this session"
                                              >
                                                ✕
                                              </button>
                                            ) : (
                                              <span style={{ fontSize: 10, color: "var(--muted)" }}>Min 1</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Quick Add Bar in Expanded View */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <Button onClick={() => handleAddSlotToRow(schedule)}>
                                    ➕ Add Session Slot
                                  </Button>
                                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                                    ({slots.length} weekly sessions configured)
                                  </span>
                                </div>

                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Quick Presets:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const usedDays = slots.map((s) => s.day_of_week || s.dayOfWeek);
                                      const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || "Monday";
                                      const newSlot = createDefaultSlot(nextDay, "10:00", "Occupational Therapy", "Ms. Nikki");
                                      handleSlotsUpdate(schedule, [...slots, newSlot]);
                                    }}
                                    style={{ fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}
                                  >
                                    + OT (Ms. Nikki)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const usedDays = slots.map((s) => s.day_of_week || s.dayOfWeek);
                                      const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || "Wednesday";
                                      const newSlot = createDefaultSlot(nextDay, "11:30", "Speech Therapy", "Mr. Atal");
                                      handleSlotsUpdate(schedule, [...slots, newSlot]);
                                    }}
                                    style={{ fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}
                                  >
                                    + Speech (Mr. Atal)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const usedDays = slots.map((s) => s.day_of_week || s.dayOfWeek);
                                      const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || "Friday";
                                      const newSlot = createDefaultSlot(nextDay, "10:00", "Special Education", "Ms. Shobha");
                                      handleSlotsUpdate(schedule, [...slots, newSlot]);
                                    }}
                                    style={{ fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--line)", padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}
                                  >
                                    + Special Ed (Ms. Shobha)
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Table Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Showing {filteredSchedules.length} of {schedules.length} recurring schedules · Click any cell to edit inline
        </span>
        <Button onClick={() => setIsAddingRow(true)}>
          ➕ Add New Child Row
        </Button>
      </div>

      {/* Bulk CSV Upload / Paste Modal */}
      {showBulkModal && (
        <div className="modal-backdrop" onClick={() => setShowBulkModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, width: "100%" }}>
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div>
                <h2>Bulk Import Schedules via CSV / Excel Paste</h2>
                <p className="section-copy">
                  Paste rows directly from Microsoft Excel or Google Sheets, or paste CSV text below.
                </p>
              </div>
              <button className="icon-button" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                Format: <code>Child Name, Parent Phone, Therapist, Therapy Type, Day 1, Time 1, Day 2, Time 2</code>
              </span>
              <textarea
                rows={6}
                placeholder={`Example:\nAarav, 9876543210, Ms. Nikki, Occupational Therapy, Monday, 10:00, Wednesday, 10:00\nSana, 9811223344, Mr. Atal, Speech Therapy, Tuesday, 11:30, Friday, 11:30`}
                value={bulkCsvText}
                onChange={(e) => handleParseCsvText(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              />
            </div>

            {bulkParseError && (
              <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>{bulkParseError}</div>
            )}

            {bulkParsedRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>
                  ✓ Parsed {bulkParsedRows.length} valid row(s) ready to import:
                </span>
                <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8, marginTop: 6, padding: 8, fontSize: 12 }}>
                  {bulkParsedRows.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
                      <strong>{r.child_name} ({r.parent_phone})</strong>
                      <span>{r.therapist_id} · {r.recurring_slots.map((s) => `${s.day_of_week} ${s.start_time}`).join(", ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkSubmit} disabled={bulkSubmitting || bulkParsedRows.length === 0}>
                {bulkSubmitting ? "Importing..." : `Import ${bulkParsedRows.length} Records`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Clinical Multi-Session Management Modal */}
      {sessionModal && (
        <div className="modal-backdrop" onClick={closeSessionModal}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 960, width: "95%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>⚡ Prescribed Clinical Sessions Manager</h2>
                  <Badge tone={sessionModal.slots.length > 0 ? "teal" : "slate"}>
                    {sessionModal.slots.length} Sessions / Week
                  </Badge>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                  Configuring recurring therapy routine for <strong>{sessionModal.schedule?.child_name}</strong> ({sessionModal.schedule?.parent_phone}).
                  Assign different therapies with different therapists across any days.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeSessionModal}
                style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {/* View Mode Switcher */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
              <button
                type="button"
                onClick={() => setModalTab("picker")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: modalTab === "picker" ? "2px solid var(--accent)" : "1px solid var(--line)",
                  background: modalTab === "picker" ? "var(--accent)" : "var(--surface)",
                  color: modalTab === "picker" ? "#fff" : "var(--text)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📅 1-Click Weekly Availability Matrix</span>
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: modalTab === "picker" ? "rgba(255,255,255,0.25)" : "rgba(16, 185, 129, 0.15)",
                    color: modalTab === "picker" ? "#fff" : "#059669",
                    fontWeight: 800,
                  }}
                >
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("table")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: modalTab === "table" ? "2px solid var(--accent)" : "1px solid var(--line)",
                  background: modalTab === "table" ? "var(--accent)" : "var(--surface)",
                  color: modalTab === "table" ? "#fff" : "var(--text)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📋 Granular Session List Table</span>
                <Badge tone={sessionModal.slots.length > 0 ? "teal" : "slate"}>
                  {sessionModal.slots.length}
                </Badge>
              </button>
            </div>

            {modalTab === "picker" ? (
              <div style={{ marginBottom: 16 }}>
                {renderWeeklyAvailabilityGrid({
                  therapistId: modalPickerTherapist,
                  discipline: modalPickerTherapy,
                  onTherapistChange: (t) => {
                    setModalPickerTherapist(t);
                    setModalPickerTherapy(getDefaultDiscipline(t));
                  },
                  onDisciplineChange: setModalPickerTherapy,
                  currentSlots: sessionModal.slots,
                  onToggleSlot: handleToggleSlotInModal,
                  excludeScheduleId: sessionModal.schedule?.id || sessionModal.schedule?._id,
                  childName: sessionModal.schedule?.child_name,
                })}
              </div>
            ) : (
              <>
                {/* Quick Presets Bar */}
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>⚡ Quick Add Session Slot by Discipline:</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Adds slot with default clinical department</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleAddSlotInModal("Occupational Therapy")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid var(--accent)",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      + Add Occupational Therapy (OT)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSlotInModal("Speech Therapy")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid #9333ea",
                        background: "rgba(147, 51, 234, 0.08)",
                        color: "#9333ea",
                      }}
                    >
                      + Add Speech Therapy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSlotInModal("Special Education")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid #ea580c",
                        background: "rgba(234, 88, 12, 0.08)",
                        color: "#ea580c",
                      }}
                    >
                      + Add Special Education
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSlotInModal("Physiotherapy")}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid #0284c7",
                        background: "rgba(2, 132, 199, 0.08)",
                        color: "#0284c7",
                      }}
                    >
                      + Add Physiotherapy
                    </button>
                  </div>
                </div>

                {/* Sessions Table */}
                <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                        <th style={{ width: 40, padding: "10px 12px", textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>#</th>
                        <th style={{ width: 140, padding: "10px 12px", fontWeight: 700 }}>Day of Week</th>
                        <th style={{ width: 170, padding: "10px 12px", fontWeight: 700 }}>Time Slot (45m)</th>
                        <th style={{ width: 220, padding: "10px 12px", fontWeight: 700 }}>Specific Therapy / Service</th>
                        <th style={{ width: 210, padding: "10px 12px", fontWeight: 700 }}>Assigned Therapist</th>
                        <th style={{ width: 140, padding: "10px 12px", fontWeight: 700 }}>Collision Check</th>
                        <th style={{ width: 60, padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionModal.slots.map((slot, sIdx) => {
                        const occupiedMap = getTherapistOccupiedSlots(
                          slot.therapist_id,
                          sessionModal.schedule?.id || sessionModal.schedule?._id
                        );
                        const conflictChild = occupiedMap[`${slot.day_of_week}_${slot.start_time}`];

                        return (
                          <tr key={sIdx} style={{ borderBottom: "1px solid var(--line)", background: conflictChild ? "rgba(239, 68, 68, 0.04)" : undefined }}>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                              {sIdx + 1}
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select
                                value={slot.day_of_week}
                                onChange={(e) => handleModalSlotFieldChange(sIdx, "day_of_week", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "var(--surface)",
                                  fontWeight: 700,
                                  color: "var(--accent)",
                                }}
                              >
                                {DAYS_OF_WEEK.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select
                                value={slot.start_time}
                                onChange={(e) => handleModalSlotFieldChange(sIdx, "start_time", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "var(--surface)",
                                }}
                              >
                                {STANDARD_TIMES.map((time) => {
                                  const isOccupied = occupiedMap[`${slot.day_of_week}_${time}`];
                                  const isCurrentTime = slot.start_time === time;
                                  return (
                                    <option key={time} value={time}>
                                      {time} - {calculateEndTime(time)} {isOccupied && !isCurrentTime ? `(🔒 Booked: ${isOccupied.length > 8 ? isOccupied.slice(0, 7) + "…" : isOccupied})` : "(✓ Free)"}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select
                                value={slot.therapy_name}
                                onChange={(e) => handleModalSlotFieldChange(sIdx, "therapy_name", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                  background: "var(--surface)",
                                  fontWeight: 500,
                                }}
                              >
                                {THERAPY_TYPES.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select
                                value={slot.therapist_id}
                                onChange={(e) => handleModalSlotFieldChange(sIdx, "therapist_id", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: conflictChild ? "1px solid var(--danger)" : "1px solid var(--line)",
                                  background: "var(--surface)",
                                }}
                              >
                                {THERAPISTS.map((t) => {
                                  const tOccupied = getTherapistOccupiedSlots(t, sessionModal.schedule?.id || sessionModal.schedule?._id);
                                  const bookedChild = tOccupied[`${slot.day_of_week}_${slot.start_time}`];
                                  const isCurrent = slot.therapist_id === t;
                                  return (
                                    <option key={t} value={t}>
                                      {t} {bookedChild && !isCurrent ? `(🔒 Booked: ${bookedChild.length > 8 ? bookedChild.slice(0, 7) + "…" : bookedChild})` : "(✓ Free)"}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              {conflictChild ? (
                                <span
                                  style={{
                                    color: "var(--danger)",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                  title={`Therapist "${slot.therapist_id}" is already scheduled on ${slot.day_of_week} at ${slot.start_time} with "${conflictChild}".`}
                                >
                                  ⚠️ Clash: {conflictChild.length > 9 ? `${conflictChild.slice(0, 8)}…` : conflictChild}
                                </span>
                              ) : (
                                <span style={{ color: "var(--success)", fontSize: 11, fontWeight: 600 }}>
                                  ✓ Available
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              {sessionModal.slots.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlotInModal(sIdx)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--danger)",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    fontWeight: 700,
                                  }}
                                  title="Delete this session slot"
                                >
                                  ✕
                                </button>
                              ) : (
                                <span style={{ fontSize: 10, color: "var(--muted)" }}>Min 1</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Modal Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {modalTab === "table" && (
                  <Button onClick={() => handleAddSlotInModal()}>
                    ➕ Add Another Session Slot
                  </Button>
                )}
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  Total Prescribed: <strong>{sessionModal.slots.length}</strong> session(s) / week
                </span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="secondary" onClick={closeSessionModal}>
                  Cancel
                </Button>
                <Button onClick={handleSaveModalSessions}>
                  Save All Sessions ({sessionModal.slots.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Therapist Weekly Availability Roster Modal */}
      {showRosterModal && (
        <div className="modal-backdrop" onClick={() => setShowRosterModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 960, width: "95%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📅 Master Therapist Weekly Availability Roster</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
                  Live weekly schedule & clinic capacity across all therapists. Green slots are free for new bookings; red slots are locked by recurring clients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {renderWeeklyAvailabilityGrid({
              therapistId: rosterTherapist,
              discipline: getDefaultDiscipline(rosterTherapist),
              onTherapistChange: setRosterTherapist,
              onDisciplineChange: () => {},
              currentSlots: [],
              onToggleSlot: (day, time) => {
                alert(`Information: On ${day} at ${time}, ${rosterTherapist} is free. To assign this slot to a child, click 'Manage Routine' on that child's row.`);
              },
              excludeScheduleId: null,
              childName: "Clinic Master Roster",
            })}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <Button onClick={() => setShowRosterModal(false)}>
                Close Roster
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

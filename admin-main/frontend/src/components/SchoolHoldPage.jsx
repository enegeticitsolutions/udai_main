import React, { useState, useEffect, useMemo, useRef } from "react";
import Badge from "./Badge";
import Button from "./Button";
import StatCard from "./StatCard";
import {
  getSchedules,
  createSchedule,
  patchSchedule,
  deleteSchedule,
  getAppointments,
} from "../services/adminApi";
import {
  CLINIC_THERAPISTS_ROSTER,
  getTherapistShiftWindow,
  isTherapistScheduledWorking,
} from "./AvailabilityManagerPage";
import {
  THERAPISTS,
  THERAPY_TYPES,
  getDefaultDiscipline,
  getTherapyStyle,
} from "./RecurringSlotsPage";

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

const STANDARD_TIMES = [
  "09:00",
  "09:45",
  "10:00",
  "10:45",
  "11:00",
  "11:45",
  "12:00",
  "12:45",
  "14:00",
  "14:45",
  "15:00",
  "15:45",
  "16:00",
  "16:45",
  "17:00",
  "17:45",
];

function calculateEndTime(startTime) {
  if (!startTime || !startTime.includes(":")) return "10:45";
  const [hStr, mStr] = startTime.split(":");
  const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 45;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function SchoolHoldPage({ therapists = [], onSwitchToRecurring }) {
  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCell, setSavingCell] = useState(null); // { id, field }
  const [saveSuccess, setSaveSuccess] = useState(null); // { id, field }

  // View Mode: "table" (School Batches Directory) vs "matrix" (Weekly Visual Hold Grid)
  const [viewMode, setViewMode] = useState("table");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTherapist, setFilterTherapist] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // Inline Cell Editing
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [tempValue, setTempValue] = useState("");
  const editInputRef = useRef(null);

  // Expanded row IDs for viewing/managing batch sessions inline
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());

  // Roster of therapists
  const therapistList = useMemo(() => {
    const list = CLINIC_THERAPISTS_ROSTER.map((t) => t.therapistName);
    if (Array.isArray(therapists) && therapists.length > 0) {
      therapists.forEach((t) => {
        const name = (t.name || t.therapistName || "").trim();
        if (name && !list.includes(name)) list.push(name);
      });
    }
    THERAPISTS.forEach((t) => {
      if (!list.includes(t)) list.push(t);
    });
    return list;
  }, [therapists]);

  // Active Therapist in Matrix view
  const [matrixTherapist, setMatrixTherapist] = useState(therapistList[0] || "Ms. Nikki");

  // Inline Add New School Batch Form
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    child_name: "DPS Special Wing - Batch A",
    parent_phone: "9876500001",
    slot_type: "School",
    therapy_type: "Special Education",
    therapist_id: therapistList[0] || "Ms. Nikki",
    recurring_slots: [
      {
        day_of_week: "Monday",
        start_time: "10:00",
        end_time: "10:45",
        therapy_name: "Special Education",
        therapist_id: therapistList[0] || "Ms. Nikki",
        slot_type: "School",
      },
    ],
    status: "ACTIVE",
    notes: "School Group Therapy & Institutional Routine",
  });

  // Dedicated Routine Management Modal for a Batch
  const [routineModal, setRoutineModal] = useState(null); // { schedule, slots: [] }
  const [modalTherapist, setModalTherapist] = useState(therapistList[0] || "Ms. Nikki");
  const [modalDiscipline, setModalDiscipline] = useState("Special Education");

  // Modal for quick 1-click hold from the weekly matrix
  const [quickHoldModal, setQuickHoldModal] = useState(null); // { day, time, therapist }
  const [quickBatchName, setQuickBatchName] = useState("School Routine Batch");
  const [quickNote, setQuickNote] = useState("Special Education & Routine Care");
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);

  // Fetch all schedules & live WhatsApp appointments
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [res, apptsRes] = await Promise.all([
        getSchedules(),
        getAppointments({ limit: 200 }).catch(() => ({ items: [] })),
      ]);
      const list = Array.isArray(res) ? res : res?.data || [];
      const apptsList = Array.isArray(apptsRes) ? apptsRes : apptsRes?.items || apptsRes?.data || [];
      setSchedules(list);
      setAppointments(apptsList);
    } catch (err) {
      setError(err?.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Focus input when inline cell editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Filter school-specific schedules
  const schoolBatches = useMemo(() => {
    return schedules.filter((s) => {
      const isSchool =
        (s.slot_type || s.slotType) === "School" ||
        /school/i.test(s.child_name || "") ||
        (s.recurring_slots || s.sessions || []).some(
          (slot) => (slot.slot_type || slot.slotType) === "School"
        );
      return isSchool;
    });
  }, [schedules]);

  // Global occupied map for collision detection: key = therapist_day_time
  const globalOccupiedMap = useMemo(() => {
    const map = {};

    // 1. Map Child Recurring Schedules & School Holds
    schedules.forEach((s) => {
      if (s.status === "PAUSED") return;
      const isSchool =
        (s.slot_type || s.slotType) === "School" ||
        /school/i.test(s.child_name || "");
      const slots = s.recurring_slots || s.sessions || [];
      slots.forEach((slot) => {
        const t = (slot.therapist_id || slot.therapistId || s.therapist_id || "")
          .toLowerCase()
          .replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "")
          .trim();
        const day = slot.day_of_week || slot.dayOfWeek;
        const time = slot.start_time || slot.startTime;
        const key = `${t}_${day}_${time}`;
        map[key] = {
          childName: s.child_name,
          isSchool: isSchool || (slot.slot_type || slot.slotType) === "School",
          scheduleId: s.id || s._id,
          schedule: s,
        };
      });
    });

    // 2. Cross-sync WhatsApp & Direct Appointments
    appointments.forEach((appt) => {
      const status = String(appt.bookingStatus || "").toLowerCase();
      if (status === "cancelled" || status === "rejected") return;

      const dateStr = appt.appointmentDate;
      const timeStr = appt.appointmentTime;
      const rawT = String(appt.therapistName || appt.assignedTherapist || "");
      const t = rawT.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();

      if (!dateStr || !timeStr || !t) return;

      const [yr, mo, dy] = dateStr.split("-").map(Number);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[new Date(yr, mo - 1, dy).getDay()];

      if (dayName && dayName !== "Sunday") {
        const key = `${t}_${dayName}_${timeStr}`;
        if (!map[key]) {
          map[key] = {
            childName: appt.patientName || "WhatsApp Patient",
            isSchool: false,
            isWhatsApp: true,
            date: dateStr,
            time: timeStr,
            source: appt.source || "WhatsApp",
            scheduleId: appt.id || appt._id,
          };
        }
      }
    });

    return map;
  }, [schedules, appointments]);

  // Real-time filtered batches
  const filteredBatches = useMemo(() => {
    let list = [...schoolBatches];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (b) =>
          (b.child_name || "").toLowerCase().includes(q) ||
          (b.parent_phone || "").includes(q) ||
          (b.notes || "").toLowerCase().includes(q)
      );
    }

    if (filterTherapist) {
      const tQ = filterTherapist.toLowerCase();
      list = list.filter((b) => {
        const slots = b.recurring_slots || b.sessions || [];
        return (
          (b.therapist_id || "").toLowerCase() === tQ ||
          slots.some((s) => (s.therapist_id || s.therapistId || "").toLowerCase() === tQ)
        );
      });
    }

    if (filterDay) {
      list = list.filter((b) => {
        const slots = b.recurring_slots || b.sessions || [];
        return slots.some((s) => (s.day_of_week || s.dayOfWeek) === filterDay);
      });
    }

    if (filterStatus) {
      list = list.filter((b) => (b.status || "ACTIVE") === filterStatus);
    }

    list.sort((a, b) => {
      const nameA = (a.child_name || "").toLowerCase();
      const nameB = (b.child_name || "").toLowerCase();
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return list;
  }, [schoolBatches, searchTerm, filterTherapist, filterDay, filterStatus, sortAsc]);

  // Metrics
  const metrics = useMemo(() => {
    let totalHeldSlots = 0;
    const therapistsWithSchool = new Set();
    let activeBatches = 0;
    let pausedBatches = 0;

    schoolBatches.forEach((s) => {
      if ((s.status || "ACTIVE") === "ACTIVE") activeBatches++;
      else pausedBatches++;

      const slots = s.recurring_slots || s.sessions || [];
      totalHeldSlots += slots.length;
      slots.forEach((slot) => {
        const t = slot.therapist_id || slot.therapistId || s.therapist_id;
        if (t) therapistsWithSchool.add(t);
      });
    });

    return {
      totalBatches: schoolBatches.length,
      activeBatches,
      pausedBatches,
      totalHeldSlots,
      therapistCount: therapistsWithSchool.size,
    };
  }, [schoolBatches]);

  // Flash save success helper
  const triggerSaveSuccess = (id, field) => {
    setSaveSuccess({ id, field });
    setTimeout(() => {
      setSaveSuccess((curr) => (curr?.id === id && curr?.field === field ? null : curr));
    }, 1500);
  };

  // Direct inline cell update (e.g. Batch name, Coordinator phone, Notes)
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
      loadData();
    } finally {
      setSavingCell(null);
    }
  };

  // Toggle status: ACTIVE (Held) vs PAUSED (Released)
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
      loadData();
    } finally {
      setSavingCell(null);
    }
  };

  // Delete / Release entire batch
  const handleDeleteBatch = async (schedule) => {
    const name = schedule.child_name || "this school batch";
    if (!confirm(`Are you sure you want to permanently delete/release "${name}"?\nAll reserved time slots will be immediately released.`)) {
      return;
    }

    const id = schedule.id || schedule._id;
    setSchedules((prev) => prev.filter((s) => String(s.id || s._id) !== String(id)));

    try {
      await deleteSchedule(id);
    } catch (err) {
      alert("Failed to delete schedule: " + err.message);
      loadData();
    }
  };

  // Save updated slots for a batch
  const handleUpdateSlots = async (scheduleId, updatedSlots) => {
    setSchedules((prev) =>
      prev.map((s) =>
        String(s.id || s._id) === String(scheduleId)
          ? { ...s, recurring_slots: updatedSlots, sessions: updatedSlots }
          : s
      )
    );

    setSavingCell({ id: scheduleId, field: "recurring_slots" });
    try {
      await patchSchedule(scheduleId, {
        recurring_slots: updatedSlots,
        sessions: updatedSlots,
        slot_type: "School",
      });
      triggerSaveSuccess(scheduleId, "recurring_slots");
    } catch (err) {
      alert("Failed to update slots: " + err.message);
      loadData();
    } finally {
      setSavingCell(null);
    }
  };

  // Create new school batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchData.child_name.trim()) {
      alert("Please enter a School / Batch Name.");
      return;
    }

    // Anti-collision guard: ensure none of the selected slots are already booked
    for (const s of newBatchData.recurring_slots) {
      const tClean = (s.therapist_id || newBatchData.therapist_id || "").toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
      const occ = globalOccupiedMap[`${tClean}_${s.day_of_week}_${s.start_time}`];
      if (occ) {
        alert(`⚠️ Collision prevented: ${s.day_of_week} at ${s.start_time} for ${s.therapist_id} is already booked (${occ.childName}).\nPlease choose an available slot.`);
        return;
      }
    }

    try {
      const payload = {
        child_name: newBatchData.child_name.trim(),
        parent_phone: newBatchData.parent_phone.trim() || "0000000000",
        slot_type: "School",
        therapy_type: newBatchData.therapy_type || "Special Education",
        therapist_id: newBatchData.therapist_id,
        recurring_slots: newBatchData.recurring_slots.map((s) => ({
          ...s,
          slot_type: "School",
          therapy_name: s.therapy_name || newBatchData.therapy_type,
        })),
        sessions: newBatchData.recurring_slots.map((s) => ({
          ...s,
          slot_type: "School",
          therapy_name: s.therapy_name || newBatchData.therapy_type,
        })),
        status: "ACTIVE",
        notes: newBatchData.notes.trim() || "School Group Hold",
      };

      await createSchedule(payload);
      setIsAddingBatch(false);
      await loadData();
    } catch (err) {
      alert("Failed to create school batch: " + err.message);
    }
  };

  // Quick 1-click hold submission from Weekly Matrix
  const handleConfirmQuickHold = async (e) => {
    e.preventDefault();
    if (!quickHoldModal) return;
    setIsSubmittingHold(true);
    try {
      const { day, time, therapist } = quickHoldModal;
      const tClean = therapist.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
      const occ = globalOccupiedMap[`${tClean}_${day}_${time}`];
      if (occ) {
        alert(`⚠️ Collision prevented: ${day} at ${time} for ${therapist} is already booked (${occ.childName}).`);
        setQuickHoldModal(null);
        return;
      }
      const bName = quickBatchName.trim() || "School Routine Batch";

      const existingBatch = schoolBatches.find(
        (s) => (s.child_name || "").toLowerCase() === bName.toLowerCase()
      );

      const newSlot = {
        day_of_week: day,
        dayOfWeek: day,
        start_time: time,
        startTime: time,
        end_time: calculateEndTime(time),
        endTime: calculateEndTime(time),
        therapy_name: "Special Education",
        therapy_type: "Special Education",
        therapist_id: therapist,
        therapistId: therapist,
        slot_type: "School",
        slotType: "School",
      };

      if (existingBatch) {
        const curSlots = existingBatch.recurring_slots || existingBatch.sessions || [];
        const updated = [...curSlots, newSlot];
        await patchSchedule(existingBatch.id || existingBatch._id, {
          recurring_slots: updated,
          sessions: updated,
          slot_type: "School",
        });
      } else {
        await createSchedule({
          child_name: bName,
          parent_phone: "0000000000",
          slot_type: "School",
          therapy_type: "Special Education",
          therapist_id: therapist,
          recurring_slots: [newSlot],
          sessions: [newSlot],
          status: "ACTIVE",
          notes: quickNote.trim(),
        });
      }

      setQuickHoldModal(null);
      await loadData();
    } catch (err) {
      alert("Failed to hold slot: " + err.message);
    } finally {
      setIsSubmittingHold(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Batch_Name", "Coordinator_Phone", "Status", "Day", "Time", "Therapist", "Discipline", "Notes"];
    const rows = [];

    schoolBatches.forEach((b) => {
      const slots = b.recurring_slots || b.sessions || [];
      if (slots.length === 0) {
        rows.push([
          `"${b.child_name || ""}"`,
          `"${b.parent_phone || ""}"`,
          `"${b.status || "ACTIVE"}"`,
          '""',
          '""',
          `"${b.therapist_id || ""}"`,
          `"${b.therapy_type || ""}"`,
          `"${(b.notes || "").replace(/"/g, '""')}"`,
        ]);
      } else {
        slots.forEach((s) => {
          rows.push([
            `"${b.child_name || ""}"`,
            `"${b.parent_phone || ""}"`,
            `"${b.status || "ACTIVE"}"`,
            `"${s.day_of_week || s.dayOfWeek || ""}"`,
            `"${s.start_time || s.startTime || ""}"`,
            `"${s.therapist_id || s.therapistId || b.therapist_id || ""}"`,
            `"${s.therapy_name || s.therapy_type || b.therapy_type || ""}"`,
            `"${(b.notes || "").replace(/"/g, '""')}"`,
          ]);
        });
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `School_Holds_UDAI_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle expanded row for sessions
  const toggleRowExpanded = (id) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open Routine Management Modal
  const openRoutineModal = (schedule) => {
    const rawSlots = schedule.recurring_slots || schedule.sessions || [];
    const normalized = rawSlots.map((s) => ({
      day_of_week: s.day_of_week || s.dayOfWeek || "Monday",
      start_time: s.start_time || s.startTime || "10:00",
      end_time: s.end_time || s.endTime || calculateEndTime(s.start_time || s.startTime || "10:00"),
      therapy_name: s.therapy_name || s.therapy_type || "Special Education",
      therapist_id: s.therapist_id || s.therapistId || schedule.therapist_id || therapistList[0],
      slot_type: "School",
    }));

    const initT = normalized[0]?.therapist_id || schedule.therapist_id || therapistList[0];
    setRoutineModal({
      schedule,
      slots: normalized,
    });
    setModalTherapist(initT);
    setModalDiscipline("Special Education");
  };

  // Toggle slot inside Routine Management Modal
  const handleModalSlotToggle = (day, time) => {
    if (!routineModal) return;
    const existingIdx = routineModal.slots.findIndex(
      (s) =>
        (s.day_of_week || s.dayOfWeek) === day &&
        (s.start_time || s.startTime) === time &&
        (s.therapist_id || s.therapistId || "").toLowerCase() === modalTherapist.toLowerCase()
    );

    let updatedSlots = [];
    if (existingIdx >= 0) {
      updatedSlots = routineModal.slots.filter((_, idx) => idx !== existingIdx);
    } else {
      const tClean = modalTherapist.toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
      const occ = globalOccupiedMap[`${tClean}_${day}_${time}`];
      if (occ && String(occ.scheduleId) !== String(routineModal.schedule.id || routineModal.schedule._id)) {
        alert(`⚠️ Collision prevented: ${day} at ${time} for ${modalTherapist} is already booked (${occ.childName}).`);
        return;
      }
      updatedSlots = [
        ...routineModal.slots,
        {
          day_of_week: day,
          dayOfWeek: day,
          start_time: time,
          startTime: time,
          end_time: calculateEndTime(time),
          endTime: calculateEndTime(time),
          therapy_name: modalDiscipline,
          therapy_type: modalDiscipline,
          therapist_id: modalTherapist,
          therapistId: modalTherapist,
          slot_type: "School",
          slotType: "School",
        },
      ];
    }

    setRoutineModal((prev) => ({ ...prev, slots: updatedSlots }));
  };

  // Save Modal Routine to backend
  const handleSaveModalRoutine = async () => {
    if (!routineModal) return;
    const id = routineModal.schedule.id || routineModal.schedule._id;
    await handleUpdateSlots(id, routineModal.slots);
    setRoutineModal(null);
  };

  return (
    <div className="section" style={{ maxWidth: "100%", paddingBottom: 60 }}>
      {/* Top Breadcrumb & Cross Navigation Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#92400e" }}>
              🏫 School &amp; Institutional Hold Hub
            </h2>
            <span
              style={{
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #f59e0b",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              🔒 100% WhatsApp Privacy Shield
            </span>
            <span
              style={{
                background: "#f3e8ff",
                color: "#7e22ce",
                border: "1px solid #d8b4fe",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              ₹0 Zero Admin Payment
            </span>
            {onSwitchToRecurring && (
              <button
                type="button"
                onClick={onSwitchToRecurring}
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #10b981",
                  color: "#065f46",
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(16, 185, 129, 0.15)",
                }}
              >
                <span>🔁 Open Recurring Slots Section ➔</span>
              </button>
            )}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Dedicated workspace to lock &amp; manage therapist time for school groups and institutional batches. Completely isolated from individual child therapy.
          </p>
        </div>

        {/* Action Tools & View Switcher */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Dual View Toggle */}
          <div
            style={{
              display: "flex",
              background: "#fffbeb",
              padding: 3,
              borderRadius: 8,
              border: "1px solid #fde68a",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "table" ? "#f59e0b" : "transparent",
                color: viewMode === "table" ? "#fff" : "#92400e",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📋 School Batches Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: viewMode === "matrix" ? "#f59e0b" : "transparent",
                color: viewMode === "matrix" ? "#fff" : "#92400e",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📅 Weekly Hold Grid
            </button>
          </div>

          <Button variant="secondary" onClick={handleExportCsv}>
            📤 Export CSV
          </Button>

          <Button
            onClick={() => {
              setViewMode("table");
              setIsAddingBatch(true);
            }}
            style={{
              background: "#d97706",
              borderColor: "#d97706",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            ➕ Add School Batch / Hold
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stat Cards - School Focused */}
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
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(245, 158, 11, 0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Held School Slots
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#92400e", margin: "4px 0 2px" }}>
              {metrics.totalHeldSlots}
            </div>
            <span style={{ fontSize: 11.5, color: "#78350f", fontWeight: 600 }}>
              🔒 Weekly slots locked for schools
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🏫
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
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Active School Batches
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.activeBatches}
            </div>
            <span style={{ fontSize: 11.5, color: "#059669", fontWeight: 600 }}>
              ✓ {metrics.totalBatches} total groups enrolled
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🎒
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
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Therapists Assigned
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "4px 0 2px" }}>
              {metrics.therapistCount}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>
              Conducting school sessions
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            👩‍⚕️
          </div>
        </div>

        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(59, 130, 246, 0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 0.5 }}>
              WhatsApp Privacy Shield
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af", margin: "4px 0 2px" }}>
              100% Excluded
            </div>
            <span style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 600 }}>
              Never bookable by public users
            </span>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#dbeafe", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🛡️
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: SCHOOL BATCHES TABLE (Primary Hero Spreadsheet View) */}
      {/* ============================================================ */}
      {viewMode === "table" && (
        <>
          {/* Search & Filter Toolbar */}
          <div
            style={{
              background: "#fffdfa",
              border: "1px solid #fed7aa",
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
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#b45309", fontSize: 14 }}>
                🔍
              </span>
              <input
                type="text"
                placeholder="Search school batch, class, coordinator phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 8,
                  border: "1px solid #fcd34d",
                  background: "#fff",
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

            {/* Filter Dropdowns */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={filterTherapist}
                onChange={(e) => setFilterTherapist(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #fcd34d",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: filterTherapist ? "#b45309" : "var(--text)",
                }}
              >
                <option value="">👤 All Therapists</option>
                {therapistList.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #fcd34d",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: filterDay ? "#b45309" : "var(--text)",
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
                  border: "1px solid #fcd34d",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: filterStatus ? "#b45309" : "var(--text)",
                }}
              >
                <option value="">⚡ All Statuses</option>
                <option value="ACTIVE">● ACTIVE (Held)</option>
                <option value="PAUSED">⏸ PAUSED (Released)</option>
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
                  Reset
                </button>
              )}

              <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700, marginLeft: 4 }}>
                ({filteredBatches.length} {filteredBatches.length === 1 ? "batch" : "batches"})
              </span>
            </div>
          </div>

          {/* School Batches Table */}
          <div className="table-wrap" style={{ border: "1px solid #fed7aa", borderRadius: 12, overflow: "auto", background: "var(--surface)" }}>
            <table className="excel-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#fffbeb", borderBottom: "2px solid #fde68a", textAlign: "left" }}>
                  <th style={{ width: 44, padding: "12px 8px", textAlign: "center", color: "#b45309", fontWeight: 800 }}>#</th>
                  <th
                    style={{ width: 250, padding: "12px 12px", fontWeight: 800, color: "#92400e", cursor: "pointer", userSelect: "none" }}
                    onClick={() => setSortAsc((prev) => !prev)}
                    title="Click to sort A-Z or Z-A"
                  >
                    School Batch &amp; Coordinator {sortAsc ? "▲ (A-Z)" : "▼ (Z-A)"} ✎
                  </th>
                  <th style={{ minWidth: 420, padding: "12px 12px", fontWeight: 800, color: "#92400e" }}>
                    Reserved Weekly Routine (Day • Time • Therapy • Therapist)
                  </th>
                  <th style={{ width: 110, padding: "12px 10px", textAlign: "center", fontWeight: 800, color: "#92400e" }}>Weekly Load</th>
                  <th style={{ width: 110, padding: "12px 8px", textAlign: "center", fontWeight: 800, color: "#92400e" }}>Hold Status ⚡</th>
                  <th style={{ width: 140, padding: "12px 8px", textAlign: "center", fontWeight: 800, color: "#92400e" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Inline Add New School Batch Row */}
                {isAddingBatch && (
                  <tr style={{ background: "#fffbeb", borderBottom: "2px solid #f59e0b" }}>
                    <td style={{ textAlign: "center", fontWeight: 800, color: "#d97706", fontSize: 16 }}>★</td>
                    {/* Batch Name & Coordinator Phone */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          type="text"
                          placeholder="School Batch Name (e.g. DPS Wing A)"
                          value={newBatchData.child_name}
                          onChange={(e) => setNewBatchData((d) => ({ ...d, child_name: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d97706", fontWeight: 700 }}
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="Coordinator Phone (e.g. 9876500001)"
                          value={newBatchData.parent_phone}
                          onChange={(e) => setNewBatchData((d) => ({ ...d, parent_phone: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d97706", fontFamily: "monospace" }}
                        />
                      </div>
                    </td>
                    {/* Multi-slot routine builder */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {newBatchData.recurring_slots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#fff",
                              border: "1px solid #fcd34d",
                              padding: "6px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ fontWeight: 800, color: "#b45309", width: 16 }}>{sIdx + 1}.</span>
                            <select
                              value={slot.day_of_week}
                              onChange={(e) => {
                                const updated = [...newBatchData.recurring_slots];
                                updated[sIdx].day_of_week = e.target.value;
                                setNewBatchData((d) => ({ ...d, recurring_slots: updated }));
                              }}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 700, color: "#b45309" }}
                            >
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d} value={d}>{d.slice(0, 3)}</option>
                              ))}
                            </select>
                            <select
                              value={slot.start_time}
                              onChange={(e) => {
                                const updated = [...newBatchData.recurring_slots];
                                updated[sIdx].start_time = e.target.value;
                                updated[sIdx].end_time = calculateEndTime(e.target.value);
                                setNewBatchData((d) => ({ ...d, recurring_slots: updated }));
                              }}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 600 }}
                            >
                              {STANDARD_TIMES.map((time) => {
                                const tClean = (slot.therapist_id || newBatchData.therapist_id || "").toLowerCase().replace(/^(dr\.|mr\.|ms\.|mrs\.)\s*/i, "").trim();
                                const occ = globalOccupiedMap[`${tClean}_${slot.day_of_week}_${time}`];
                                return (
                                  <option key={time} value={time} disabled={Boolean(occ)}>
                                    {time} {occ ? (occ.isWhatsApp ? "(🔒 Booked on WA)" : occ.isSchool ? "(🏫 School Held)" : "(🔒 Booked)") : "(✓ Free)"}
                                  </option>
                                );
                              })}
                            </select>
                            <select
                              value={slot.therapy_name}
                              onChange={(e) => {
                                const updated = [...newBatchData.recurring_slots];
                                updated[sIdx].therapy_name = e.target.value;
                                setNewBatchData((d) => ({ ...d, recurring_slots: updated }));
                              }}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 600 }}
                            >
                              {THERAPY_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                            <select
                              value={slot.therapist_id}
                              onChange={(e) => {
                                const updated = [...newBatchData.recurring_slots];
                                updated[sIdx].therapist_id = e.target.value;
                                setNewBatchData((d) => ({ ...d, recurring_slots: updated }));
                              }}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", fontWeight: 700, color: "var(--accent)" }}
                            >
                              {therapistList.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            {newBatchData.recurring_slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewBatchData((d) => ({
                                    ...d,
                                    recurring_slots: d.recurring_slots.filter((_, idx) => idx !== sIdx),
                                  }));
                                }}
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 800 }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setNewBatchData((d) => ({
                              ...d,
                              recurring_slots: [
                                ...d.recurring_slots,
                                {
                                  day_of_week: "Wednesday",
                                  start_time: "11:00",
                                  end_time: "11:45",
                                  therapy_name: "Special Education",
                                  therapist_id: therapistList[0] || "Ms. Nikki",
                                  slot_type: "School",
                                },
                              ],
                            }));
                          }}
                          style={{
                            alignSelf: "flex-start",
                            padding: "3px 8px",
                            borderRadius: 4,
                            border: "1px dashed #d97706",
                            background: "transparent",
                            color: "#b45309",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Add Another Weekly Slot
                        </button>
                      </div>
                    </td>
                    {/* Weekly load summary */}
                    <td style={{ textAlign: "center", fontWeight: 800, color: "#b45309" }}>
                      {newBatchData.recurring_slots.length} slots
                    </td>
                    {/* Status */}
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#059669", background: "#d1fae5", padding: "3px 8px", borderRadius: 6 }}>
                        ACTIVE
                      </span>
                    </td>
                    {/* Save / Cancel buttons */}
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <Button onClick={handleCreateBatch} style={{ padding: "5px 12px", fontSize: 12, background: "#d97706", borderColor: "#d97706" }}>
                          Save
                        </Button>
                        <Button variant="secondary" onClick={() => setIsAddingBatch(false)} style={{ padding: "5px 10px", fontSize: 12 }}>
                          ✕
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Rows for Existing School Batches */}
                {filteredBatches.length === 0 && !isAddingBatch ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}>
                      {loading ? (
                        <span>⏳ Loading school batches...</span>
                      ) : (
                        <div>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>🏫</div>
                          <strong style={{ display: "block", color: "var(--text)" }}>No School Holds Found</strong>
                          <p style={{ margin: "4px 0 12px", fontSize: 13 }}>
                            {searchTerm || filterTherapist || filterDay || filterStatus
                              ? "Try adjusting your search filters above."
                              : "No school batches have been reserved yet. Click 'Add School Batch / Hold' to create one."}
                          </p>
                          <Button
                            onClick={() => setIsAddingBatch(true)}
                            style={{ background: "#d97706", borderColor: "#d97706", color: "#fff" }}
                          >
                            ➕ Add School Batch / Hold
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch, index) => {
                    const id = batch.id || batch._id;
                    const slots = batch.recurring_slots || batch.sessions || [];
                    const isExpanded = expandedRowIds.has(id);
                    const isPaused = batch.status === "PAUSED";
                    const isEditingName = editingCell?.id === id && editingCell?.field === "child_name";
                    const isEditingPhone = editingCell?.id === id && editingCell?.field === "parent_phone";

                    return (
                      <React.Fragment key={id || index}>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--line)",
                            background: isPaused ? "#f8fafc" : "#fff",
                            opacity: isPaused ? 0.75 : 1,
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Row Number */}
                          <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>
                            {index + 1}
                          </td>

                          {/* Batch Name & Coordinator Phone (with inline edit) */}
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {/* Batch Name */}
                              {isEditingName ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => handleCellSave(id, "child_name", tempValue.trim())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCellSave(id, "child_name", tempValue.trim());
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  style={{ padding: "4px 6px", borderRadius: 4, border: "1px solid #d97706", fontWeight: 700 }}
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ id, field: "child_name" });
                                    setTempValue(batch.child_name || "");
                                  }}
                                  style={{
                                    fontWeight: 800,
                                    color: "#92400e",
                                    fontSize: 13.5,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                  }}
                                  title="Click to inline edit school batch name"
                                >
                                  <span>🏫 {batch.child_name || "School Batch"}</span>
                                  {saveSuccess?.id === id && saveSuccess?.field === "child_name" && (
                                    <span style={{ fontSize: 10, color: "#059669" }}>✓</span>
                                  )}
                                </div>
                              )}

                              {/* Coordinator Phone */}
                              {isEditingPhone ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => handleCellSave(id, "parent_phone", tempValue.trim())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCellSave(id, "parent_phone", tempValue.trim());
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #d97706", fontSize: 11 }}
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ id, field: "parent_phone" });
                                    setTempValue(batch.parent_phone || "");
                                  }}
                                  style={{
                                    fontSize: 11,
                                    color: "var(--muted)",
                                    fontFamily: "monospace",
                                    cursor: "pointer",
                                  }}
                                  title="Click to edit coordinator phone"
                                >
                                  📞 {batch.parent_phone || "No phone added"}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Reserved Weekly Routine Pills */}
                          <td style={{ padding: "10px 12px" }}>
                            {slots.length === 0 ? (
                              <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                                No slots assigned yet. Click "Manage Routine" to allocate.
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                {slots.map((s, sIdx) => {
                                  const day = s.day_of_week || s.dayOfWeek || "Mon";
                                  const time = s.start_time || s.startTime || "10:00";
                                  const tName = s.therapist_id || s.therapistId || batch.therapist_id || "Therapist";
                                  const th = s.therapy_name || s.therapy_type || "Special Ed";

                                  return (
                                    <span
                                      key={sIdx}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        background: "#fffbeb",
                                        border: "1px solid #fde68a",
                                        color: "#92400e",
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                      }}
                                    >
                                      <span>🏫 {day.slice(0, 3)} {time}</span>
                                      <span style={{ fontSize: 10, color: "#b45309", opacity: 0.85 }}>({tName})</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextSlots = slots.filter((_, idx) => idx !== sIdx);
                                          handleUpdateSlots(id, nextSlots);
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#ef4444",
                                          cursor: "pointer",
                                          padding: 0,
                                          marginLeft: 2,
                                          fontWeight: 800,
                                          fontSize: 11,
                                        }}
                                        title="Release this slot"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Weekly Load */}
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 800,
                              }}
                            >
                              {slots.length} {slots.length === 1 ? "slot" : "slots"} / wk
                            </span>
                          </td>

                          {/* Hold Status Toggle */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(batch)}
                              style={{
                                border: "none",
                                background: isPaused ? "#f1f5f9" : "#dcfce7",
                                color: isPaused ? "#64748b" : "#15803d",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title={isPaused ? "Click to Activate & Lock Slots" : "Click to Pause / Release Slots"}
                            >
                              {isPaused ? "⏸ PAUSED" : "● ACTIVE"}
                            </button>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => openRoutineModal(batch)}
                                style={{
                                  background: "#fff",
                                  border: "1px solid #f59e0b",
                                  color: "#b45309",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Open visual slot manager for this batch"
                              >
                                ✎ Manage
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch)}
                                style={{
                                  background: "#fff",
                                  border: "1px solid #fecdd3",
                                  color: "#e11d48",
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Release all slots & delete batch"
                              >
                                ✕ Release
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: WEEKLY VISUAL HOLD GRID (Clean, Non-Cluttered Matrix) */}
      {/* ============================================================ */}
      {viewMode === "matrix" && (
        <div style={{ marginTop: 6 }}>
          {/* Therapist Selection Pills */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
              Select Therapist to View &amp; Hold Weekly School Slots:
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
              {therapistList.map((tName) => {
                const isSelected = matrixTherapist === tName;
                // Count school slots for this therapist
                let schoolSlotCount = 0;
                schoolBatches.forEach((b) => {
                  const slots = b.recurring_slots || b.sessions || [];
                  slots.forEach((s) => {
                    if ((s.therapist_id || s.therapistId || b.therapist_id) === tName) {
                      schoolSlotCount++;
                    }
                  });
                });

                return (
                  <button
                    key={tName}
                    type="button"
                    onClick={() => setMatrixTherapist(tName)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: isSelected ? "2px solid #d97706" : "1px solid var(--line)",
                      background: isSelected ? "#fffbeb" : "var(--surface)",
                      color: isSelected ? "#92400e" : "var(--text)",
                      fontWeight: 800,
                      fontSize: 12.5,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: isSelected ? "0 1px 3px rgba(217, 119, 6, 0.15)" : "none",
                    }}
                  >
                    <span>{isSelected ? "🏫 " : ""}{tName}</span>
                    {schoolSlotCount > 0 && (
                      <span
                        style={{
                          background: isSelected ? "#d97706" : "#fef3c7",
                          color: isSelected ? "#fff" : "#92400e",
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {schoolSlotCount} held
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matrix Header Notice */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                📅 {matrixTherapist}'s Weekly School Availability Roster
              </span>
              <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>
                🕒 Shift: {getTherapistShiftWindow(matrixTherapist)}
              </span>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#b45309" }}>
              💡 Click any available slot to hold for School | Click held slot to release
            </span>
          </div>

          {/* Matrix Grid Table */}
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "center" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)" }}>
                  <th style={{ width: 110, padding: "10px", textAlign: "left", color: "var(--muted)", fontWeight: 700 }}>
                    Shift Time
                  </th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d} style={{ padding: "10px 6px", fontWeight: 700 }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STANDARD_TIMES.map((time) => {
                  const endTime = calculateEndTime(time);
                  return (
                    <tr key={time} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "var(--muted)",
                          background: "var(--surface-2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {time} - {endTime}
                      </td>

                      {DAYS_OF_WEEK.map((day) => {
                        const dayIdx = DAY_NAME_TO_INDEX[day];
                        const isWorking = isTherapistScheduledWorking(matrixTherapist, null, dayIdx);

                        if (!isWorking) {
                          return (
                            <td key={day} style={{ padding: "4px 5px", background: "rgba(0,0,0,0.015)" }}>
                              <div
                                style={{
                                  padding: "6px 2px",
                                  borderRadius: 6,
                                  background: "#f1f5f9",
                                  color: "#94a3b8",
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                Off
                              </div>
                            </td>
                          );
                        }

                        const occ = globalOccupiedMap[`${matrixTherapist.toLowerCase()}_${day}_${time}`];

                        if (occ) {
                          if (occ.isSchool) {
                            return (
                              <td key={day} style={{ padding: "4px 5px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`🏫 Slot "${day} ${time}" is held for "${occ.childName}".\n\nRelease this School Hold?`)) {
                                      const curSlots = occ.schedule.recurring_slots || occ.schedule.sessions || [];
                                      const nextSlots = curSlots.filter(
                                        (s) => !((s.day_of_week || s.dayOfWeek) === day && (s.start_time || s.startTime) === time)
                                      );
                                      handleUpdateSlots(occ.scheduleId, nextSlots);
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "6px 4px",
                                    borderRadius: 6,
                                    background: "#fef3c7",
                                    border: "1px solid #f59e0b",
                                    color: "#92400e",
                                    fontWeight: 800,
                                    fontSize: 11,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                  }}
                                  title={`Held for School: "${occ.childName}". Click to release.`}
                                >
                                  <span>🏫 {occ.childName.slice(0, 9)}</span>
                                  <span style={{ color: "#b45309", fontWeight: 800 }}>✕</span>
                                </button>
                              </td>
                            );
                          }

                          if (occ.isWhatsApp) {
                            return (
                              <td key={day} style={{ padding: "4px 5px" }}>
                                <div
                                  style={{
                                    width: "100%",
                                    padding: "6px 4px",
                                    borderRadius: 6,
                                    background: "#dcf8c6",
                                    border: "1px solid #25d366",
                                    color: "#128c7e",
                                    fontWeight: 800,
                                    fontSize: 10.5,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={`Booked on WhatsApp for: "${occ.childName}" on ${occ.date} (${occ.time})`}
                                >
                                  💬 {occ.childName.length > 7 ? `${occ.childName.slice(0, 6)}…` : occ.childName} (WA)
                                </div>
                              </td>
                            );
                          }

                          // Occupied by regular child therapy
                          return (
                            <td key={day} style={{ padding: "4px 5px" }}>
                              <div
                                style={{
                                  width: "100%",
                                  padding: "6px 4px",
                                  borderRadius: 6,
                                  background: "#f1f5f9",
                                  border: "1px solid #e2e8f0",
                                  color: "#64748b",
                                  fontWeight: 600,
                                  fontSize: 10.5,
                                }}
                                title={`Occupied by regular patient: "${occ.childName}"`}
                              >
                                🔒 Child Therapy
                              </div>
                            </td>
                          );
                        }

                        // Free Shift Slot - Clean, non-intrusive styling
                        return (
                          <td key={day} style={{ padding: "4px 5px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickHoldModal({ day, time, therapist: matrixTherapist });
                                setQuickBatchName("School Routine Batch");
                                setQuickNote("Special Education & Routine Care");
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 4px",
                                borderRadius: 6,
                                background: "#fff",
                                border: "1px solid var(--line)",
                                color: "var(--muted)",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#f59e0b";
                                e.currentTarget.style.color = "#b45309";
                                e.currentTarget.style.background = "#fffbeb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--line)";
                                e.currentTarget.style.color = "var(--muted)";
                                e.currentTarget.style.background = "#fff";
                              }}
                              title={`Click to hold ${day} ${time} for School`}
                            >
                              + Hold
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
      )}

      {/* ============================================================ */}
      {/* MODAL 1: Quick 1-Click Hold Modal from Matrix */}
      {/* ============================================================ */}
      {quickHoldModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #fde68a",
              maxWidth: 440,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏫</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#92400e" }}>
                  Confirm School Slot Hold
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickHoldModal(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, border: "1px solid #fde68a", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                📅 {quickHoldModal.day} at {quickHoldModal.time} - {calculateEndTime(quickHoldModal.time)}
              </div>
              <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                👤 Assigned Therapist: <strong>{quickHoldModal.therapist}</strong>
              </div>
              <div style={{ fontSize: 11, color: "#78350f", marginTop: 6 }}>
                🔒 This slot will be 100% hidden from WhatsApp &amp; public bookings without requiring any payment.
              </div>
            </div>

            <form onSubmit={handleConfirmQuickHold}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>
                  School / Batch Name
                </label>
                <input
                  type="text"
                  value={quickBatchName}
                  onChange={(e) => setQuickBatchName(e.target.value)}
                  placeholder="e.g. DPS Special Wing - Batch A"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #fcd34d",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>
                  Notes / Institutional Purpose
                </label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="e.g. Special Education & Routine Care"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setQuickHoldModal(null)} type="button">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingHold}
                  style={{ background: "#d97706", borderColor: "#d97706", color: "#fff", fontWeight: 800 }}
                >
                  {isSubmittingHold ? "Reserving..." : "Confirm School Hold"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: Dedicated Routine Management Modal (Slot Picker)     */}
      {/* ============================================================ */}
      {routineModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #fde68a",
              maxWidth: 880,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#92400e" }}>
                  Manage School Routine: {routineModal.schedule.child_name}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Click slots in the weekly matrix below to add or remove them from this batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoutineModal(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Therapist & Discipline Selector Bar */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                background: "#fffbeb",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #fde68a",
                marginBottom: 14,
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 3 }}>
                  Select Therapist
                </label>
                <select
                  value={modalTherapist}
                  onChange={(e) => setModalTherapist(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #f59e0b",
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: "#fff",
                    color: "#92400e",
                  }}
                >
                  {therapistList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#b45309", marginBottom: 3 }}>
                  Discipline / Therapy
                </label>
                <select
                  value={modalDiscipline}
                  onChange={(e) => setModalDiscipline(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #f59e0b",
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: "#fff",
                    color: "#92400e",
                  }}
                >
                  {THERAPY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: "#92400e" }}>
                Total Allocated: {routineModal.slots.length} slots
              </div>
            </div>

            {/* Interactive Grid inside Modal */}
            <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, textAlign: "center" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ width: 90, padding: 8, textAlign: "left", color: "var(--muted)" }}>Time</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d} style={{ padding: "8px 4px", fontWeight: 700 }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STANDARD_TIMES.map((time) => (
                    <tr key={time} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--muted)", background: "var(--surface-2)" }}>
                        {time}
                      </td>
                      {DAYS_OF_WEEK.map((day) => {
                        const dayIdx = DAY_NAME_TO_INDEX[day];
                        const isWorking = isTherapistScheduledWorking(modalTherapist, null, dayIdx);
                        if (!isWorking) {
                          return (
                            <td key={day} style={{ padding: 3, background: "#f8fafc" }}>
                              <span style={{ fontSize: 9.5, color: "#94a3b8" }}>Off</span>
                            </td>
                          );
                        }

                        // Is this slot currently in this batch?
                        const isSelectedInBatch = routineModal.slots.some(
                          (s) =>
                            (s.day_of_week || s.dayOfWeek) === day &&
                            (s.start_time || s.startTime) === time &&
                            (s.therapist_id || s.therapistId || "").toLowerCase() === modalTherapist.toLowerCase()
                        );

                        // Is occupied by someone else?
                        const occ = globalOccupiedMap[`${modalTherapist.toLowerCase()}_${day}_${time}`];
                        const isOccupiedByOther =
                          occ &&
                          String(occ.scheduleId) !== String(routineModal.schedule.id || routineModal.schedule._id);

                        if (isSelectedInBatch) {
                          return (
                            <td key={day} style={{ padding: 3 }}>
                              <button
                                type="button"
                                onClick={() => handleModalSlotToggle(day, time)}
                                style={{
                                  width: "100%",
                                  padding: "5px 2px",
                                  borderRadius: 5,
                                  background: "#fef3c7",
                                  border: "1px solid #f59e0b",
                                  color: "#92400e",
                                  fontWeight: 800,
                                  fontSize: 10.5,
                                  cursor: "pointer",
                                }}
                                title="Click to remove from this batch"
                              >
                                ✓ Held ✕
                              </button>
                            </td>
                          );
                        }

                        if (isOccupiedByOther) {
                          const isWA = occ.isWhatsApp;
                          return (
                            <td key={day} style={{ padding: 3 }}>
                              <div
                                style={{
                                  padding: "5px 2px",
                                  borderRadius: 5,
                                  background: isWA ? "#dcf8c6" : "#f1f5f9",
                                  color: isWA ? "#128c7e" : "#94a3b8",
                                  fontWeight: isWA ? 700 : 500,
                                  fontSize: 10,
                                }}
                                title={isWA ? `Booked on WhatsApp: ${occ.childName} on ${occ.date} (${occ.time})` : `Occupied by: ${occ.childName}`}
                              >
                                {isWA ? "💬 WA Booked" : "🔒 Taken"}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={day} style={{ padding: 3 }}>
                            <button
                              type="button"
                              onClick={() => handleModalSlotToggle(day, time)}
                              style={{
                                width: "100%",
                                padding: "5px 2px",
                                borderRadius: 5,
                                background: "#fff",
                                border: "1px solid var(--line)",
                                color: "var(--muted)",
                                fontSize: 10.5,
                                cursor: "pointer",
                              }}
                              title="Click to add to this batch"
                            >
                              +
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <Button variant="secondary" onClick={() => setRoutineModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveModalRoutine}
                style={{ background: "#d97706", borderColor: "#d97706", color: "#fff", fontWeight: 800 }}
              >
                Save &amp; Lock Routine
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
} from "../services/adminApi";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const THERAPISTS = [
  "Ms. Nikki",
  "Ms. Harsimran",
  "Ms. Divya",
  "Ms. Shobha",
  "Ms. Ranjana",
  "Mr. Atal",
  "Ms. Sakshi",
  "Mr. Durgesh",
  "Ms. Tanu Rajput",
  "Ms. Sonia",
  "Ms. Anamika",
  "Ms. Promila",
];

const THERAPY_TYPES = [
  "Occupational Therapy",
  "Speech Therapy",
  "Physiotherapy",
  "Physical Therapy",
  "Special Education",
  "Special Educator",
  "Counselling",
  "Remedial & Academic Support",
];

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

  // New row inline creation
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    child_name: "",
    parent_phone: "",
    therapist_id: THERAPISTS[0],
    therapy_type: THERAPY_TYPES[0],
    recurring_slots: [{ day_of_week: "Monday", start_time: "10:00", end_time: "10:45" }],
    status: "ACTIVE",
    notes: "",
  });

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

  // Load schedules
  const fetchSchedules = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getSchedules();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSchedules(list);
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

  // Recurring slots inline update
  const handleSlotsUpdate = async (schedule, updatedSlots) => {
    const id = schedule.id || schedule._id;
    setSchedules((prev) =>
      prev.map((s) => (String(s.id || s._id) === String(id) ? { ...s, recurring_slots: updatedSlots } : s))
    );

    setSavingCell({ id, field: "recurring_slots" });
    try {
      await patchSchedule(id, { recurring_slots: updatedSlots });
      triggerSaveSuccess(id, "recurring_slots");
    } catch (err) {
      alert("Failed to save slots: " + err.message);
      fetchSchedules();
    } finally {
      setSavingCell(null);
    }
  };

  // Add slot to row (max 3)
  const handleAddSlotToRow = (schedule) => {
    const currentSlots = schedule.recurring_slots || [];
    if (currentSlots.length >= 3) {
      alert("Maximum 3 recurring slots permitted per child.");
      return;
    }
    // pick next day not already used
    const usedDays = currentSlots.map((s) => s.day_of_week);
    const nextDay = DAYS_OF_WEEK.find((d) => !usedDays.includes(d)) || "Monday";
    const nextSlots = [
      ...currentSlots,
      { day_of_week: nextDay, start_time: "10:00", end_time: "10:45" },
    ];
    handleSlotsUpdate(schedule, nextSlots);
  };

  // Remove slot from row (min 1)
  const handleRemoveSlotFromRow = (schedule, slotIndex) => {
    const currentSlots = schedule.recurring_slots || [];
    if (currentSlots.length <= 1) {
      alert("At least 1 recurring slot is required. You can pause the schedule if inactive.");
      return;
    }
    const nextSlots = currentSlots.filter((_, idx) => idx !== slotIndex);
    handleSlotsUpdate(schedule, nextSlots);
  };

  // Modify individual slot day or time
  const handleSlotFieldChange = (schedule, slotIndex, subField, subVal) => {
    const currentSlots = [...(schedule.recurring_slots || [])];
    const target = { ...currentSlots[slotIndex] };
    target[subField] = subVal;
    if (subField === "start_time") {
      target.end_time = calculateEndTime(subVal);
    }
    currentSlots[slotIndex] = target;
    handleSlotsUpdate(schedule, currentSlots);
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
        therapist_id: THERAPISTS[0],
        therapy_type: THERAPY_TYPES[0],
        recurring_slots: [{ day_of_week: "Monday", start_time: "10:00", end_time: "10:45" }],
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
      const therapist = String(s.therapist_id || "").toLowerCase();
      const st = String(s.status || "").toUpperCase();

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!name.includes(query) && !phone.includes(query) && !therapist.includes(query)) {
          return false;
        }
      }
      if (filterTherapist && !therapist.includes(filterTherapist.toLowerCase())) {
        return false;
      }
      if (filterStatus && st !== filterStatus.toUpperCase()) {
        return false;
      }
      if (filterDay) {
        const hasDay = (s.recurring_slots || []).some((slot) => slot.day_of_week === filterDay);
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
        totalSlots += (s.recurring_slots || []).length;
        const t = s.therapist_id || "Unassigned";
        therapistCounts[t] = (therapistCounts[t] || 0) + 1;
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
    const headers = [
      "Child Name",
      "Parent Phone",
      "Therapist",
      "Therapy Type",
      "Slot 1 Day",
      "Slot 1 Time",
      "Slot 2 Day",
      "Slot 2 Time",
      "Slot 3 Day",
      "Slot 3 Time",
      "Status",
      "Notes",
    ];

    const rows = filteredSchedules.map((s) => {
      const s1 = s.recurring_slots?.[0] || {};
      const s2 = s.recurring_slots?.[1] || {};
      const s3 = s.recurring_slots?.[2] || {};
      return [
        `"${(s.child_name || "").replace(/"/g, '""')}"`,
        `"${(s.parent_phone || "").replace(/"/g, '""')}"`,
        `"${(s.therapist_id || "").replace(/"/g, '""')}"`,
        `"${(s.therapy_type || "").replace(/"/g, '""')}"`,
        `"${s1.day_of_week || ""}"`,
        `"${s1.start_time ? `${s1.start_time}-${s1.end_time || ""}` : ""}"`,
        `"${s2.day_of_week || ""}"`,
        `"${s2.start_time ? `${s2.start_time}-${s2.end_time || ""}` : ""}"`,
        `"${s3.day_of_week || ""}"`,
        `"${s3.start_time ? `${s3.start_time}-${s3.end_time || ""}` : ""}"`,
        `"${s.status || "ACTIVE"}"`,
        `"${(s.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `udai_recurring_schedules_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Raw Text / CSV for Bulk Import
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
        // Split by comma or tab (handles Excel paste)
        const parts = line.includes("\t")
          ? line.split("\t").map((p) => p.trim())
          : line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));

        if (!parts[0] || !parts[1]) continue;

        const child_name = parts[0];
        const parent_phone = parts[1];
        const therapist_id = parts[2] || THERAPISTS[0];
        const therapy_type = parts[3] || THERAPY_TYPES[0];

        // Format slots
        const slots = [];
        if (parts[4]) {
          const slot1Day = parts[4];
          const slot1Time = parts[5] || "10:00";
          const [st, et] = slot1Time.split("-");
          slots.push({
            day_of_week: DAYS_OF_WEEK.find((d) => d.toLowerCase().startsWith(slot1Day.toLowerCase())) || "Monday",
            start_time: st || "10:00",
            end_time: et || calculateEndTime(st || "10:00"),
          });
        }
        if (parts[6]) {
          const slot2Day = parts[6];
          const slot2Time = parts[7] || "10:00";
          const [st, et] = slot2Time.split("-");
          slots.push({
            day_of_week: DAYS_OF_WEEK.find((d) => d.toLowerCase().startsWith(slot2Day.toLowerCase())) || "Wednesday",
            start_time: st || "10:00",
            end_time: et || calculateEndTime(st || "10:00"),
          });
        }
        if (parts[8]) {
          const slot3Day = parts[8];
          const slot3Time = parts[9] || "10:00";
          const [st, et] = slot3Time.split("-");
          slots.push({
            day_of_week: DAYS_OF_WEEK.find((d) => d.toLowerCase().startsWith(slot3Day.toLowerCase())) || "Friday",
            start_time: st || "10:00",
            end_time: et || calculateEndTime(st || "10:00"),
          });
        }

        if (slots.length === 0) {
          slots.push({ day_of_week: "Monday", start_time: "10:00", end_time: "10:45" });
        }

        const status = (parts[10] || "ACTIVE").toUpperCase().includes("PAUS") ? "PAUSED" : "ACTIVE";
        const notes = parts[11] || "";

        parsed.push({
          child_name,
          parent_phone,
          therapist_id,
          therapy_type,
          recurring_slots: slots,
          status,
          notes,
        });
      }

      setBulkParsedRows(parsed);
    } catch (e) {
      setBulkParseError("Failed to parse CSV: " + e.message);
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
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div>
          <h2>Recurring Weekly Slot Reservations</h2>
          <p className="section-copy">
            Excel-style editable spreadsheet with automated anti-collision logic & WhatsApp MSG91 bot synchronization.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="secondary" onClick={() => setShowSlotInspector(!showSlotInspector)}>
            🛡️ Slot Anti-Collision Check
          </Button>
          <Button variant="secondary" onClick={() => setShowBotSimulator(!showBotSimulator)}>
            💬 WhatsApp Bot Simulator
          </Button>
          <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
            📥 Bulk Import CSV
          </Button>
          <Button variant="secondary" onClick={handleExportCsv}>
            📤 Export CSV
          </Button>
          <Button onClick={() => setIsAddingRow(true)}>
            ➕ Add New Child Row
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Active Returning Kids" value={metrics.active} change={`Out of ${metrics.total} total`} />
        <StatCard label="Weekly Reserved Slots" value={metrics.totalSlots} change="Locked from public booking" />
        <StatCard label="Therapists Assigned" value={metrics.therapistCount} change="Active schedules" />
        <StatCard label="Paused Schedules" value={metrics.paused} change="Temporarily on hold" />
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

      {/* Search & Real-Time Filter Bar */}
      <div className="filter-bar" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Real-time search child name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }}
          />
        </div>

        <select
          className="input-field"
          value={filterTherapist}
          onChange={(e) => setFilterTherapist(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <option value="">All Therapists</option>
          {THERAPISTS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          className="input-field"
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <option value="">All Days of Week</option>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          className="input-field"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAUSED">PAUSED</option>
        </select>

        {(searchTerm || filterTherapist || filterDay || filterStatus) && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm("");
              setFilterTherapist("");
              setFilterDay("");
              setFilterStatus("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Spreadsheet / Inline Editing Table */}
      <div className="table-wrap" style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "auto", background: "var(--surface)" }}>
        <table className="excel-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--line)", textAlign: "left" }}>
              <th style={{ width: 40, padding: "10px 8px", textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>#</th>
              <th
                style={{ width: 175, padding: "10px 12px", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortAsc((prev) => !prev)}
                title="Click to sort A-Z or Z-A"
              >
                Child Name {sortAsc ? "▲ (A-Z)" : "▼ (Z-A)"} ✎
              </th>
              <th style={{ width: 140, padding: "10px 12px", fontWeight: 700 }}>Parent Phone ✎</th>
              <th style={{ width: 160, padding: "10px 12px", fontWeight: 700 }}>Therapist ▾</th>
              <th style={{ width: 180, padding: "10px 12px", fontWeight: 700 }}>Therapy Type ▾</th>
              <th style={{ minWidth: 320, padding: "10px 12px", fontWeight: 700 }}>Weekly Slots (1-3 Days) ✎</th>
              <th style={{ width: 110, padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>Status ⚡</th>
              <th style={{ width: 70, padding: "10px 12px", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Inline Add Row Form */}
            {isAddingRow && (
              <tr style={{ background: "var(--accent-soft)", borderBottom: "2px solid var(--accent)" }}>
                <td style={{ textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>★</td>
                <td style={{ padding: "6px 8px" }}>
                  <input
                    type="text"
                    placeholder="Enter Child Name"
                    value={newRowData.child_name}
                    onChange={(e) => setNewRowData((d) => ({ ...d, child_name: e.target.value }))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)" }}
                    autoFocus
                  />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input
                    type="text"
                    placeholder="Parent Phone"
                    value={newRowData.parent_phone}
                    onChange={(e) => setNewRowData((d) => ({ ...d, parent_phone: e.target.value }))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)" }}
                  />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <select
                    value={newRowData.therapist_id}
                    onChange={(e) => setNewRowData((d) => ({ ...d, therapist_id: e.target.value }))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)", background: "var(--surface)" }}
                  >
                    {THERAPISTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <select
                    value={newRowData.therapy_type}
                    onChange={(e) => setNewRowData((d) => ({ ...d, therapy_type: e.target.value }))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--accent)", background: "var(--surface)" }}
                  >
                    {THERAPY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {newRowData.recurring_slots.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: "var(--surface)",
                          border: "1px solid var(--accent)",
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <select
                          value={slot.day_of_week}
                          onChange={(e) => {
                            const updated = [...newRowData.recurring_slots];
                            updated[sIdx].day_of_week = e.target.value;
                            setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                          }}
                          style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 600 }}
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
                          style={{ border: "none", background: "transparent", fontSize: 12 }}
                        >
                          {STANDARD_TIMES.map((time) => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        {newRowData.recurring_slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newRowData.recurring_slots.filter((_, idx) => idx !== sIdx);
                              setNewRowData((d) => ({ ...d, recurring_slots: updated }));
                            }}
                            style={{ border: "none", background: "transparent", color: "var(--danger)", cursor: "pointer", padding: "0 2px" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {newRowData.recurring_slots.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const used = newRowData.recurring_slots.map((s) => s.day_of_week);
                          const nextD = DAYS_OF_WEEK.find((d) => !used.includes(d)) || "Wednesday";
                          setNewRowData((d) => ({
                            ...d,
                            recurring_slots: [...d.recurring_slots, { day_of_week: nextD, start_time: "10:00", end_time: "10:45" }],
                          }));
                        }}
                        style={{ border: "1px dashed var(--accent)", background: "transparent", padding: "2px 6px", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "var(--accent)" }}
                      >
                        + Add Slot
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: "center", padding: "6px 8px" }}>
                  <button
                    type="button"
                    onClick={() => setNewRowData((d) => ({ ...d, status: d.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }))}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: newRowData.status === "ACTIVE" ? "rgba(15, 118, 110, 0.15)" : "rgba(180, 83, 9, 0.15)",
                      color: newRowData.status === "ACTIVE" ? "var(--success)" : "var(--warning)",
                    }}
                  >
                    {newRowData.status}
                  </button>
                </td>
                <td style={{ textAlign: "center", padding: "6px 8px" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={handleCreateNewRow}
                      style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                      title="Save row"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingRow(false)}
                      style={{ background: "transparent", border: "1px solid var(--line)", padding: "4px 6px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}
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
                <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
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
              const isSavingTherapist = savingCell?.id === id && savingCell?.field === "therapist_id";
              const isSavingType = savingCell?.id === id && savingCell?.field === "therapy_type";
              const isSavingSlots = savingCell?.id === id && savingCell?.field === "recurring_slots";
              const isSavingStatus = savingCell?.id === id && savingCell?.field === "status";

              const isSuccessChild = saveSuccess?.id === id && saveSuccess?.field === "child_name";
              const isSuccessPhone = saveSuccess?.id === id && saveSuccess?.field === "parent_phone";

              return (
                <tr
                  key={id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    transition: "background 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  {/* Row Number */}
                  <td style={{ textAlign: "center", color: "var(--muted)", padding: "8px 6px", fontSize: 12 }}>
                    {index + 1}
                  </td>

                  {/* Child Name (Click/Double-Click Inline Edit) */}
                  <td
                    style={{
                      padding: "8px 12px",
                      position: "relative",
                      background: isSuccessChild ? "rgba(15, 118, 110, 0.08)" : undefined,
                    }}
                    onClick={() => {
                      if (!isChildEditing) {
                        setEditingCell({ id, field: "child_name" });
                        setTempValue(schedule.child_name || "");
                      }
                    }}
                  >
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
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{schedule.child_name}</span>
                        {isSavingChild ? (
                          <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                        ) : isSuccessChild ? (
                          <span style={{ fontSize: 12, color: "var(--success)" }}>✓</span>
                        ) : (
                          <span className="cell-edit-hint" style={{ fontSize: 11, color: "var(--muted)", opacity: 0.4 }}>✎</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Parent Phone (Click/Double-Click Inline Edit) */}
                  <td
                    style={{
                      padding: "8px 12px",
                      position: "relative",
                      background: isSuccessPhone ? "rgba(15, 118, 110, 0.08)" : undefined,
                    }}
                    onClick={() => {
                      if (!isPhoneEditing) {
                        setEditingCell({ id, field: "parent_phone" });
                        setTempValue(schedule.parent_phone || "");
                      }
                    }}
                  >
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
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "2px solid var(--accent)",
                          outline: "none",
                          fontSize: 13,
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 13 }}>{schedule.parent_phone}</span>
                        {isSavingPhone ? (
                          <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                        ) : isSuccessPhone ? (
                          <span style={{ fontSize: 12, color: "var(--success)" }}>✓</span>
                        ) : (
                          <span className="cell-edit-hint" style={{ fontSize: 11, color: "var(--muted)", opacity: 0.4 }}>✎</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Therapist (Inline Select Dropdown) */}
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ position: "relative" }}>
                      <select
                        value={schedule.therapist_id || THERAPISTS[0]}
                        onChange={(e) => handleCellSave(id, "therapist_id", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: "var(--surface)",
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        {THERAPISTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {isSavingTherapist && (
                        <span style={{ position: "absolute", right: 6, top: 8, fontSize: 10, color: "var(--accent)" }}>•••</span>
                      )}
                    </div>
                  </td>

                  {/* Therapy Type (Inline Select Dropdown) */}
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ position: "relative" }}>
                      <select
                        value={schedule.therapy_type || THERAPY_TYPES[0]}
                        onChange={(e) => handleCellSave(id, "therapy_type", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: "var(--surface)",
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        {THERAPY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {isSavingType && (
                        <span style={{ position: "absolute", right: 6, top: 8, fontSize: 10, color: "var(--accent)" }}>•••</span>
                      )}
                    </div>
                  </td>

                  {/* Recurring Slots (Interactive Chip Tag Editor: 1-3 slots) */}
                  <td style={{ padding: "6px 12px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {(schedule.recurring_slots || []).map((slot, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "var(--accent-soft)",
                            border: "1px solid var(--accent-border)",
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          {/* Day Selector */}
                          <select
                            value={slot.day_of_week}
                            onChange={(e) => handleSlotFieldChange(schedule, sIdx, "day_of_week", e.target.value)}
                            style={{
                              border: "none",
                              background: "transparent",
                              fontWeight: 700,
                              color: "var(--accent)",
                              fontSize: 12,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {DAYS_OF_WEEK.map((d) => (
                              <option key={d} value={d}>{d.slice(0, 3)}</option>
                            ))}
                          </select>

                          {/* Time Selector */}
                          <select
                            value={slot.start_time}
                            onChange={(e) => handleSlotFieldChange(schedule, sIdx, "start_time", e.target.value)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text)",
                              fontSize: 12,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {STANDARD_TIMES.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>

                          {/* Remove Slot Chip Button (if > 1) */}
                          {(schedule.recurring_slots || []).length > 1 && (
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
                              }}
                              title="Remove slot"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Slot Button (Max 3) */}
                      {(schedule.recurring_slots || []).length < 3 && (
                        <button
                          type="button"
                          onClick={() => handleAddSlotToRow(schedule)}
                          style={{
                            border: "1px dashed var(--accent)",
                            background: "transparent",
                            padding: "3px 8px",
                            borderRadius: 8,
                            fontSize: 11,
                            cursor: "pointer",
                            color: "var(--accent)",
                            fontWeight: 600,
                          }}
                          title="Add weekly recurring day (up to 3)"
                        >
                          + Slot
                        </button>
                      )}

                      {isSavingSlots && (
                        <span style={{ fontSize: 10, color: "var(--accent)" }}>saving...</span>
                      )}
                    </div>
                  </td>

                  {/* Status Toggle (One-Click Instant Button) */}
                  <td style={{ textAlign: "center", padding: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(schedule)}
                      disabled={isSavingStatus}
                      style={{
                        border: "none",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background:
                          schedule.status === "ACTIVE"
                            ? "rgba(15, 118, 110, 0.12)"
                            : "rgba(180, 83, 9, 0.12)",
                        color:
                          schedule.status === "ACTIVE"
                            ? "var(--success)"
                            : "var(--warning)",
                      }}
                      title="Click to toggle ACTIVE / PAUSED"
                    >
                      {isSavingStatus ? "..." : schedule.status === "ACTIVE" ? "ACTIVE" : "PAUSED"}
                    </button>
                  </td>

                  {/* Row Controls (Delete) */}
                  <td style={{ textAlign: "center", padding: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(id, schedule.child_name)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: 4,
                        borderRadius: 4,
                      }}
                      title="Delete record"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
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
    </div>
  );
}

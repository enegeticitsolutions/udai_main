import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";
import StatCard from "./StatCard";
import {
  APPOINTMENT_EVENTS_URL,
  getAppointment,
  getAppointmentMetrics,
  getAppointments,
  patchAppointmentStatus,
  createDirectBooking,
  deleteAppointment,
} from "../services/adminApi";
import { getScheduleDays } from "./WhatsAppMessagesPage";
import { CLINIC_THERAPISTS_ROSTER } from "./AvailabilityManagerPage";

const statusTone = { pending: "amber", confirmed: "green", completed: "blue", cancelled: "red" };

export function normalizeDepartment(dept) {
  if (!dept || typeof dept !== "string") return dept || "—";
  const trimmed = dept.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === "counselling" ||
    lower === "counseling" ||
    lower === "child counselling" ||
    lower === "parental counselling" ||
    lower === "child and parental counselling" ||
    lower.includes("counsel") ||
    lower.includes("parental")
  ) {
    return "Child and Parental Counselling";
  }
  return trimmed;
}

function dateTime(item) {
  return `${item.appointmentDate || "-"} ${item.appointmentTime || ""}`.trim();
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: "", bookingStatus: "", department: "", therapistId: "", dateFrom: "", dateTo: "", page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  const [selected, setSelected] = useState(null);
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(true);

  // Direct Booking & Hold Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookForm, setBookForm] = useState({
    bookingType: "USER", // "USER" | "SCHOOL"
    childName: "",
    phoneNumber: "",
    therapistName: CLINIC_THERAPISTS_ROSTER[0].therapistName,
    department: CLINIC_THERAPISTS_ROSTER[0].department,
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: "10:00",
    mainConcern: "",
  });

  const load = useCallback(async () => {
    const [list, nextMetrics] = await Promise.all([getAppointments(filters), getAppointmentMetrics()]);
    setAppointments(list?.items ?? []);
    setPagination(list?.pagination ?? { page: 1, limit: 10, total: 0, pages: 0 });
    setMetrics(nextMetrics ?? {});
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const poller = setInterval(() => load().catch(() => {}), 15_000);
    return () => clearInterval(poller);
  }, [load]);

  async function handleCreateDirectBooking(e) {
    e.preventDefault();
    setBookingError("");
    setIsSubmittingBooking(true);
    try {
      const isSchool = bookForm.bookingType === "SCHOOL";
      const payload = {
        childName: isSchool ? "School Hold" : bookForm.childName.trim(),
        phoneNumber: isSchool ? "0000000000" : bookForm.phoneNumber.trim(),
        therapistName: bookForm.therapistName,
        department: bookForm.department,
        appointmentDate: bookForm.appointmentDate,
        appointmentTime: bookForm.appointmentTime,
        mainConcern: bookForm.mainConcern.trim() || (isSchool ? "School Hold (Admin Reserved)" : "Direct Admin Booking"),
        isSchoolHold: isSchool,
      };

      if (!isSchool && !payload.childName) {
        throw new Error("Please enter patient/child name");
      }

      const res = await createDirectBooking(payload);
      setAlert(res?.message || "Slot booked successfully without payment.");
      setIsBookModalOpen(false);
      setBookForm({
        bookingType: "USER",
        childName: "",
        phoneNumber: "",
        therapistName: CLINIC_THERAPISTS_ROSTER[0].therapistName,
        department: CLINIC_THERAPISTS_ROSTER[0].department,
        appointmentDate: new Date().toISOString().slice(0, 10),
        appointmentTime: "10:00",
        mainConcern: "",
      });
      await load();
    } catch (err) {
      setBookingError(err.message || "Failed to book slot");
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function handleDeleteAppointment(id, patientName) {
    if (!confirm(`Are you sure you want to delete and release the slot for "${patientName}"? This will make the slot available again on WhatsApp & Web.`)) {
      return;
    }
    try {
      await deleteAppointment(id);
      setAlert(`Slot for "${patientName}" deleted and released successfully.`);
      await load();
    } catch (err) {
      setAlert(`Failed to delete appointment: ${err.message}`);
    }
  }

  useEffect(() => {
    const events = new EventSource(APPOINTMENT_EVENTS_URL);
    events.addEventListener("appointment", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "insert") {
        const patient = payload.appointment?.patientName || "A patient";
        setAlert(`New WhatsApp appointment received for ${patient}.`);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New UDAI appointment", { body: `${patient} submitted a therapist booking.` });
        }
      }
      load().catch(() => {});
    });
    return () => events.close();
  }, [load]);

  const therapistOptions = useMemo(() => {
    const therapists = new Map();
    appointments.forEach((item) => {
      if (item.therapistId || item.therapistName) therapists.set(item.therapistId || item.therapistName, item.therapistName || item.therapistId);
    });
    return Array.from(therapists.entries());
  }, [appointments]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value, page: name === "page" ? value : 1 }));
  }

  async function openDetails(id) {
    setSelected(await getAppointment(id));
  }

  async function updateStatus(id, bookingStatus) {
    await patchAppointmentStatus(id, bookingStatus);
    await load();
    if (selected?.id === id) setSelected((current) => ({ ...current, bookingStatus }));
  }

  const displayAppointments = useMemo(() => {
    if (!filters.department) return appointments;
    return appointments.filter((item) => {
      const d = normalizeDepartment(item.department || item.appointmentType || "");
      return d === filters.department;
    });
  }, [appointments, filters.department]);

  return (
    <section className="content-card">
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>WhatsApp &amp; Direct Appointments</h2>
          <p className="section-copy">Completed bookings and offline/school hold reservations.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setBookingError("");
              setIsBookModalOpen(true);
            }}
            style={{
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: 0,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
            }}
          >
            <span>+ Direct Book / Hold Slot (Free)</span>
          </button>
          <Badge tone="green">Live sync</Badge>
        </div>
      </div>

      {alert && (
        <div className="error-box" style={{ marginBottom: "16px", background: "#ecfdf5", borderColor: "#a7f3d0", color: "#166534" }}>
          {alert}
          <button type="button" onClick={() => setAlert("")} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer" }}>&times;</button>
        </div>
      )}

      <div className="panel-grid">
        <StatCard label="Total Bookings" value={metrics.totalBookings ?? 0} hint="All MSG91 & direct appointments" />
        <StatCard label="Today's Bookings" value={metrics.todayBookings ?? 0} hint="Scheduled today" />
        <StatCard label="Pending" value={metrics.pendingBookings ?? 0} hint="Need confirmation" />
        <StatCard label="Confirmed" value={metrics.confirmedBookings ?? 0} hint="Approved bookings" />
      </div>

      <div className="form-grid" style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Input label="Search patient or phone" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
        <label className="field"><span>Status</span><select value={filters.bookingStatus} onChange={(event) => updateFilter("bookingStatus", event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="field">
          <span>Department</span>
          <select value={filters.department} onChange={(event) => updateFilter("department", event.target.value)}>
            <option value="">All departments</option>
            <option value="Child and Parental Counselling">Child and Parental Counselling</option>
            <option value="OT">OT</option>
            <option value="Speech Therapy">Speech Therapy</option>
            <option value="Physiotherapy">Physiotherapy</option>
            <option value="Special Educator">Special Education</option>
            <option value="Physical Therapy">Physical Therapy</option>
          </select>
        </label>
        <label className="field"><span>Therapist</span><select value={filters.therapistId} onChange={(event) => updateFilter("therapistId", event.target.value)}><option value="">All therapists</option>{therapistOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <Input label="Date from" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        <Input label="Date to" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Patient</th><th>Phone</th><th>Therapist</th><th>Schedule</th><th>Department</th><th>Session Freq</th><th>Sessions</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {displayAppointments.length === 0 ? <tr><td colSpan="11" style={{ textAlign: "center", padding: "24px" }}>{loading ? "Loading appointments..." : "No appointments found."}</td></tr> : displayAppointments.map((item) => {
              const sDays = getScheduleDays(item);
              const isAdminDirect = item.bookedBy === "ADMIN";
              const isSchool = item.isSchoolHold || item.source === "school-hold" || /school/i.test(item.patientName || item.childName);

              return (
                <tr key={item.id}>
                  <td>{item.bookingId}</td>
                  <td>
                    <strong>{item.patientName || item.childName}</strong>
                    {isSchool && <span style={{ marginLeft: 6, fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>🏫 School Hold</span>}
                    {isAdminDirect && !isSchool && <span style={{ marginLeft: 6, fontSize: 10, background: "#f3e8ff", color: "#7e22ce", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>🟣 Direct</span>}
                  </td>
                  <td>{item.phoneNumber || item.parentPhone}</td>
                  <td>{item.therapistName}</td>
                  <td>
                    <div>{dateTime(item)}</div>
                    {sDays.length > 1 && (
                      <div style={{ marginTop: 4, padding: "3px 6px", background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 11 }}>
                        <span style={{ fontWeight: 600, color: "#4338ca", display: "block" }}>{sDays.length} Days:</span>
                        {sDays.map((s, idx) => (
                          <div key={idx} style={{ color: "#475569", whiteSpace: "nowrap" }}>
                            D{s.sessionNumber}: {s.date} {s.day ? `(${s.day})` : ""} {s.time}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 500,
                        color: "#334155",
                        background: "#f8fafc",
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        display: "inline-block",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {normalizeDepartment(item.department || item.appointmentType || "Child and Parental Counselling")}
                    </span>
                  </td>
                  <td>{item.session_frequency || <span style={{color:"var(--muted)"}}>—</span>}</td>
                  <td style={{textAlign:"center"}}>{item.totalSessions ?? <span style={{color:"var(--muted)"}}>—</span>}</td>
                  <td style={{fontWeight:600}}>{item.feeCharged != null ? `₹${item.feeCharged}` : (isAdminDirect ? <span style={{ color: "#059669", fontSize: 11, fontWeight: 700 }}>Free (Admin)</span> : <span style={{color:"var(--muted)"}}>—</span>)}</td>
                  <td>
                    <Badge tone={isSchool ? "amber" : statusTone[item.bookingStatus] || "slate"}>
                      {isSchool ? "School Hold" : item.bookingStatus}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <Button variant="secondary" onClick={() => openDetails(item.id)}>View</Button>
                      {isAdminDirect && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(item.id, item.patientName || item.childName)}
                          title="Release / Cancel Slot"
                          style={{
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✕ Release
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
        <span>Page {pagination.page} of {pagination.pages || 1} · {pagination.total} records</span>
        <div style={{ display: "flex", gap: "8px" }}><Button variant="secondary" disabled={pagination.page <= 1} onClick={() => updateFilter("page", pagination.page - 1)}>Previous</Button><Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => updateFilter("page", pagination.page + 1)}>Next</Button></div>
      </div>

      {/* Direct Booking & Hold Slot Modal */}
      {isBookModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)" }}>
          <div className="content-card" style={{ width: "min(600px, 100%)", maxHeight: "92vh", overflow: "auto", borderRadius: 14 }}>
            <div className="section-head" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>⚡ Direct Slot Booking &amp; Hold</h2>
                <p className="section-copy" style={{ fontSize: 12 }}>Book for a user or hold for School without any payment. Instantly hidden from WhatsApp &amp; Web.</p>
              </div>
              <button type="button" onClick={() => setIsBookModalOpen(false)} style={{ border: 0, background: "transparent", fontSize: "24px", cursor: "pointer", color: "var(--muted)" }}>&times;</button>
            </div>

            {bookingError && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13, marginBottom: 16 }}>
                ⚠️ {bookingError}
              </div>
            )}

            <form onSubmit={handleCreateDirectBooking} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Mode Selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                  Booking Purpose:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setBookForm((p) => ({ ...p, bookingType: "USER", childName: p.childName === "School Hold" ? "" : p.childName }))}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: bookForm.bookingType === "USER" ? "2px solid #2563eb" : "1px solid var(--line)",
                      background: bookForm.bookingType === "USER" ? "#eff6ff" : "var(--surface)",
                      color: bookForm.bookingType === "USER" ? "#1e40af" : "var(--text)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    👤 Direct User Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookForm((p) => ({ ...p, bookingType: "SCHOOL", childName: "School Hold" }))}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: bookForm.bookingType === "SCHOOL" ? "2px solid #f59e0b" : "1px solid var(--line)",
                      background: bookForm.bookingType === "SCHOOL" ? "#fffbeb" : "var(--surface)",
                      color: bookForm.bookingType === "SCHOOL" ? "#b45309" : "var(--text)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🏫 School Hold (Internal)
                  </button>
                </div>
              </div>

              {/* Therapist & Department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Therapist:</span>
                  <select
                    value={bookForm.therapistName}
                    onChange={(e) => {
                      const tName = e.target.value;
                      const matched = CLINIC_THERAPISTS_ROSTER.find((r) => r.therapistName === tName);
                      setBookForm((p) => ({
                        ...p,
                        therapistName: tName,
                        department: matched?.department || p.department,
                      }));
                    }}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  >
                    {CLINIC_THERAPISTS_ROSTER.map((t) => (
                      <option key={t.therapistName} value={t.therapistName}>
                        {t.therapistName} ({t.department})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Department:</span>
                  <input
                    type="text"
                    value={bookForm.department}
                    onChange={(e) => setBookForm((p) => ({ ...p, department: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </label>
              </div>

              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Appointment Date:</span>
                  <input
                    type="date"
                    required
                    value={bookForm.appointmentDate}
                    onChange={(e) => setBookForm((p) => ({ ...p, appointmentDate: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </label>

                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Time Slot:</span>
                  <select
                    value={bookForm.appointmentTime}
                    onChange={(e) => setBookForm((p) => ({ ...p, appointmentTime: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  >
                    {["09:00", "09:45", "10:00", "10:45", "11:00", "11:45", "12:00", "12:45", "14:00", "14:45", "15:00", "15:45", "16:00", "16:45", "17:00", "17:45"].map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Patient Name & Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {bookForm.bookingType === "SCHOOL" ? "Hold Title:" : "Patient / Child Name *:"}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={bookForm.bookingType === "SCHOOL" ? "e.g. School Routine Session" : "e.g. Aarav Sharma"}
                    value={bookForm.childName}
                    onChange={(e) => setBookForm((p) => ({ ...p, childName: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </label>

                <label className="field">
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Parent Contact Phone:</span>
                  <input
                    type="tel"
                    placeholder="e.g. 9899681972"
                    value={bookForm.phoneNumber}
                    onChange={(e) => setBookForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                  />
                </label>
              </div>

              {/* Major Concerns / Notes */}
              <label className="field">
                <span style={{ fontSize: 12, fontWeight: 600 }}>Concern / Clinical Note:</span>
                <input
                  type="text"
                  placeholder="e.g. Speech evaluation, school reserved session, etc."
                  value={bookForm.mainConcern}
                  onChange={(e) => setBookForm((p) => ({ ...p, mainConcern: e.target.value }))}
                  style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
                />
              </label>

              {/* Notice */}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "#166534" }}>
                🔒 <strong>Zero Payment:</strong> This slot will be directly marked confirmed for free. It will be <strong>immediately hidden from WhatsApp &amp; Web</strong> so no external user can book it.
              </div>

              {/* Submit Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 6,
                    border: 0,
                    background: bookForm.bookingType === "SCHOOL" ? "#d97706" : "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: isSubmittingBooking ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  {isSubmittingBooking ? "Booking..." : bookForm.bookingType === "SCHOOL" ? "Confirm School Hold" : "Confirm Direct Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15,23,42,.48)" }}>
          <div className="content-card" style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="section-head"><h2>Appointment Details</h2><button type="button" onClick={() => setSelected(null)} style={{ border: 0, background: "transparent", fontSize: "24px", cursor: "pointer" }}>&times;</button></div>
            
            {(() => {
              const modalDays = getScheduleDays(selected);
              if (modalDays.length <= 1) return null;
              return (
                <div style={{ marginBottom: "18px", padding: "14px", background: "#f0f4ff", borderRadius: "8px", border: "1px solid #c7d2fe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ color: "#1e1b4b", fontSize: "14px" }}>
                      📅 Total Scheduled Days &amp; Timings ({modalDays.length} Days)
                    </strong>
                    <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "#e0e7ff", color: "#3730a3" }}>
                      {selected.session_frequency || `${modalDays.length} Days / Week`}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                    {modalDays.map((s, idx) => (
                      <div key={idx} style={{ background: "#fff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "12.5px" }}>
                          🗓️ Day {s.sessionNumber}: {s.date} {s.day ? `(${s.day})` : ""}
                        </div>
                        <div style={{ color: "#4338ca", fontWeight: 700, fontSize: "12px", marginTop: "2px" }}>
                          🕒 {s.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="form-grid">
              {Object.entries(selected).filter(([key]) => key !== "rawPayload" && key !== "sessionSchedule").map(([key, value]) => (
                <div key={key}>
                  <strong>{key}</strong>
                  <div>
                    {key === "appointmentType" || key === "department"
                      ? normalizeDepartment(String(value ?? "-"))
                      : String(value ?? "-")}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "18px" }}><strong>Raw payload</strong><pre style={{ overflow: "auto", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>{JSON.stringify(selected.rawPayload, null, 2)}</pre></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px" }}>{["pending", "confirmed", "completed", "cancelled"].map((status) => <Button key={status} variant={selected.bookingStatus === status ? "primary" : "secondary"} onClick={() => updateStatus(selected.id, status)}>{status}</Button>)}</div>
          </div>
        </div>
      )}
    </section>
  );
}


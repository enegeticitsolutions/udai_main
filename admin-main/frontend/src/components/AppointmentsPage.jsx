import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";
import StatCard from "./StatCard";
import { APPOINTMENT_EVENTS_URL, getAppointment, getAppointmentMetrics, getAppointments, patchAppointmentStatus } from "../services/adminApi";

const statusTone = { pending: "amber", confirmed: "green", completed: "blue", cancelled: "red" };

function dateTime(item) {
  return `${item.appointmentDate || "-"} ${item.appointmentTime || ""}`.trim();
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: "", bookingStatus: "", therapistId: "", dateFrom: "", dateTo: "", page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  const [selected, setSelected] = useState(null);
  const [alert, setAlert] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <section className="content-card">
      <div className="section-head">
        <div>
          <h2>WhatsApp Therapist Appointments</h2>
          <p className="section-copy">Completed MSG91 therapist bookings saved in the appointments collection.</p>
        </div>
        <Badge tone="green">Live sync</Badge>
      </div>

      {alert && (
        <div className="error-box" style={{ marginBottom: "16px", background: "#ecfdf5", borderColor: "#a7f3d0", color: "#166534" }}>
          {alert}
          <button type="button" onClick={() => setAlert("")} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer" }}>&times;</button>
        </div>
      )}

      <div className="panel-grid">
        <StatCard label="Total Bookings" value={metrics.totalBookings ?? 0} hint="All MSG91 appointments" />
        <StatCard label="Today's Bookings" value={metrics.todayBookings ?? 0} hint="Scheduled today" />
        <StatCard label="Pending" value={metrics.pendingBookings ?? 0} hint="Need confirmation" />
        <StatCard label="Confirmed" value={metrics.confirmedBookings ?? 0} hint="Approved bookings" />
      </div>

      <div className="form-grid" style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Input label="Search patient or phone" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
        <label className="field"><span>Status</span><select value={filters.bookingStatus} onChange={(event) => updateFilter("bookingStatus", event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className="field"><span>Therapist</span><select value={filters.therapistId} onChange={(event) => updateFilter("therapistId", event.target.value)}><option value="">All therapists</option>{therapistOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <Input label="Date from" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        <Input label="Date to" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Patient</th><th>Phone</th><th>Therapist</th><th>Schedule</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {appointments.length === 0 ? <tr><td colSpan="8" style={{ textAlign: "center", padding: "24px" }}>{loading ? "Loading appointments..." : "No appointments found."}</td></tr> : appointments.map((item) => (
              <tr key={item.id}>
                <td>{item.bookingId}</td><td>{item.patientName}</td><td>{item.phoneNumber}</td><td>{item.therapistName}</td><td>{dateTime(item)}</td><td>{item.appointmentType}</td>
                <td><Badge tone={statusTone[item.bookingStatus] || "slate"}>{item.bookingStatus}</Badge></td>
                <td><Button variant="secondary" onClick={() => openDetails(item.id)}>View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
        <span>Page {pagination.page} of {pagination.pages || 1} · {pagination.total} records</span>
        <div style={{ display: "flex", gap: "8px" }}><Button variant="secondary" disabled={pagination.page <= 1} onClick={() => updateFilter("page", pagination.page - 1)}>Previous</Button><Button variant="secondary" disabled={pagination.page >= pagination.pages} onClick={() => updateFilter("page", pagination.page + 1)}>Next</Button></div>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15,23,42,.48)" }}>
          <div className="content-card" style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
            <div className="section-head"><h2>Appointment Details</h2><button type="button" onClick={() => setSelected(null)} style={{ border: 0, background: "transparent", fontSize: "24px", cursor: "pointer" }}>&times;</button></div>
            <div className="form-grid">
              {Object.entries(selected).filter(([key]) => key !== "rawPayload").map(([key, value]) => <div key={key}><strong>{key}</strong><div>{String(value ?? "-")}</div></div>)}
            </div>
            <div style={{ marginTop: "18px" }}><strong>Raw payload</strong><pre style={{ overflow: "auto", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>{JSON.stringify(selected.rawPayload, null, 2)}</pre></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px" }}>{["pending", "confirmed", "completed", "cancelled"].map((status) => <Button key={status} variant={selected.bookingStatus === status ? "primary" : "secondary"} onClick={() => updateStatus(selected.id, status)}>{status}</Button>)}</div>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import Badge from "./components/Badge";
import Button from "./components/Button";
import Input from "./components/Input";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import Table from "./components/Table";
import {
  availabilitySlots,
  donations as fallbackDonations,
  inquiries as fallbackInquiries,
  notifications,
  records,
  orders as fallbackOrders,
  therapists as fallbackTherapists,
  volunteers as fallbackVolunteers,
} from "./data/mockData";
import { getAdminBootstrap, patchInquiry, patchOrder, patchTherapist, patchVolunteer } from "./services/adminApi";
import { adminLogin } from "./services/adminApi";

const tokenKey = "udai_standalone_admin_token";

const roleSections = {
  admin: [
    "Dashboard",
    "Appointments / Inquiries",
    "Orders / Purchases",
    "Donations",
    "Volunteers",
    "Therapist Management",
    "Availability Manager",
    "Child / Parent Records",
    "Notifications Center",
    "Message Broadcast",
    "Reports / Analytics",
    "Settings",
  ],
  editor: [
    "Dashboard",
    "Appointments / Inquiries",
    "Orders / Purchases",
    "Therapist Management",
    "Availability Manager",
    "Child / Parent Records",
    "Volunteers",
    "Notifications Center",
    "Message Broadcast",
  ],
  viewer: ["Dashboard", "Orders / Purchases", "Donations", "Reports / Analytics"],
};

function maskDonorName(name) {
  if (!name) return "Anonymous";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return `${parts[0].slice(0, 2)}***`;
  return `${parts[0]} ${parts[1].slice(0, 1)}.`;
}

function maskEmail(email) {
  if (!email) return "***";
  const [localPart, domainPart = ""] = email.split("@");
  if (!domainPart) return "***";
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domainPart}`;
}

function maskPhone(phone) {
  if (!phone) return "-";
  const value = String(phone);
  if (value.length <= 4) return value;
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

function volunteerLabel(status) {
  const labels = {
    submitted: "submitted",
    reviewed: "reviewed",
    contacted: "contacted",
    approved: "approved",
    rejected: "rejected",
    task_assigned: "task_assigned",
  };
  return labels[status] ?? status;
}

function volunteerTone(status) {
  if (status === "approved" || status === "task_assigned") return "green";
  if (status === "reviewed" || status === "contacted") return "amber";
  if (status === "rejected") return "slate";
  return "blue";
}

function backendStatusLabel(status) {
  if (status === "connected") return "Backend Connected";
  if (status === "disconnected") return "Backend Disconnected";
  return "Connecting to Backend";
}

function formatDisplayDate(value) {
  if (!value) return "-";

  if (typeof value === "string" && value.includes("/")) {
    return value;
  }

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);

  return `${day}/${month}/${year}`;
}

function inquiryTone(status) {
  if (status === "confirmed") return "green";
  if (status === "assigned" || status === "rescheduled") return "amber";
  if (status === "cancelled") return "red";
  if (status === "initiated") return "blue";
  return "slate";
}

function buildDepartmentMap(therapists) {
  return therapists.reduce((acc, therapist) => {
    if (!acc[therapist.department]) {
      acc[therapist.department] = [];
    }
    acc[therapist.department].push(therapist.name);
    return acc;
  }, {});
}

function autoAssignInquiries(items, therapistMap) {
  const booked = new Set();

  return items.map((item, index) => {
    const therapists = therapistMap[item.department] ?? [];
    const slotKey = `${item.department}::${item.appointmentDate ?? item.schedule ?? index}::${item.appointmentTime ?? "00:00"}`;
    const availableTherapist =
      therapists.find((therapist) => !booked.has(`${therapist}::${slotKey}`)) ?? null;
    const assignedTherapist = availableTherapist ?? item.assignedTherapist ?? "Slot full";

    if (availableTherapist) {
      booked.add(`${availableTherapist}::${slotKey}`);
    }

    return {
      ...item,
      id: String(item.id),
      status: item.status ?? "new",
      assignedTherapist,
      assignmentMode: item.assignmentMode ?? "Auto-assigned",
      assignmentNote:
        therapists.length === 0
          ? "No therapist configured"
          : availableTherapist
            ? "Slot reserved"
            : "Needs review",
    };
  });
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin1@udai.in");
  const [password, setPassword] = useState("111111");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await adminLogin({ email, password });
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-badge">Standalone Admin</div>
        <h1>Login to UDAI Admin Panel</h1>
        <p>Local demo login, no backend connection.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="error-box">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </section>
    </main>
  );
}

function DashboardPage({ inquiries, therapists, donations, orders, currentUser, dashboard, isConnected }) {
  const totalDonations = dashboard?.donationTotal ?? donations.reduce((sum, donation) => sum + donation.amount, 0);
  const totalOrders = dashboard?.totalOrders ?? orders.length;
  const cancelledRequests = dashboard?.cancelledRequests ?? inquiries.filter((item) => item.status === "cancelled").length;
  const rescheduledRequests = dashboard?.rescheduledRequests ?? inquiries.filter((item) => item.status === "rescheduled").length;
  const metrics = [
    { label: "Total requests", value: dashboard?.totalRequests ?? inquiries.length, hint: "All inquiry records" },
    { label: "Pending requests", value: dashboard?.pendingRequests ?? inquiries.filter((item) => item.status === "new").length, hint: "Need action" },
    { label: "Cancelled", value: cancelledRequests, hint: "Appointments cancelled" },
    { label: "Rescheduled", value: rescheduledRequests, hint: "Appointments moved" },
    { label: "Today’s appointments", value: dashboard?.todayAppointments ?? 4, hint: "Scheduled for today" },
    { label: "Active therapists", value: dashboard?.activeTherapists ?? therapists.filter((item) => item.active !== false).length, hint: "Available on panel" },
    { label: "Total orders", value: totalOrders, hint: "Product purchases" },
    { label: "Donation total", value: `₹${totalDonations}`, hint: "Private donor data masked" },
  ];

  return (
    <section className="dashboard-stack">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <Badge tone="blue">Admin overview</Badge>
          <h2>Welcome back, {currentUser?.name}</h2>
          <p>
            Manage appointments, donations, therapists, volunteers, and follow-ups from one clean
            control center.
          </p>
        </div>
        <div className="dashboard-hero-panel">
          <span>Role</span>
          <strong>{currentUser?.role ?? "guest"}</strong>
          <small>{isConnected ? "Connected to backend" : "Local demo admin account"}</small>
        </div>
      </div>

      <div className="panel-grid metrics-grid">
        {metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="content-card wide">
        <div className="section-head">
          <h2>Recent Inquiries</h2>
          <Badge tone="green">Live board</Badge>
        </div>
        <Table
          columns={["Child", "Concern", "Department", "Status", "Assigned Therapist"]}
          rows={inquiries.map((item) => [
            item.childName,
            item.concern,
            item.department,
            <Badge
              key={item.id}
              tone={inquiryTone(item.status)}
            >
              {item.status}
            </Badge>,
            item.assignedTherapist,
          ])}
        />
      </div>

      <div className="content-card wide">
        <div className="section-head">
          <h2>Recent Orders</h2>
          <Badge tone="blue">Product purchases</Badge>
        </div>
        <Table
          columns={["Order", "Customer", "Items", "Payment", "Status", "Amount"]}
          rows={orders.slice(0, 4).map((order) => [
            order.orderNumber ?? order.id,
            order.customerName ?? "-",
            Array.isArray(order.items)
              ? order.items.map((item) => `${item.title} ×${item.quantity}`).join(", ")
              : "-",
            order.paymentMethod ?? "-",
            <Badge
              key={order.id}
              tone={
                order.orderStatus === "delivered"
                  ? "green"
                  : order.paymentStatus === "initiated"
                    ? "amber"
                    : "slate"
              }
            >
              {order.orderStatus ?? "new"}
            </Badge>,
            `₹${Number(order.totalAmount ?? order.subtotal ?? 0)}`,
          ])}
        />
      </div>

      <div className="content-card wide">
        <div className="section-head">
          <h2>Logged In</h2>
          <Badge tone="purple">{currentUser?.role ?? "guest"}</Badge>
        </div>
        <div className="mini-row">
          <strong>{currentUser?.name}</strong>
          <span>{currentUser?.email}</span>
        </div>
      </div>
    </section>
  );
}

function InquiriesPage({ inquiries, therapistMap, onUpdateInquiry }) {
  const departmentOptions = Object.keys(therapistMap);
  const autoAssigned = useMemo(() => autoAssignInquiries(inquiries, therapistMap), [inquiries, therapistMap]);
  const statusCounts = useMemo(
    () => ({
      new: autoAssigned.filter((item) => item.status === "new").length,
      assigned: autoAssigned.filter((item) => item.status === "assigned").length,
      initiated: autoAssigned.filter((item) => item.status === "initiated").length,
      confirmed: autoAssigned.filter((item) => item.status === "confirmed").length,
      rescheduled: autoAssigned.filter((item) => item.status === "rescheduled").length,
      cancelled: autoAssigned.filter((item) => item.status === "cancelled").length,
    }),
    [autoAssigned],
  );

  async function updateInquiry(index, key, value) {
    const currentItem = autoAssigned[index];
    const updated = autoAssignInquiries(
      autoAssigned.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      therapistMap,
    );

    try {
      await onUpdateInquiry(currentItem.id, {
        [key]: value,
        department: updated[index].department,
        assignedTherapist: updated[index].assignedTherapist,
        assignmentMode: updated[index].assignmentMode,
        assignmentNote: updated[index].assignmentNote,
        status: updated[index].status,
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Appointments / Inquiries</h2>
        <Badge tone="blue">Department-based</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard label="New" value={statusCounts.new} hint="Needs action" />
        <StatCard label="Assigned" value={statusCounts.assigned} hint="Therapist mapped" />
        <StatCard label="Confirmed" value={statusCounts.confirmed} hint="Visits locked" />
        <StatCard label="Cancelled" value={statusCounts.cancelled} hint="Removed bookings" />
      </div>

        <Table
          columns={["Child", "Age", "Department", "Therapist", "Status", "Schedule", "Assignment"]}
          rows={autoAssigned.map((item, index) => [
            item.childName,
            item.age,
          <select
            key={`${item.id}-dept`}
            value={item.department}
            onChange={(e) => updateInquiry(index, "department", e.target.value)}
            className="select-inline"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>,
          <div key={`${item.id}-therapist`} className="auto-therapist">
            <strong>{item.assignedTherapist}</strong>
            <span>{item.assignmentMode}</span>
          </div>,
          <select
            key={`${item.id}-status`}
            value={item.status}
            onChange={(e) => updateInquiry(index, "status", e.target.value)}
            className="select-inline"
          >
            <option value="new">new</option>
            <option value="assigned">assigned</option>
            <option value="initiated">initiated</option>
            <option value="confirmed">confirmed</option>
            <option value="rescheduled">rescheduled</option>
            <option value="cancelled">cancelled</option>
              </select>,
          item.appointmentDate && item.appointmentTime
            ? `${formatDisplayDate(item.appointmentDate)} · ${item.appointmentTime}`
            : item.appointmentDate
              ? formatDisplayDate(item.appointmentDate)
              : item.schedule ?? "-",
          <Badge key={`${item.id}-assignment`} tone={item.assignmentNote === "Needs review" ? "amber" : "green"}>
            {item.assignmentNote}
          </Badge>,
        ])}
      />
    </section>
  );
}

function DonationsPage({ donations }) {
  const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0);

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Donations</h2>
        <Badge tone="green">Private donor view</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard label="Total donations" value={`₹${totalDonations}`} hint="All donations combined" />
        <StatCard label="Paid" value={donations.filter((item) => item.status === "paid").length} hint="Successful payments" />
        <StatCard label="Pending" value={donations.filter((item) => item.status === "pending").length} hint="Waiting for confirmation" />
        <StatCard label="Failed" value={donations.filter((item) => item.status === "failed").length} hint="Payment issues" />
      </div>

      <Table
        columns={["Donor Name", "Email", "Phone", "Amount", "Donation Type", "Method", "Status", "Date", "Purpose", "Message"]}
        rows={donations.map((donation) => [
          maskDonorName(donation.donorName ?? donation.name),
          maskEmail(donation.email),
          maskPhone(donation.phone),
          `₹${Number(donation.amount ?? 0)}`,
          donation.donationType ?? donation.type ?? "-",
          donation.paymentMethod ?? "-",
          <Badge
            key={donation.id}
            tone={donation.status === "paid" ? "green" : donation.status === "pending" ? "amber" : "slate"}
          >
            {donation.status ?? "pending"}
          </Badge>,
          donation.createdAt ?? "-",
          donation.purpose ?? "-",
          donation.message ?? "-",
        ])}
      />
    </section>
  );
}

function OrdersPage({ orders, onUpdateOrder }) {
  const [items, setItems] = useState(orders);

  useEffect(() => {
    setItems(orders);
  }, [orders]);

  async function updateOrder(index, updates) {
    const currentItem = items[index];
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    setItems(nextItems);

    try {
      const saved = await onUpdateOrder(currentItem.id, updates);
      if (saved) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Orders / Purchases</h2>
        <Badge tone="blue">Backend connected</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard label="Total orders" value={items.length} hint="Recorded purchases" />
        <StatCard label="Paid" value={items.filter((item) => item.paymentStatus === "paid").length} hint="Successful payments" />
        <StatCard label="Initiated" value={items.filter((item) => item.paymentStatus === "initiated").length} hint="Waiting for gateway" />
        <StatCard label="Revenue" value={`₹${items.reduce((sum, item) => sum + Number(item.totalAmount ?? item.subtotal ?? 0), 0)}`} hint="Total order value" />
      </div>

      <Table
        columns={["Order", "Customer", "Contact", "Items", "Payment", "Payment Status", "Order Status", "Amount", "Created"]}
        rows={items.map((order, index) => [
          <strong key={`${order.id}-number`}>{order.orderNumber ?? order.id}</strong>,
          order.customerName ?? "-",
          <div key={`${order.id}-contact`} className="stack" style={{ gap: "4px" }}>
            <span>{order.customerEmail ?? "-"}</span>
            <span>{order.customerPhone ?? "-"}</span>
          </div>,
          Array.isArray(order.items)
            ? order.items.map((item) => `${item.title} ×${item.quantity}`).join(", ")
            : "-",
          order.paymentMethod ?? "-",
          <select
            key={`${order.id}-payment-status`}
            className="select-inline"
            value={order.paymentStatus ?? "initiated"}
            onChange={(e) => updateOrder(index, { paymentStatus: e.target.value })}
          >
            <option value="initiated">initiated</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
          </select>,
          <select
            key={`${order.id}-order-status`}
            className="select-inline"
            value={order.orderStatus ?? "new"}
            onChange={(e) => updateOrder(index, { orderStatus: e.target.value })}
          >
            <option value="new">new</option>
            <option value="confirmed">confirmed</option>
            <option value="packed">packed</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>,
          `₹${Number(order.totalAmount ?? order.subtotal ?? 0)}`,
          order.createdAt ?? "-",
        ])}
      />
    </section>
  );
}

function VolunteersPage({ volunteers, onUpdateVolunteer }) {
  const [items, setItems] = useState(volunteers);

  useEffect(() => {
    setItems(volunteers);
  }, [volunteers]);

  async function updateVolunteer(index, updates) {
    const currentItem = items[index];
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    setItems(nextItems);

    try {
      const saved = await onUpdateVolunteer(currentItem.id, updates);
      if (saved) {
        setItems((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      }
    } catch (error) {
      console.error(error);
    }
  }

  function assignTask(index) {
    const task = window.prompt("Enter volunteer task");
    if (!task) return;
    updateVolunteer(index, { assignedTask: task, status: "task_assigned" });
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Volunteers</h2>
        <Badge tone="blue">Volunteer requests</Badge>
      </div>

      <div className="stack" style={{ marginBottom: "16px" }}>
        <div className="mini-row">
          <strong>Flow</strong>
          <span>submit → review → contact → approve / reject → assign task</span>
        </div>
      </div>

      <div className="volunteer-list">
        {items.map((volunteer, index) => (
          <article className="volunteer-card" key={volunteer.id}>
            <div className="volunteer-top">
              <div>
                <h3>{volunteer.name}</h3>
                <p>{volunteer.email}</p>
              </div>
              <Badge tone={volunteerTone(volunteer.status)}>{volunteerLabel(volunteer.status)}</Badge>
            </div>

            <div className="volunteer-meta">
              <div>
                <span>Phone</span>
                <strong>{volunteer.phone}</strong>
              </div>
              <div>
                <span>Interest Area</span>
                <strong>{volunteer.interestArea}</strong>
              </div>
              <div>
                <span>Availability</span>
                <strong>{volunteer.availability}</strong>
              </div>
              <div>
                <span>Created At</span>
                <strong>{volunteer.createdAt}</strong>
              </div>
              <div className="volunteer-note">
                <span>Task</span>
                <strong>{volunteer.assignedTask || "-"}</strong>
              </div>
            </div>

            <div className="volunteer-message">{volunteer.message}</div>

            <div className="volunteer-actions">
              <Button variant="secondary" onClick={() => updateVolunteer(index, { status: "reviewed" })}>
                Review
              </Button>
              <Button variant="secondary" onClick={() => updateVolunteer(index, { status: "contacted" })}>
                Contact
              </Button>
              <Button variant="secondary" onClick={() => updateVolunteer(index, { status: "approved" })}>
                Approve
              </Button>
              <Button variant="secondary" onClick={() => updateVolunteer(index, { status: "rejected" })}>
                Reject
              </Button>
              <Button variant="secondary" onClick={() => assignTask(index)}>
                Assign Task
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TherapistManagementPage({ therapists, onUpdateTherapist }) {
  async function toggleActive(index) {
    const therapist = therapists[index];
    const nextActive = !(therapist.active !== false);
    await onUpdateTherapist(therapist.id, { active: nextActive });
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Therapist Management</h2>
        <Badge tone="purple">Department roster</Badge>
      </div>
      <div className="therapist-grid">
        {therapists.map((therapist, index) => (
          <article className="therapist-card" key={therapist.name}>
            <div className="therapist-top">
              <div>
                <h3>{therapist.name}</h3>
                <p>{therapist.role}</p>
              </div>
              <Badge tone={therapist.active ? "green" : "slate"}>{therapist.active ? "Active" : "Inactive"}</Badge>
            </div>
            <dl>
              <div>
                <dt>Department</dt>
                <dd>{therapist.department}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{therapist.experience}</dd>
              </div>
            </dl>
            <Button variant="secondary" onClick={() => toggleActive(index)}>
              {therapist.active !== false ? "Deactivate" : "Activate"}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AvailabilityPage() {
  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Availability Manager</h2>
        <Badge tone="amber">Slots</Badge>
      </div>
      <div className="stack">
        {availabilitySlots.map((slot) => (
          <div className="mini-row" key={`${slot.therapist}-${slot.day}`}>
            <strong>{slot.therapist}</strong>
            <span>{slot.day}</span>
            <span>{slot.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecordsPage() {
  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Child / Parent Records</h2>
        <Badge tone="blue">History</Badge>
      </div>
      <Table
        columns={["Child", "Parent", "Concern", "Past Appointments"]}
        rows={records.map((record) => [record.childName, record.parent, record.concern, record.pastAppointments])}
      />
    </section>
  );
}

function NotificationsPage() {
  return (
    <section className="split-grid">
      <div className="content-card">
        <div className="section-head">
          <h2>Notifications Center</h2>
          <Badge tone="green">WhatsApp + Email</Badge>
        </div>
        <div className="stack">
          {["Appointment confirmed", "Reminder", "Reschedule", "Cancel"].map((item) => (
            <div className="mini-row" key={item}>
              <span>{item}</span>
              <Button variant="secondary">Send</Button>
            </div>
          ))}
        </div>
      </div>
      <div className="content-card">
        <div className="section-head">
          <h2>Recent Notifications</h2>
        </div>
        <div className="stack">
          {notifications.map((note) => (
            <div className="notification-item" key={note}>
              {note}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BroadcastPage() {
  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Message Broadcast</h2>
        <Badge tone="purple">Bulk messages</Badge>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Target audience</span>
          <select className="select-inline">
            <option>All users</option>
            <option>Selected users</option>
          </select>
        </label>
        <label className="field wide">
          <span>Message</span>
          <textarea rows="5" placeholder="Write your broadcast message..." />
        </label>
      </div>
      <Button>Send Broadcast</Button>
    </section>
  );
}

function ReportsPage({ inquiries, therapists }) {
  return (
    <section className="panel-grid">
      <StatCard label="Total bookings" value={inquiries.length} hint="All inquiry records" />
      <StatCard label="Conversion rate" value="67%" hint="Demo metric" />
      <StatCard label="Therapist workload" value={`${therapists.length} profiles`} hint="Roster size" />
      <div className="content-card wide">
        <div className="section-head">
          <h2>Workload Snapshot</h2>
        </div>
        <div className="stack">
          {Object.entries(buildDepartmentMap(therapists)).map(([department, team]) => (
            <div className="mini-row" key={department}>
              <span>{department}</span>
              <strong>{team.length} therapists</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="split-grid">
      <div className="content-card">
        <div className="section-head">
          <h2>Admin Profile</h2>
        </div>
        <div className="stack">
          <Input label="Name" defaultValue="UDAI Admin" />
          <Input label="Email" defaultValue="admin@udai.in" />
          <label className="field">
            <span>Role</span>
            <select className="select-inline">
              <option>admin</option>
              <option>editor</option>
              <option>viewer</option>
            </select>
          </label>
        </div>
      </div>
      <div className="content-card">
        <div className="section-head">
          <h2>Role Management</h2>
        </div>
        <div className="stack">
          {["admin", "editor", "viewer"].map((role) => (
            <div className="mini-row" key={role}>
              <span>{role}</span>
              <Badge tone="slate">Active</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem(tokenKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [inquiries, setInquiries] = useState(fallbackInquiries);
  const [donations, setDonations] = useState(fallbackDonations);
  const [orders, setOrders] = useState(fallbackOrders);
  const [volunteers, setVolunteers] = useState(fallbackVolunteers);
  const [therapists, setTherapists] = useState(fallbackTherapists);
  const [dashboard, setDashboard] = useState(null);
  const [backendStatus, setBackendStatus] = useState("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(tokenKey, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(tokenKey);
    }
  }, [currentUser]);

  const therapistMap = useMemo(() => buildDepartmentMap(therapists), [therapists]);
  const allowedSections = currentUser ? roleSections[currentUser.role] ?? roleSections.viewer : [];

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    async function loadAdminData() {
      setBackendStatus("loading");
      try {
        const bootstrap = await getAdminBootstrap();
        if (cancelled) return;

        const liveTherapists = bootstrap?.therapists ?? fallbackTherapists;
        const liveTherapistMap = buildDepartmentMap(liveTherapists);
        const liveInquiries = autoAssignInquiries(bootstrap?.inquiries ?? fallbackInquiries, liveTherapistMap);

        setTherapists(liveTherapists);
        setInquiries(liveInquiries);
        setDonations(bootstrap?.donations ?? fallbackDonations);
        setOrders(bootstrap?.orders ?? fallbackOrders);
        setVolunteers(bootstrap?.volunteers ?? fallbackVolunteers);
        setDashboard(bootstrap?.dashboard ?? null);
        setIsConnected(true);
        setBackendStatus("connected");
        setBackendError("");
      } catch (error) {
        if (cancelled) return;
        setIsConnected(false);
        setBackendStatus("disconnected");
        setBackendError(error instanceof Error ? error.message : "Unable to connect to backend.");
        setTherapists(fallbackTherapists);
        setInquiries(autoAssignInquiries(fallbackInquiries, buildDepartmentMap(fallbackTherapists)));
        setDonations(fallbackDonations);
        setOrders(fallbackOrders);
        setVolunteers(fallbackVolunteers);
        setDashboard(null);
      }
    }

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (!allowedSections.includes(activeSection)) {
      setActiveSection(allowedSections[0]);
    }
  }, [activeSection, allowedSections, currentUser]);

  async function handleInquiryUpdate(id, updates) {
    setInquiries((prev) => autoAssignInquiries(prev.map((item) => (item.id === id ? { ...item, ...updates } : item)), therapistMap));
    await patchInquiry(id, updates);
  }

  async function handleVolunteerUpdate(id, updates) {
    setVolunteers((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    await patchVolunteer(id, updates);
  }

  async function handleOrderUpdate(id, updates) {
    setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    const saved = await patchOrder(id, updates);
    if (saved) {
      setOrders((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
    }
  }

  async function handleTherapistUpdate(id, updates) {
    setTherapists((prev) => prev.map((item) => (String(item.id) === String(id) ? { ...item, ...updates } : item)));
    const saved = await patchTherapist(id, updates);
    if (saved) {
      setTherapists((prev) => prev.map((item) => (String(item.id) === String(saved.id) ? { ...item, ...saved } : item)));
    }
  }

  const page = useMemo(() => {
    switch (activeSection) {
      case "Dashboard":
        return (
          <DashboardPage
            inquiries={inquiries}
            therapists={therapists}
            donations={donations}
            orders={orders}
            currentUser={currentUser}
            dashboard={dashboard}
            isConnected={isConnected}
          />
        );
      case "Appointments / Inquiries":
        return (
          <InquiriesPage
            inquiries={inquiries}
            therapistMap={therapistMap}
            onUpdateInquiry={handleInquiryUpdate}
          />
        );
      case "Donations":
        return <DonationsPage donations={donations} />;
      case "Orders / Purchases":
        return <OrdersPage orders={orders} onUpdateOrder={handleOrderUpdate} />;
      case "Volunteers":
        return <VolunteersPage volunteers={volunteers} onUpdateVolunteer={handleVolunteerUpdate} />;
      case "Therapist Management":
        return <TherapistManagementPage therapists={therapists} onUpdateTherapist={handleTherapistUpdate} />;
      case "Availability Manager":
        return <AvailabilityPage />;
      case "Child / Parent Records":
        return <RecordsPage />;
      case "Notifications Center":
        return <NotificationsPage />;
      case "Message Broadcast":
        return <BroadcastPage />;
      case "Reports / Analytics":
        return <ReportsPage inquiries={inquiries} therapists={therapists} />;
      case "Settings":
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            inquiries={inquiries}
            therapists={therapists}
            donations={donations}
            orders={orders}
            currentUser={currentUser}
            dashboard={dashboard}
            isConnected={isConnected}
          />
        );
    }
  }, [activeSection, currentUser, dashboard, donations, inquiries, isConnected, orders, therapistMap, therapists, volunteers]);

  if (!currentUser) {
    return <LoginScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="admin-shell">
      <Sidebar active={activeSection} onChange={setActiveSection} onLogout={() => setCurrentUser(null)} items={allowedSections} />

      <main className="admin-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Standalone Admin Frontend</p>
            <h1>{activeSection}</h1>
          </div>
          <div className="topbar-actions">
            <div className={`connection-dot connection-dot--${backendStatus}`} aria-label={backendStatusLabel(backendStatus)} />
            <Badge tone="green">{currentUser.role}</Badge>
            {backendError ? <span className="backend-error">{backendError}</span> : null}
            {allowedSections.includes("Appointments / Inquiries") && (
              <Button variant="secondary" onClick={() => setActiveSection("Appointments / Inquiries")}>
                Open Inquiries
              </Button>
            )}
          </div>
        </header>

        {page}
      </main>
    </div>
  );
}

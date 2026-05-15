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
  contacts as fallbackContacts,
  inquiries as fallbackInquiries,
  notifications,
  records,
  orders as fallbackOrders,
  therapists as fallbackTherapists,
  volunteers as fallbackVolunteers,
} from "./data/mockData";
import {
  addSubscriber,
  createTherapist,
  deleteTherapist,
  getAdminBootstrap,
  patchInquiry,
  patchOrder,
  patchTherapist,
  patchVolunteer,
} from "./services/adminApi";
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
    "Subscribe",
    "Contacts",
    "Notifications Center",
    "Message Broadcast",
    "Reports / Analytics",
    "Settings",
  ],
  editor: [
    "Appointments / Inquiries",
    "Therapist Management",
    "Availability Manager",
  ],
  finance: ["Orders / Purchases", "Donations", "Reports / Analytics"],
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

function recordTone(status) {
  if (status === "confirmed") return "green";
  if (status === "rescheduled") return "amber";
  if (status === "cancelled") return "red";
  return "slate";
}

function formatRecordLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatRecordValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatSelectedChildDateTime(item) {
  if (!item) return "-";
  if (item.appointmentDate && item.appointmentTime) {
    return `${formatDisplayDate(item.appointmentDate)} · ${item.appointmentTime}`;
  }
  if (item.appointmentDate) return formatDisplayDate(item.appointmentDate);
  return item.schedule ?? "-";
}

function findChildRecord(childName) {
  return records.find((record) => record.childName === childName) ?? null;
}

function mergeChildDetails(inquiry, childRecord) {
  return {
    ...(childRecord ?? {}),
    ...(inquiry ?? {}),
    childName: inquiry?.childName ?? childRecord?.childName ?? "-",
    department: inquiry?.department ?? childRecord?.department ?? "-",
    schedule: formatSelectedChildDateTime(inquiry),
    status: inquiry?.status ?? childRecord?.status ?? "-",
    assignedTherapist: inquiry?.assignedTherapist ?? childRecord?.assignedTherapist ?? "-",
    parent: childRecord?.parent ?? inquiry?.parent ?? "-",
  };
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

function InquiriesPage({ inquiries, therapists, therapistMap, onUpdateInquiry }) {
  const departmentOptions = Object.keys(therapistMap);
  const autoAssigned = useMemo(() => autoAssignInquiries(inquiries, therapistMap), [inquiries, therapistMap]);
  const [selectedInquiryId, setSelectedInquiryId] = useState(autoAssigned[0]?.id ?? null);
  const [selectedTherapistName, setSelectedTherapistName] = useState(autoAssigned[0]?.assignedTherapist ?? null);
  const [changeRequests, setChangeRequests] = useState([]);
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

  useEffect(() => {
    if (!autoAssigned.length) {
      setSelectedInquiryId(null);
      setSelectedTherapistName(null);
      return;
    }

    if (!autoAssigned.some((item) => item.id === selectedInquiryId)) {
      setSelectedInquiryId(autoAssigned[0].id);
    }

    if (!selectedTherapistName && autoAssigned[0]?.assignedTherapist) {
      setSelectedTherapistName(autoAssigned[0].assignedTherapist);
    }
  }, [autoAssigned, selectedInquiryId, selectedTherapistName]);

  const selectedInquiry = autoAssigned.find((item) => item.id === selectedInquiryId) ?? autoAssigned[0] ?? null;
  const selectedChildRecord = selectedInquiry ? findChildRecord(selectedInquiry.childName) : null;
  const selectedChildDetails = selectedInquiry ? mergeChildDetails(selectedInquiry, selectedChildRecord) : null;
  const selectedTherapist =
    therapists.find((therapist) => therapist.name === selectedTherapistName) ??
    therapists.find((therapist) => therapist.name === selectedInquiry?.assignedTherapist) ??
    null;
  const selectedChildEntries = selectedChildDetails
    ? Object.entries(selectedChildDetails).filter(([key]) => key !== "id")
    : [];

  useEffect(() => {
    if (selectedInquiry?.assignedTherapist) {
      setSelectedTherapistName(selectedInquiry.assignedTherapist);
    }
  }, [selectedInquiry?.assignedTherapist]);

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

  function addChangeRequest(item, type, note) {
    setChangeRequests((prev) => [
      {
        id: `${item.id}-${type}-${Date.now()}`,
        childName: item.childName,
        type,
        note: note || "No note provided",
        therapist: item.assignedTherapist,
        schedule: formatDisplayDate(item.appointmentDate) !== "-" ? formatInquiryDateTime(item) : item.schedule ?? "-",
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  }

  function setAppointmentStatus(index, status) {
    const item = autoAssigned[index];
    const note = window.prompt(
      status === "cancelled"
        ? `Add a cancellation note for ${item.childName} (optional):`
        : `Add a reschedule note or new time for ${item.childName} (optional):`,
    );

    if (status === "cancelled") {
      addChangeRequest(item, "Cancellation requested", note);
    } else if (status === "rescheduled") {
      addChangeRequest(item, "Reschedule requested", note);
    }

    updateInquiry(index, "status", status);
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

      <div className="split-grid inquiry-layout">
        <div className="content-card inquiry-table-card">
          <div className="section-head section-head--dark">
            <div>
              <h2>Appointments / Inquiries</h2>
              <p className="section-copy">Click a child name to open the full child and parent record.</p>
            </div>
            <Badge tone="slate">{autoAssigned.length} records</Badge>
          </div>

          <Table
            columns={["Child Name", "Department", "Schedule"]}
            rows={autoAssigned.map((item, index) => [
              <button
                key={`${item.id}-name`}
                type="button"
                className="record-name-button"
                onClick={() => setSelectedInquiryId(item.id)}
              >
                {item.childName}
              </button>,
              item.department,
              formatSelectedChildDateTime(item),
            ])}
          />
        </div>

        <aside className="content-card child-record-detail-card">
          <div className="section-head section-head--dark">
            <div>
              <h2>{selectedChildDetails?.childName ?? "No child selected"}</h2>
              <p className="section-copy">
                {selectedChildDetails
                  ? `${selectedChildDetails.parent} · ${selectedChildDetails.department}`
                  : "Select a child name to inspect the full record."}
              </p>
            </div>
            {selectedChildDetails ? (
              <Badge tone={recordTone(selectedChildDetails.status)}>{selectedChildDetails.status}</Badge>
            ) : null}
          </div>

          {selectedChildDetails ? (
            <div className="record-detail-stack">
              <div className="record-highlight">
                <div>
                  <span>Schedule</span>
                  <strong>{selectedChildDetails.schedule}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedChildDetails.status}</strong>
                </div>
                <div>
                  <span>Therapist</span>
                  <strong>{selectedChildDetails.assignedTherapist}</strong>
                </div>
              </div>

              {selectedTherapist ? (
                <div className="therapist-detail-panel">
                  <div className="section-head section-head--dark">
                    <div>
                      <h2>Therapist Profile</h2>
                      <p className="section-copy">Opened from the therapist name.</p>
                    </div>
                    <Badge tone={selectedTherapist.active ? "green" : "slate"}>
                      {selectedTherapist.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <dl className="record-detail-grid record-detail-grid--single">
                    <div className="record-detail-item">
                      <dt>Name</dt>
                      <dd>{selectedTherapist.name}</dd>
                    </div>
                    <div className="record-detail-item">
                      <dt>Department</dt>
                      <dd>{selectedTherapist.department}</dd>
                    </div>
                    <div className="record-detail-item">
                      <dt>Role</dt>
                      <dd>{selectedTherapist.role}</dd>
                    </div>
                    <div className="record-detail-item">
                      <dt>Experience</dt>
                      <dd>{selectedTherapist.experience}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              <dl className="record-detail-grid">
                {selectedChildEntries.map(([key, value]) => (
                  <div key={key} className="record-detail-item">
                    <dt>{formatRecordLabel(key)}</dt>
                    <dd>{formatRecordValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="change-requests">
            <div className="section-head">
              <h2>Appointment Change Requests</h2>
              <Badge tone={changeRequests.length ? "amber" : "slate"}>{changeRequests.length} pending</Badge>
            </div>

            {changeRequests.length ? (
              <div className="change-request-list">
                {changeRequests.map((request) => (
                  <article className="change-request-item" key={request.id}>
                    <div className="change-request-top">
                      <strong>{request.childName}</strong>
                      <Badge tone={request.type === "Cancellation requested" ? "red" : "amber"}>{request.type}</Badge>
                    </div>
                    <div className="change-request-meta">
                      <span>{request.schedule}</span>
                      <span>{request.therapist}</span>
                      <span>{request.createdAt}</span>
                    </div>
                    <p>{request.note}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="note">No cancellation or reschedule requests yet.</div>
            )}
          </div>
        </aside>
      </div>
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

      </div>

      <Table
        columns={["Donor Name", "Email", "Amount", "Method", "Date", "Purpose", "Message"]}
        rows={donations.map((donation) => [
          donation.donorName ?? donation.name ?? "-",
          donation.email ?? "-",

          `₹${Number(donation.amount ?? 0)}`,
          donation.paymentMethod ?? "-",

          donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : "-",
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
        columns={["Order", "Customer", "Contact", "Items", "Payment", "Payment Status", "Amount", "Created"]}
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
          <Badge
            key={`${order.id}-payment-status`}
            tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "amber"}
          >
            {order.paymentStatus ?? "-"}
          </Badge>,

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

function TherapistManagementPage({ therapists, onUpdateTherapist, onAddTherapist, onRemoveTherapist, isAddFormOpen, onCloseAddForm }) {
  const [form, setForm] = useState({
    name: "",
    department: "",
    role: "",
    experience: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddTherapist(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      role: form.role.trim(),
      experience: form.experience.trim(),
      active: true,
    };

    if (!payload.name || !payload.department || !payload.role || !payload.experience) {
      setError("Name, department, role, and experience are required.");
      return;
    }

    setSaving(true);
    try {
      await onAddTherapist(payload);
      setForm({ name: "", department: "", role: "", experience: "" });
      onCloseAddForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add therapist.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(index) {
    const therapist = therapists[index];
    const nextActive = !(therapist.active !== false);
    await onUpdateTherapist(therapist.id, { active: nextActive });
  }

  async function removeTherapist(therapist) {
    const shouldRemove = window.confirm(`Remove ${therapist.name} from Therapist Management?`);
    if (!shouldRemove) return;

    await onRemoveTherapist(therapist.id);
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Therapist Management</h2>
        <Badge tone="purple">Department roster</Badge>
      </div>
      {isAddFormOpen ? (
        <form className="therapist-add-form" onSubmit={handleAddTherapist}>
          <Input label="Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
          <Input
            label="Department"
            value={form.department}
            onChange={(event) => updateForm("department", event.target.value)}
          />
          <Input label="Role" value={form.role} onChange={(event) => updateForm("role", event.target.value)} />
          <Input
            label="Experience"
            value={form.experience}
            placeholder="8 years"
            onChange={(event) => updateForm("experience", event.target.value)}
          />
          {error && <div className="error-box wide">{error}</div>}
          <div className="therapist-form-actions wide">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="secondary" onClick={onCloseAddForm}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      <div className="therapist-grid">
        {therapists.map((therapist, index) => (
          <article className="therapist-card" key={String(therapist.id ?? therapist.name)}>
            <div className="therapist-top">
              <div>
                <h3>{therapist.name}</h3>
                <p>{therapist.role}</p>
              </div>
              <Badge tone={therapist.active ? "green" : "slate"}>{therapist.active ? "Active" : "Inactive"}</Badge>
            </div>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{therapist.role}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{therapist.department}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{therapist.experience}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{therapist.active ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
            <div className="therapist-actions">
              <Button variant="secondary" onClick={() => toggleActive(index)}>
                {therapist.active !== false ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="danger" onClick={() => removeTherapist(therapist)}>
                Remove
              </Button>
            </div>
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

function SubscribersPage({ subscribers, onAddSubscriber }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const totalSubscribers = subscribers.length;

  async function handleSubmit(event) {
    event.preventDefault();
    const value = email.trim().toLowerCase();

    if (!value) {
      setError("Email is required.");
      setMessage("");
      return;
    }

    setError("");

    try {
      await onAddSubscriber(value);
      setMessage("Subscriber saved successfully.");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save subscriber.");
      setMessage("");
    }
  }

  return (
    <section className="split-grid">
      <div className="content-card">
        <div className="section-head">
          <h2>Subscribe</h2>
          <Badge tone="blue">{totalSubscribers} saved</Badge>
        </div>
        <p className="note">Add email addresses here to record newsletter subscribers in the admin console.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <Input
            label="Email address"
            className="wide"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="subscriber@example.com"
          />
          {error ? <div className="error-box wide">{error}</div> : null}
          {message ? <div className="note wide">{message}</div> : null}
          <div className="wide">
            <Button type="submit">Save Subscriber</Button>
          </div>
        </form>
      </div>

      <div className="content-card">
        <div className="section-head">
          <h2>Saved Subscribers</h2>
          <Badge tone={totalSubscribers ? "green" : "slate"}>{totalSubscribers}</Badge>
        </div>
        <div className="stack">
          {subscribers.length ? (
            subscribers.map((subscriber) => (
              <div className="mini-row" key={subscriber.id}>
                <span>{subscriber.email}</span>
                <Badge tone="slate">{subscriber.createdAt ? new Date(subscriber.createdAt).toLocaleDateString() : "-"}</Badge>
              </div>
            ))
          ) : (
            <div className="note">No subscribers recorded yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function ContactsPage({ contacts }) {
  const totalContacts = contacts.length;

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>Contact Messages</h2>
        <Badge tone={totalContacts ? "green" : "slate"}>{totalContacts} received</Badge>
      </div>
      <p className="note">Messages submitted from the public Contact page appear here.</p>

      <div className="panel-grid donations-stats">
        <StatCard label="Total messages" value={totalContacts} hint="All contact submissions" />
      </div>

      {contacts.length ? (
        <Table
          columns={["Name", "Email", "Subject", "Message", "Date"]}
          rows={contacts.map((contact) => [
            contact.name ?? "-",
            contact.email ?? "-",
            contact.subject ?? "-",
            contact.message ?? "-",
            contact.createdAt ? new Date(contact.createdAt).toLocaleString() : "-",
          ])}
        />
      ) : (
        <div className="note">No contact messages recorded yet.</div>
      )}
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
          {["admin", "editor", "finance", "viewer"].map((role) => (
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
  const [subscribers, setSubscribers] = useState([]);
  const [contacts, setContacts] = useState(fallbackContacts);
  const [dashboard, setDashboard] = useState(null);
  const [backendStatus, setBackendStatus] = useState("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [isAddTherapistOpen, setIsAddTherapistOpen] = useState(false);

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
        setSubscribers(bootstrap?.subscribers ?? []);
        setContacts(bootstrap?.contacts ?? fallbackContacts);
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
        setSubscribers([]);
        setContacts([]);
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

  async function handleTherapistAdd(therapist) {
    const saved = await createTherapist(therapist);
    if (saved) {
      setTherapists((prev) => [saved, ...prev]);
    }
    return saved;
  }

  async function handleTherapistRemove(id) {
    const previousTherapists = therapists;
    setTherapists((prev) => prev.filter((item) => String(item.id) !== String(id)));
    try {
      await deleteTherapist(id);
    } catch (error) {
      setTherapists(previousTherapists);
      throw error;
    }
  }

  async function handleSubscriberAdd(email) {
    const saved = await addSubscriber(email);
    if (saved) {
      setSubscribers((prev) => {
        if (prev.some((item) => String(item.email).trim().toLowerCase() === String(saved.email).trim().toLowerCase())) {
          return prev.map((item) =>
            String(item.email).trim().toLowerCase() === String(saved.email).trim().toLowerCase() ? { ...item, ...saved } : item,
          );
        }

        return [saved, ...prev];
      });
    }
    return saved;
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
            therapists={therapists}
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
        return (
          <TherapistManagementPage
            therapists={therapists}
            onUpdateTherapist={handleTherapistUpdate}
            onAddTherapist={handleTherapistAdd}
            onRemoveTherapist={handleTherapistRemove}
            isAddFormOpen={isAddTherapistOpen}
            onCloseAddForm={() => setIsAddTherapistOpen(false)}
          />
        );
      case "Availability Manager":
        return <AvailabilityPage />;
      case "Subscribe":
        return <SubscribersPage subscribers={subscribers} onAddSubscriber={handleSubscriberAdd} />;
      case "Contacts":
        return <ContactsPage contacts={contacts} />;
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
  }, [activeSection, contacts, currentUser, dashboard, donations, inquiries, isAddTherapistOpen, isConnected, orders, subscribers, therapistMap, therapists, volunteers]);

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
            {activeSection === "Therapist Management" && (
              <Button
                onClick={() => {
                  setIsAddTherapistOpen(true);
                }}
              >
                Add Therapist
              </Button>
            )}
          </div>
        </header>

        {page}
      </main>
    </div>
  );
}

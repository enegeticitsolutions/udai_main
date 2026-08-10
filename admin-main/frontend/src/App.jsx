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
  approveVolunteer,
  patchInquiry,
  patchOrder,
  patchTherapist,
  patchVolunteer,
  toggleDeactivateDate,
  sendNotification,
  createProduct,
  patchProduct,
  deleteProduct as removeProductApi,
  createCareer,
  patchCareer,
  deleteCareer as removeCareerApi,
  uploadImageFile,
  getTherapistLeaves,
  addTherapistLeave,
  deleteTherapistLeave,
} from "./services/adminApi";
import { adminLogin } from "./services/adminApi";
import ProductsPage from "./components/ProductsPage";
import CareersPage from "./components/CareersPage";
import AppointmentsPage from "./components/AppointmentsPage";
import WhatsAppBookingsPage from "./components/WhatsAppBookingsPage";
import WhatsAppMessagesPage from "./components/WhatsAppMessagesPage";

const tokenKey = "udai_standalone_admin_token";

const roleSections = {
  admin: [
    "Dashboard",
    "WhatsApp Appointments",
    "WhatsApp Messages",
    "Orders / Purchases",
    "Donations",
    "Volunteers",
    "Therapist Management",
    "Availability Manager",
    "Products",
    "Career Management",
    "Subscribe",
    "Contacts",
    "Notifications Center",
    "Message Broadcast",
    "Reports / Analytics",
    "Settings",
  ],
  editor: [
    "WhatsApp Appointments",
    "WhatsApp Messages",
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

function DashboardPage({ inquiries, therapists, donations, orders, currentUser, dashboard, isConnected, whatsappBookings = [], volunteers = [] }) {
  const totalDonations = dashboard?.donationTotal ?? donations.reduce((sum, donation) => sum + donation.amount, 0);
  const totalOrders = dashboard?.totalOrders ?? orders.length;

  const metrics = [
    { label: "Therapist Bookings (WhatsApp)", value: dashboard?.totalWhatsappBookings ?? whatsappBookings.length, hint: "Live WhatsApp chatbot sessions" },
    { label: "Donation Total", value: `₹${totalDonations}`, hint: "Funds raised" },
    { label: "Total Volunteer Requests", value: dashboard?.totalVolunteers ?? volunteers.length, hint: "Volunteer applications received" },
    { label: "Total Purchases (Orders)", value: totalOrders, hint: "E-commerce checkout orders" },
    { label: "Active Therapists", value: dashboard?.activeTherapists ?? therapists.filter((item) => item.active !== false).length, hint: "Available on panel" },
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
  const [currentTab, setCurrentTab] = useState("meal");
  const mealDonations = donations.filter((donation) => donation.donationCategory === "meal" || /meal/i.test(String(donation.purpose ?? "")));
  const futureDonations = donations.filter((donation) => !(donation.donationCategory === "meal" || /meal/i.test(String(donation.purpose ?? ""))));
  const visibleDonations = currentTab === "meal" ? mealDonations : futureDonations;
  const totalDonations = visibleDonations.reduce((sum, donation) => sum + Number(donation.amount ?? 0), 0);
  const totalMeals = visibleDonations.reduce((sum, donation) => sum + Number(donation.meals ?? 0), 0);

  return (
    <section className="content-card">
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #edf2f7", paddingBottom: "12px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setCurrentTab("meal")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: currentTab === "meal" ? "none" : "1px solid #cbd5e0",
            backgroundColor: currentTab === "meal" ? "#2f5597" : "var(--surface)",
            color: currentTab === "meal" ? "white" : "var(--text)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Donation for Meal
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab("future")}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: currentTab === "future" ? "none" : "1px solid #cbd5e0",
            backgroundColor: currentTab === "future" ? "#2f5597" : "var(--surface)",
            color: currentTab === "future" ? "white" : "var(--text)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Donation for Future
        </button>
      </div>

      <div className="section-head">
        <h2>{currentTab === "meal" ? "Meal Donations" : "Future Donations"}</h2>
        <Badge tone="green">Private donor view</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard
          label={currentTab === "meal" ? "Meal donation total" : "Future donation total"}
          value={`₹${totalDonations}`}
          hint={currentTab === "meal" ? "Mid-Day Meal donations" : "Invest in Their Future donations"}
        />
        {currentTab === "meal" ? (
          <StatCard label="Meals sponsored" value={totalMeals || "-"} hint="Known meal-count selections" />
        ) : null}
      </div>

      <Table
        columns={currentTab === "meal"
          ? ["Donor Name", "Email", "Amount", "Meals", "Method", "Date", "Purpose", "Message"]
          : ["Donor Name", "Email", "Amount", "Method", "Date", "Purpose", "Message"]}
        rows={visibleDonations.map((donation) => currentTab === "meal" ? [
          donation.donorName ?? donation.name ?? "-",
          donation.email ?? "-",
          `₹${Number(donation.amount ?? 0)}`,
          donation.meals ?? "-",
          donation.paymentMethod ?? "-",
          donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : "-",
          donation.purpose ?? "-",
          donation.message ?? "-",
        ] : [
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

function VolunteersPage({ volunteers, onUpdateVolunteer, onApproveVolunteer }) {
  const [items, setItems] = useState(volunteers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("Newest First");
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    setItems(volunteers);
  }, [volunteers]);

  async function updateVolunteerStatus(volunteer, newStatus) {
    const volId = volunteer.id;
    const previousItems = items;
    setItems((prev) => prev.map((v) => v.id === volId ? { ...v, status: newStatus } : v));
    try {
      if (newStatus === "approved") {
        const updated = await onApproveVolunteer({ ...volunteer, status: newStatus });
        if (updated) {
          setItems((prev) => prev.map((v) => v.id === volId ? { ...v, ...updated } : v));
        }
        window.alert(updated?.emailSent === false
          ? "Volunteer approved, but the approval email could not be sent. Please check email settings."
          : "Volunteer approved and approval email sent.");
      } else {
        await onUpdateVolunteer(volId, { status: newStatus });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      setItems(previousItems);
      window.alert(error.message || "Failed to update volunteer status.");
    }
  }

  // Derived metrics
  const totalApplications = items.length;
  const pendingCount = items.filter(v => ["new", "reviewed", "contacted"].includes(v.status)).length;
  const approvedCount = items.filter(v => ["approved", "task_assigned"].includes(v.status)).length;
  const rejectedCount = items.filter(v => v.status === "rejected").length;
  const thisMonthCount = items.length; // Mock value

  // Filtering
  let filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.email && item.email.toLowerCase().includes(query)) ||
      (item.phone && item.phone.includes(query));

    let matchesStatus = true;
    if (statusFilter === "Pending") matchesStatus = ["new", "reviewed", "contacted"].includes(item.status);
    if (statusFilter === "Approved") matchesStatus = ["approved", "task_assigned"].includes(item.status);
    if (statusFilter === "Rejected") matchesStatus = item.status === "rejected";

    return matchesSearch && matchesStatus;
  });

  // Sorting
  filteredItems = filteredItems.slice().sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === "Newest First" ? dateB - dateA : dateA - dateB;
  });

  const displayStatus = (status) => {
    if (["new", "reviewed", "contacted"].includes(status)) return { label: "Pending", tone: "amber" };
    if (["approved", "task_assigned"].includes(status)) return { label: "Approved", tone: "green" };
    if (status === "rejected") return { label: "Rejected", tone: "red" };
    return { label: status || "Unknown", tone: "slate" };
  };

  return (
    <section className="volunteers-page">
      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card blue">
          <div className="metric-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
          <div className="metric-info">
            <h3>{totalApplications}</h3>
            <span>Total Applications</span>
          </div>
        </div>
        <div className="metric-card amber">
          <div className="metric-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
          <div className="metric-info">
            <h3>{pendingCount}</h3>
            <span>Pending</span>
          </div>
        </div>
        <div className="metric-card green">
          <div className="metric-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <div className="metric-info">
            <h3>{approvedCount}</h3>
            <span>Approved</span>
          </div>
        </div>
        <div className="metric-card red">
          <div className="metric-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>
          <div className="metric-info">
            <h3>{rejectedCount}</h3>
            <span>Rejected</span>
          </div>
        </div>
        <div className="metric-card purple">
          <div className="metric-icon"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
          <div className="metric-info">
            <h3>{thisMonthCount}</h3>
            <span>This Month</span>
          </div>
        </div>
      </div>

      <div className="content-card mb-0">
        <div className="filters-row">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="dropdown-group">
            <div className="dropdown-box">
              <label>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
            <div className="dropdown-box">
              <label>Sort by</label>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
          </div>

          <button className="export-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
        </div>

        <div className="table-responsive">
          <table className="volunteers-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Availability</th>
                <th>Interest</th>
                <th>Applied On</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((vol) => {
                const badge = displayStatus(vol.status);
                const appliedOn = vol.createdAt 
                  ? vol.createdAt.split(" ").slice(0, 3).join(" ")
                  : "20 May 2026";

                return (
                  <tr key={vol.id}>
                    <td>{vol.name}</td>
                    <td>{vol.email}</td>
                    <td>{vol.phone}</td>
                    <td>{vol.availability}</td>
                    <td>{vol.interestArea}</td>
                    <td>{appliedOn}</td>
                    <td>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </td>
                    <td>
                      <div className="actions-cell relative">
                        <button className="action-icon more-btn" onClick={() => setActiveDropdown(activeDropdown === vol.id ? null : vol.id)} title="View Details">
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                        
                        {activeDropdown === vol.id && (
                          <div className="message-dropdown shadow-lg" style={{ right: '0', top: '40px', width: '360px', padding: '16px', textAlign: 'left', zIndex: 100, cursor: 'default' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                              <div><strong>Aadhar:</strong><br/> {vol.aadhar || "—"}</div>
                              <div><strong>PAN:</strong><br/> {vol.pan || "—"}</div>
                              <div><strong>Address:</strong><br/> {vol.fullAddress || "—"}</div>
                              {(vol.timeFrom || vol.timeTo) && (
                                <div><strong>Time:</strong><br/> {vol.timeFrom || ""}{vol.timeTo ? ` – ${vol.timeTo}` : ""}</div>
                              )}
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => { updateVolunteerStatus(vol, "approved"); setActiveDropdown(null); }}
                                style={{ flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none', background: '#22c55e', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                              >
                                Approved
                              </button>
                              <button
                                onClick={() => { updateVolunteerStatus(vol, "new"); setActiveDropdown(null); }}
                                style={{ flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                              >
                                Pending
                              </button>
                              <button
                                onClick={() => { updateVolunteerStatus(vol, "rejected"); setActiveDropdown(null); }}
                                style={{ flex: 1, padding: '7px 0', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center" style={{ padding: "32px" }}>No volunteers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-row">
          <span>Showing 1 to {filteredItems.length} of {totalApplications} entries</span>
          <div className="pagination-controls">
            <button>&lt;</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <span>...</span>
            <button>19</button>
            <button>&gt;</button>
          </div>
        </div>
      </div>

      <style>{`
        .volunteers-page {
          min-height: 100vh;
        }
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .metric-card {
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid var(--line);
        }
        .metric-card.blue { background: #f0f6ff; border-color: #dbeafe; }
        .metric-card.blue .metric-icon { background: var(--surface); color: #3b82f6; }
        .metric-card.amber { background: #fffbeb; border-color: #fef3c7; }
        .metric-card.amber .metric-icon { background: var(--surface); color: #f59e0b; }
        .metric-card.green { background: #f0fdf4; border-color: #dcfce7; }
        .metric-card.green .metric-icon { background: var(--surface); color: #22c55e; }
        .metric-card.red { background: #fef2f2; border-color: #fee2e2; }
        .metric-card.red .metric-icon { background: var(--surface); color: #ef4444; }
        .metric-card.purple { background: #faf5ff; border-color: #f3e8ff; }
        .metric-card.purple .metric-icon { background: var(--surface); color: #a855f7; }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .metric-info h3 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
          line-height: 1;
        }
        .metric-info span {
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
          margin-top: 4px;
          display: block;
        }

        .mb-0 { margin-bottom: 0; }
        .filters-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid var(--line);
          flex-wrap: wrap;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
        }
        .search-box svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-box input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          border: 1px solid var(--line);
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }
        .search-box input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
        }
        .dropdown-group {
          display: flex;
          gap: 16px;
        }
        .dropdown-box {
          display: flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0 12px;
          background: var(--surface);
          position: relative;
          height: 42px;
        }
        .dropdown-box label {
          font-size: 11px;
          color: var(--muted);
          position: absolute;
          top: -8px;
          left: 8px;
          background: var(--surface);
          padding: 0 4px;
        }
        .dropdown-box select {
          border: none;
          padding: 12px 0;
          font-size: 14px;
          color: var(--text);
          outline: none;
          background: transparent;
          cursor: pointer;
          min-width: 120px;
        }
        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #2563eb;
          color: white;
          border: none;
          padding: 11px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          font-size: 14px;
          margin-left: auto;
        }
        .export-btn:hover {
          background: #1d4ed8;
        }

        .table-responsive {
          overflow-x: auto;
        }
        .volunteers-table {
          width: 100%;
          border-collapse: collapse;
        }
        .volunteers-table th, .volunteers-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
          color: var(--muted);
          text-align: left;
          word-break: break-word;
        }
        .volunteers-table th {
          font-weight: 600;
          color: var(--text);
          background: var(--surface);
          font-size: 13px;
        }
        .volunteers-table tr:hover td {
          background: #f8fafc;
        }
        .action-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .action-icon.view { color: #3b82f6; border-color: #bfdbfe; }
        .action-icon.view:hover { background: #eff6ff; }
        .action-icon.more-btn { color: var(--muted); border-color: #cbd5e1; }
        .action-icon.more-btn:hover { background: #f1f5f9; }
        .action-icon.delete { color: #ef4444; border-color: #fecaca; }
        .action-icon.delete:hover { background: #fef2f2; }
        
        .pagination-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-top: 1px solid var(--line);
          font-size: 13px;
          color: var(--muted);
        }
        .pagination-controls {
          display: flex;
          gap: 4px;
        }
        .pagination-controls button {
          min-width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--muted);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        .pagination-controls button.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
        .pagination-controls button:hover:not(.active) {
          background: #f1f5f9;
        }
        .pagination-controls span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
        }
      `}</style>
    </section>
  );
}

function TherapistManagementPage({ therapists, onUpdateTherapist, onAddTherapist, onRemoveTherapist, isAddFormOpen, onCloseAddForm }) {
  const [form, setForm] = useState({
    name: "",
    department: "",
    role: "",
    experience: "",
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit State
  const [editingTherapistId, setEditingTherapistId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    department: "",
    role: "",
    experience: "",
    image: "",
    imageFile: null,
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEditTherapist(therapist) {
    setEditingTherapistId(therapist.id);
    setEditForm({
      name: therapist.name ?? "",
      department: therapist.department ?? "",
      role: therapist.role ?? "",
      experience: therapist.experience ?? "",
      image: therapist.image ?? "",
      imageFile: null,
    });
    setEditError("");
  }

  function cancelEditTherapist() {
    setEditingTherapistId(null);
    setEditForm({ name: "", department: "", role: "", experience: "", image: "", imageFile: null });
    setEditError("");
  }

  async function handleAddTherapist(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      role: form.role.trim(),
      experience: form.experience.trim(),
      image: "",
      active: true,
    };

    if (!payload.name || !payload.department || !payload.role || !payload.experience) {
      setError("Name, department, role, and experience are required.");
      return;
    }

    setSaving(true);
    try {
      if (form.imageFile) {
        const uploadResult = await uploadImageFile(form.imageFile);
        payload.image = uploadResult?.url ?? "";
      }
      await onAddTherapist(payload);
      setForm({ name: "", department: "", role: "", experience: "", imageFile: null });
      onCloseAddForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add therapist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    if (!editingTherapistId) return;
    setEditError("");

    const payload = {
      name: editForm.name.trim(),
      department: editForm.department.trim(),
      role: editForm.role.trim(),
      experience: editForm.experience.trim(),
      image: editForm.image,
    };

    if (!payload.name || !payload.department || !payload.role) {
      setEditError("Name, department, and role are required.");
      return;
    }

    setEditSaving(true);
    try {
      if (editForm.imageFile) {
        const uploadResult = await uploadImageFile(editForm.imageFile);
        if (uploadResult?.url) {
          payload.image = uploadResult.url;
        }
      }
      await onUpdateTherapist(editingTherapistId, payload);
      cancelEditTherapist();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update therapist.");
    } finally {
      setEditSaving(false);
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
          <Input
            label="Picture"
            type="file"
            accept="image/*"
            onChange={(event) => updateForm("imageFile", event.target.files?.[0] ?? null)}
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
        {therapists.map((therapist, index) => {
          const isEditing = String(therapist.id) === String(editingTherapistId);
          return (
            <article className="therapist-card" key={String(therapist.id ?? therapist.name)} style={isEditing ? { border: "2px solid #2f5597", boxShadow: "0 8px 24px rgba(47, 85, 151, 0.15)" } : {}}>
              <div className="therapist-top">
                <img
                  className="therapist-photo"
                  src={therapist.image || "/images/doctor2.png"}
                  alt={therapist.name}
                />
                <div>
                  <h3>{therapist.name}</h3>
                  <p>{therapist.role}</p>
                </div>
                <Badge tone={therapist.active !== false ? "green" : "slate"}>
                  {therapist.active !== false ? "Active" : "Inactive"}
                </Badge>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdit} style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
                  <Input
                    label="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    label="Department"
                    value={editForm.department}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                  />
                  <Input
                    label="Role"
                    value={editForm.role}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  />
                  <Input
                    label="Experience"
                    value={editForm.experience}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, experience: e.target.value }))}
                  />
                  <Input
                    label="Change Picture"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditForm((prev) => ({ ...prev, imageFile: e.target.files?.[0] ?? null }))}
                  />
                  {editError && <div className="error-box" style={{ fontSize: "0.85rem", color: "#dc2626" }}>{editError}</div>}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <Button type="submit" disabled={editSaving}>
                      {editSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="secondary" onClick={cancelEditTherapist}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
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
                      <dd>{therapist.active !== false ? "Active" : "Inactive"}</dd>
                    </div>
                  </dl>
                  <div className="therapist-actions">
                    <Button variant="secondary" onClick={() => startEditTherapist(therapist)}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => toggleActive(index)}>
                      {therapist.active !== false ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="danger" onClick={() => removeTherapist(therapist)}>
                      Remove
                    </Button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AvailabilityPage({ therapists, deactivatedDates, onToggleDeactivate }) {
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    async function loadLeaves() {
      try {
        const data = await getTherapistLeaves();
        setLeaves(data || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadLeaves();
  }, []);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        iso: d.toISOString().split("T")[0],
        display: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        dayOfWeek: d.getDay(),
      });
    }
    return arr;
  }, []);

  const displayTherapists = useMemo(() => {
    const seededNames = ["Harsimran", "Nikki", "Anamika", "Divya", "Veshali", "Sakshi"];
    return therapists.filter(t => 
      t.active !== false && 
      seededNames.includes(t.name)
    );
  }, [therapists]);

  const getStatus = (therapist, day) => {
    const dayOfWeek = day.dayOfWeek;
    const dateStr = day.iso;
    const therapistIdStr = String(therapist.id ?? therapist._id);

    // 1. Check weeklySchedule base availability
    const isScheduled = therapist.weeklySchedule?.some((s) => s.day === dayOfWeek);
    if (!isScheduled) {
      return "Not Scheduled";
    }

    // 2. Check full-day leave record
    const hasFullLeave = leaves.some(
      (l) => String(l.therapistId) === therapistIdStr && l.date === dateStr && l.type === "full"
    );
    if (hasFullLeave) {
      return "Unavailable";
    }

    // 3. Check partial leave record
    const hasPartialLeave = leaves.some(
      (l) => String(l.therapistId) === therapistIdStr && l.date === dateStr && l.type === "partial"
    );
    if (hasPartialLeave) {
      return "Partially Unavailable";
    }

    // 4. Check legacy deactivatedDates
    const isDeactivated = deactivatedDates.some(
      (d) => String(d.therapistId) === therapistIdStr && d.date === dateStr
    );
    if (isDeactivated) {
      return "Unavailable";
    }

    return "Available";
  };

  async function toggleStatus(therapist, day) {
    const status = getStatus(therapist, day);
    const therapistIdStr = String(therapist.id ?? therapist._id);
    const dateStr = day.iso;

    if (status === "Available") {
      try {
        await addTherapistLeave({
          therapistId: therapistIdStr,
          date: dateStr,
          type: "full",
          reason: "Marked Unavailable from Calendar",
        });
        const data = await getTherapistLeaves();
        setLeaves(data || []);
      } catch (err) {
        alert("Failed to mark therapist unavailable.");
      }
    } else if (status === "Unavailable" || status === "Partially Unavailable") {
      const record = leaves.find(
        (l) => String(l.therapistId) === therapistIdStr && l.date === dateStr
      );
      if (record) {
        try {
          await deleteTherapistLeave(record.id);
          const data = await getTherapistLeaves();
          setLeaves(data || []);
        } catch (err) {
          alert("Failed to restore therapist availability.");
        }
      } else {
        await onToggleDeactivate(therapist.id, dateStr);
      }
    }
  }

  const getButtonProps = (status) => {
    switch (status) {
      case "Available":
        return { className: "date-toggle active", text: "Available", style: {} };
      case "Unavailable":
        return { className: "date-toggle deactivated", text: "Unavailable", style: {} };
      case "Partially Unavailable":
        return {
          className: "date-toggle deactivated",
          text: "Partially Unavailable",
          style: { background: "#e9d5ff", color: "#6b21a8", borderColor: "#c084fc" }
        };
      case "Not Scheduled":
      default:
        return {
          className: "date-toggle deactivated",
          text: "Not Scheduled",
          style: { background: "#f1f5f9", color: "#94a3b8", borderColor: "#e2e8f0", cursor: "not-allowed" },
          disabled: true
        };
    }
  };

  return (
    <section className="content-card">
      <div className="section-head">
        <div>
          <h2>Availability Manager</h2>
          <p className="section-copy">Manage doctor availability for today and the next 4 days. Click an available day to mark unavailable.</p>
        </div>
        <Badge tone="amber">Today + 4 Days</Badge>
      </div>

      <div className="availability-grid-container">
        <div className="availability-scroll">
          <table className="availability-table">
            <thead>
              <tr>
                <th className="sticky-col">Doctor / Therapist</th>
                {days.map((day) => (
                  <th key={day.iso}>{day.display}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTherapists.map((therapist) => (
                <tr key={therapist.id}>
                  <td className="sticky-col">
                    <div className="doctor-info">
                      <strong>{therapist.name}</strong>
                      <span>{therapist.department}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const status = getStatus(therapist, day);
                    const props = getButtonProps(status);
                    return (
                      <td key={day.iso}>
                        <button
                          type="button"
                          className={props.className}
                          style={props.style}
                          disabled={props.disabled}
                          onClick={() => toggleStatus(therapist, day)}
                          title={`${status} — Click to toggle`}
                        >
                          {props.text}
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

      <style>{`
        .availability-grid-container {
          margin-top: 24px;
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        .availability-scroll {
          overflow-x: auto;
        }
        .availability-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .availability-table th, .availability-table td {
          padding: 16px;
          border-bottom: 1px solid var(--line);
          min-width: 120px;
        }
        .availability-table th {
          background: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sticky-col {
          position: sticky;
          left: 0;
          background: var(--surface);
          z-index: 10;
          border-right: 2px solid #e2e8f0;
          min-width: 200px !important;
        }
        .doctor-info strong {
          display: block;
          color: var(--text);
          font-size: 14px;
        }
        .doctor-info span {
          font-size: 11px;
          color: var(--muted);
        }
        .date-toggle {
          width: 100%;
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .date-toggle.active {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #10b981;
        }
        .date-toggle.active:hover {
          background: #fecaca;
          color: #dc2626;
          border-color: #ef4444;
        }
        .date-toggle.deactivated {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #ef4444;
        }
        .date-toggle.deactivated:hover {
          background: #d1fae5;
          color: #059669;
          border-color: #10b981;
        }
      `}</style>
    </section>
  );
}

function NotificationsPage({ inquiries = [], onSendNotification }) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterLocation, setFilterLocation] = useState("New Delhi Clinic");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingState, setSendingState] = useState({});

  const filteredInquiries = inquiries.filter(item => {
    if (filterDate && item.appointmentDate !== filterDate) return false;
    if (searchQuery && !item.childName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const messageOptions = ["Appointment confirmed", "Reminder", "Reschedule", "Cancel"];

  const handleSend = async (item, opt) => {
    setSendingState(prev => ({ ...prev, [`${item.id}-${opt}`]: "sending" }));
    try {
      await onSendNotification({
        inquiryId: item.id,
        type: opt,
        phone: item.phone,
        childName: item.childName
      });
      setSendingState(prev => ({ ...prev, [`${item.id}-${opt}`]: "sent" }));
      setTimeout(() => {
        setActiveDropdown(null);
        setSendingState(prev => ({ ...prev, [`${item.id}-${opt}`]: null }));
      }, 1000);
    } catch (error) {
      console.error(error);
      setSendingState(prev => ({ ...prev, [`${item.id}-${opt}`]: "error" }));
    }
  };

  return (
    <section className="content-card notifications-page">
      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Manage by Appointment Date</label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Select Location</label>
          <select 
            value={filterLocation} 
            onChange={(e) => setFilterLocation(e.target.value)}
            className="filter-input"
          >
            <option>New Delhi Clinic</option>
            <option>Online</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search Patients</label>
          <input 
            type="text" 
            placeholder="Search Patients" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      <div className="section-head mt-6">
        <h2>{filterDate ? `Appointments for Therapy on ${formatDisplayDate(filterDate)}` : "All Appointments for Therapy"}</h2>
      </div>

      <div className="table-responsive">
        <table className="notifications-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Child Name</th>
              <th>Parent's Name</th>
              <th>Phone Number</th>
              <th>Therapist</th>
              <th>Status</th>
              <th className="text-center">Send Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredInquiries.length > 0 ? filteredInquiries.map((item, index) => (
              <tr key={item.id}>
                <td>{item.appointmentTime || "-"}</td>
                <td>{item.childName || "-"}</td>
                <td>{item.parent || "-"}</td>
                <td>
                  {item.parentPhone || item.phone || "-"}
                </td>
                <td>{item.assignedTherapist || "-"}</td>
                <td>
                  <Badge tone={inquiryTone(item.status)}>{item.status}</Badge>
                </td>
                <td>
                  <div className="actions-cell relative">
                    <button 
                      className="action-btn more-btn" 
                      onClick={() => setActiveDropdown(activeDropdown === index ? null : index)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                    
                    {activeDropdown === index && (
                      <div className="message-dropdown shadow-lg">
                        {messageOptions.map((opt) => {
                          const state = sendingState[`${item.id}-${opt}`];
                          return (
                            <div key={opt} className="message-dropdown-item">
                              <span>{opt}</span>
                              <button 
                                className={`send-btn ${state === "sent" ? "success" : state === "error" ? "error" : ""}`} 
                                onClick={() => handleSend(item, opt)}
                                disabled={state === "sending" || state === "sent"}
                              >
                                {state === "sending" ? "Sending..." : state === "sent" ? "Sent ✓" : state === "error" ? "Failed" : "Send"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "24px" }}>No appointments found for this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .notifications-page {
          padding: 24px;
        }
        .filters-bar {
          display: flex;
          gap: 20px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--line);
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 200px;
        }
        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
        }
        .filter-input {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: var(--surface);
          font-size: 14px;
          outline: none;
        }
        .filter-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        .mt-6 { margin-top: 24px; }
        .table-responsive {
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 12px;
        }
        .notifications-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .notifications-table th, .notifications-table td {
          padding: 16px;
          border-bottom: 1px solid var(--line);
          font-size: 14px;
          color: var(--text);
        }
        .notifications-table th {
          background: #f8fafc;
          font-weight: 600;
          color: var(--muted);
        }
        .actions-cell {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
        }
        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          color: white;
          transition: opacity 0.2s;
        }
        .action-btn:hover {
          opacity: 0.9;
        }
        .more-btn {
          background: #3b82f6;
        }
        .message-dropdown {
          position: absolute;
          right: 0;
          top: 40px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          width: 250px;
          z-index: 50;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .message-dropdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .message-dropdown-item:last-child {
          border-bottom: none;
        }
        .message-dropdown-item span {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        .send-btn {
          background: transparent;
          border: 1px solid #3b82f6;
          color: #3b82f6;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .send-btn:hover {
          background: #eff6ff;
        }
        .relative { position: relative; }
        .text-center { text-align: center !important; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      `}</style>
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
  const [deactivatedDates, setDeactivatedDates] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [contacts, setContacts] = useState(fallbackContacts);
  const [products, setProducts] = useState([]);
  const [careers, setCareers] = useState([]);
  const [whatsappBookings, setWhatsappBookings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [backendStatus, setBackendStatus] = useState("loading");
  const [isConnected, setIsConnected] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [isAddTherapistOpen, setIsAddTherapistOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("adminTheme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark-theme", theme === "dark");
    localStorage.setItem("adminTheme", theme);
  }, [theme]);

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
        setDeactivatedDates(bootstrap?.deactivatedDates ?? []);
        setProducts(bootstrap?.products ?? []);
        setCareers(bootstrap?.careers ?? []);
        setWhatsappBookings(bootstrap?.whatsappBookings ?? []);
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
        setDeactivatedDates([]);
        setProducts([]);
        setCareers([]);
        setWhatsappBookings([]);
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

  async function handleVolunteerApproval(volunteer) {
    const saved = await approveVolunteer(volunteer);
    if (saved) {
      setVolunteers((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
    }
    return saved;
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

  async function handleToggleDeactivate(therapistId, date) {
    // Optimistic update
    setDeactivatedDates((prev) => {
      const exists = prev.some((d) => String(d.therapistId) === String(therapistId) && d.date === date);
      if (exists) {
        return prev.filter((d) => !(String(d.therapistId) === String(therapistId) && d.date === date));
      }
      return [...prev, { therapistId, date }];
    });

    try {
      const result = await toggleDeactivateDate(therapistId, date);
      // Refresh bootstrap to get latest cancelled inquiries and deactivated dates
      const bootstrap = await getAdminBootstrap();
      setDeactivatedDates(bootstrap?.deactivatedDates ?? []);
      setInquiries(autoAssignInquiries(bootstrap?.inquiries ?? [], buildDepartmentMap(bootstrap?.therapists ?? therapists)));
    } catch (error) {
      console.error(error);
      // Revert on error could be added here
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

  async function handleSendNotification(payload) {
    await sendNotification(payload);
  }

  async function handleProductAdd(productData) {
    const saved = await createProduct(productData);
    if (saved) {
      setProducts((prev) => [...prev, saved]);
    }
    return saved;
  }

  async function handleProductUpdate(id, updates) {
    const saved = await patchProduct(id, updates);
    if (saved) {
      setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, ...saved } : item)));
    }
    return saved;
  }

  async function handleProductRemove(id) {
    const success = await removeProductApi(id);
    if (success) {
      setProducts((prev) => prev.filter((item) => item.id !== id));
    }
    return success;
  }

  async function handleCareerAdd(careerData) {
    const saved = await createCareer(careerData);
    if (saved) {
      setCareers((prev) => [saved, ...prev]);
    }
    return saved;
  }

  async function handleCareerUpdate(id, updates) {
    const saved = await patchCareer(id, updates);
    if (saved) {
      setCareers((prev) => prev.map((item) => (String(item.id) === String(id) ? { ...item, ...saved } : item)));
    }
    return saved;
  }

  async function handleCareerRemove(id) {
    const success = await removeCareerApi(id);
    if (success) {
      setCareers((prev) => prev.filter((item) => String(item.id) !== String(id)));
    }
    return success;
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
            whatsappBookings={whatsappBookings}
            volunteers={volunteers}
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
        return <VolunteersPage volunteers={volunteers} onUpdateVolunteer={handleVolunteerUpdate} onApproveVolunteer={handleVolunteerApproval} />;
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
        return (
          <AvailabilityPage
            therapists={therapists}
            deactivatedDates={deactivatedDates}
            onToggleDeactivate={handleToggleDeactivate}
          />
        );
      case "Products":
        return (
          <ProductsPage
            products={products}
            onAddProduct={handleProductAdd}
            onUpdateProduct={handleProductUpdate}
            onDeleteProduct={handleProductRemove}
          />
        );
      case "Career Management":
        return (
          <CareersPage
            careers={careers}
            onAddCareer={handleCareerAdd}
            onUpdateCareer={handleCareerUpdate}
            onDeleteCareer={handleCareerRemove}
          />
        );
      case "WhatsApp Appointments":
        return <WhatsAppBookingsPage bookings={whatsappBookings} />;
      case "WhatsApp Messages":
        return <WhatsAppMessagesPage />;
      case "Subscribe":
        return <SubscribersPage subscribers={subscribers} onAddSubscriber={handleSubscriberAdd} />;
      case "Contacts":
        return <ContactsPage contacts={contacts} />;
      case "Notifications Center":
        return <NotificationsPage inquiries={inquiries} onSendNotification={handleSendNotification} />;
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
  }, [activeSection, careers, contacts, currentUser, dashboard, deactivatedDates, donations, inquiries, isAddTherapistOpen, isConnected, orders, subscribers, therapistMap, therapists, volunteers, products, whatsappBookings]);

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
            <Button
              variant="secondary"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
            <div className={`connection-dot connection-dot--${backendStatus}`} aria-label={backendStatusLabel(backendStatus)} />
            <Badge tone="green">{currentUser.role}</Badge>
            {backendError ? <span className="backend-error">{backendError}</span> : null}

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

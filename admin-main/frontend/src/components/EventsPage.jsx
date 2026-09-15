import { useState } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";
import StatCard from "./StatCard";

const emptyForm = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  time: "9:00 AM - 5:00 PM",
  location: "",
  category: "Community",
  description: "",
  attendees: 100,
  isRoadmap: false,
};

const CATEGORY_OPTIONS = [
  "Community",
  "Fundraiser",
  "Seasonal",
  "Education",
  "Growth",
  "Infrastructure",
  "Sports",
  "Workshop",
  "Awareness",
  "General",
];

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e0",
  fontSize: "14px",
  fontFamily: "inherit",
  background: "white",
};

export default function EventsPage({ events = [], onAddEvent, onUpdateEvent, onDeleteEvent }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const upcomingCount = events.filter((e) => !e.isRoadmap).length;
  const roadmapCount = events.filter((e) => Boolean(e.isRoadmap)).length;

  const filteredEvents = events.filter((item) => {
    const matchesFilter =
      filterType === "all"
        ? true
        : filterType === "upcoming"
        ? !item.isRoadmap
        : Boolean(item.isRoadmap);

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.location && item.location.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term));

    return matchesFilter && matchesSearch;
  });

  function openAddModal() {
    setEditingEvent(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(eventItem) {
    setEditingEvent(eventItem);
    setFormData({
      title: eventItem.title || "",
      date: eventItem.date || new Date().toISOString().slice(0, 10),
      time: eventItem.time || "9:00 AM - 5:00 PM",
      location: eventItem.location || "",
      category: eventItem.category || "Community",
      description: eventItem.description || "",
      attendees: eventItem.attendees ?? 100,
      isRoadmap: Boolean(eventItem.isRoadmap),
    });
    setIsModalOpen(true);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...formData,
      attendees: Number(formData.attendees) || 0,
      isRoadmap: Boolean(formData.isRoadmap),
    };

    try {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, payload);
      } else {
        await onAddEvent(payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(`Unable to save event: ${error.message}`);
    }
  }

  async function handleDelete(eventItem) {
    const id = typeof eventItem === "object" ? (eventItem?.id ?? eventItem?._id) : eventItem;
    const title = typeof eventItem === "object" ? eventItem?.title : "this event";
    if (!id) {
      alert("Error: Unable to find Event ID.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await onDeleteEvent(id);
    } catch (error) {
      alert(`Unable to delete event: ${error?.message || error}`);
    }
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <div>
          <h2>Upcoming Events &amp; Future Roadmap</h2>
          <p className="section-copy">
            Manage the events and future milestones displayed on the public website home page.
          </p>
        </div>
        <Button onClick={openAddModal}>Add New Event</Button>
      </div>

      <div className="panel-grid">
        <StatCard label="Total Items" value={events.length} hint="All events & milestones" />
        <StatCard label="Upcoming Events" value={upcomingCount} hint="Featured on public site left card" />
        <StatCard label="Future Roadmap" value={roadmapCount} hint="Displayed on public site right column" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "24px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setFilterType("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              background: filterType === "all" ? "#24396f" : "white",
              color: filterType === "all" ? "white" : "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("upcoming")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              background: filterType === "upcoming" ? "#24396f" : "white",
              color: filterType === "upcoming" ? "white" : "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Upcoming Events ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("roadmap")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid #cbd5e1",
              background: filterType === "roadmap" ? "#24396f" : "white",
              color: filterType === "roadmap" ? "white" : "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Future Roadmap ({roadmapCount})
          </button>
        </div>

        <div style={{ maxWidth: "280px", width: "100%" }}>
          <input
            type="search"
            placeholder="Search by title, category, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
            }}
          />
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: "16px" }}>
        <table>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Event Title &amp; Description</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th>Attendees</th>
              <th style={{ textAlign: "right", width: "140px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  No events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.date}</strong>
                    <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                      {item.time || "All Day"}
                    </div>
                  </td>
                  <td>
                    <strong>{item.title}</strong>
                    <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px", maxWidth: "340px" }}>
                      {item.description}
                    </div>
                  </td>
                  <td>
                    <Badge tone={item.isRoadmap ? "orange" : "green"}>
                      {item.isRoadmap ? "Roadmap" : "Upcoming"}
                    </Badge>
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
                      {item.category || "General"}
                    </span>
                  </td>
                  <td>{item.location || "Online"}</td>
                  <td>{item.attendees || "-"}</td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                      <Button variant="secondary" onClick={() => openEditModal(item)}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(item)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.48)",
          }}
        >
          <div
            style={{
              width: "min(740px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 20px 35px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ margin: 0 }}>{editingEvent ? "Edit Event" : "Add New Event"}</h3>
              <button
                type="button"
                aria-label="Close event editor"
                onClick={() => setIsModalOpen(false)}
                style={{ border: 0, background: "transparent", fontSize: "24px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px", padding: "20px" }}>
              <div className="form-grid">
                <Input
                  label="Event Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Annual Charity Gala"
                  required
                />
                <Input
                  label="Date (YYYY-MM-DD)"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-grid">
                <Input
                  label="Time Range"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  placeholder="e.g., 6:00 PM - 10:00 PM"
                  required
                />
                <Input
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Grand Hotel Ballroom"
                  required
                />
              </div>

              <div className="form-grid">
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    style={fieldStyle}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Expected Attendees"
                  name="attendees"
                  type="number"
                  value={formData.attendees}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    name="isRoadmap"
                    checked={formData.isRoadmap}
                    onChange={handleChange}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span>Display under &quot;Future Roadmap&quot; (Right side column on website)</span>
                </label>
                <p style={{ margin: "4px 0 0 28px", fontSize: "12px", color: "#64748b" }}>
                  Uncheck to display as an active Upcoming Event card with RSVP button on the website.
                </p>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600" }}>
                  Event Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  style={fieldStyle}
                  placeholder="Provide details about the event, activities, or fundraising goals..."
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

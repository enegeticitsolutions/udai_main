import React, { useState, useMemo } from "react";
import Badge from "./Badge";
import Table from "./Table";
import StatCard from "./StatCard";
import Input from "./Input";

export default function WhatsAppBookingsPage({ bookings = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredItems = useMemo(() => {
    return bookings.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.phone && item.phone.includes(query)) ||
        (item.doctor && item.doctor.toLowerCase().includes(query));

      let matchesStatus = true;
      if (statusFilter !== "All Status") {
        matchesStatus = item.step === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const completedCount = bookings.filter((b) => b.step === "completed").length;
  const inProgressCount = bookings.length - completedCount;

  function getStepTone(step) {
    if (step === "completed") return "green";
    if (step === "ask_name" || step === "ask_age" || step === "ask_doctor") return "amber";
    return "slate";
  }

  function formatDisplayDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <h2>WhatsApp Bookings</h2>
        <Badge tone="green">Msg91 Automation</Badge>
      </div>

      <div className="panel-grid donations-stats">
        <StatCard label="Total Interactions" value={bookings.length} hint="All users who started chat" />
        <StatCard label="Completed Bookings" value={completedCount} hint="Finished full flow" />
        <StatCard label="In Progress / Dropped" value={inProgressCount} hint="Mid-flow users" />
      </div>

      <div className="table-controls" style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Search name, phone, doctor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
          />
        </div>
        <div style={{ minWidth: "200px" }}>
          <label className="field">
            <span>Filter by Step</span>
            <select
              className="select-inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="completed">Completed</option>
              <option value="ask_name">Ask Name</option>
              <option value="ask_age">Ask Age</option>
              <option value="ask_doctor">Ask Doctor</option>
            </select>
          </label>
        </div>
      </div>

      <Table
        columns={["Phone", "Name", "Age", "Doctor/Dept", "Step", "Last Updated"]}
        rows={filteredItems.map((item) => [
          <strong key={`${item.id}-phone`}>{item.phone || "-"}</strong>,
          item.name || "-",
          item.age || "-",
          item.doctor || "-",
          <Badge key={`${item.id}-step`} tone={getStepTone(item.step)}>
            {item.step || "unknown"}
          </Badge>,
          formatDisplayDate(item.updatedAt || item.createdAt),
        ])}
      />
    </section>
  );
}

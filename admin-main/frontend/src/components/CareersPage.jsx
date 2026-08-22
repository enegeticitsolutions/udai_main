import { useState } from "react";
import Badge from "./Badge";
import Button from "./Button";
import Input from "./Input";
import StatCard from "./StatCard";

const emptyForm = {
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  experience: "",
  description: "",
  responsibilities: "",
  requirements: "",
  status: "open",
};

function listText(items) {
  return Array.isArray(items) ? items.join("\n") : "";
}

function parseList(value) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

const fieldStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e0",
  fontSize: "14px",
  fontFamily: "inherit",
  background: "white",
};

export default function CareersPage({ careers, onAddCareer, onUpdateCareer, onDeleteCareer }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const openCareers = careers.filter((career) => career.status !== "closed").length;

  function openAddModal() {
    setEditingCareer(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(career) {
    setEditingCareer(career);
    setFormData({
      title: career.title || "",
      department: career.department || "",
      location: career.location || "",
      type: career.type || "Full-time",
      experience: career.experience || "",
      description: career.description || "",
      responsibilities: listText(career.responsibilities),
      requirements: listText(career.requirements),
      status: career.status || "open",
    });
    setIsModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...formData,
      responsibilities: parseList(formData.responsibilities),
      requirements: parseList(formData.requirements),
    };

    try {
      if (editingCareer) {
        await onUpdateCareer(editingCareer.id, payload);
      } else {
        await onAddCareer(payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert(`Unable to save career: ${error.message}`);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this career listing?")) return;

    try {
      await onDeleteCareer(id);
    } catch (error) {
      alert(`Unable to delete career: ${error.message}`);
    }
  }

  return (
    <section className="content-card">
      <div className="section-head">
        <div>
          <h2>Career Management</h2>
          <p className="section-copy">Manage the opportunities displayed on the public Careers page.</p>
        </div>
        <Button onClick={openAddModal}>Add Career</Button>
      </div>

      <div className="panel-grid">
        <StatCard label="Total Roles" value={careers.length} hint="Saved career listings" />
        <StatCard label="Open Roles" value={openCareers} hint="Visible on the website" />
        <StatCard label="Closed Roles" value={careers.length - openCareers} hint="Hidden from public view" />
      </div>

      <div className="table-wrap" style={{ marginTop: "24px" }}>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Department</th>
              <th>Location</th>
              <th>Type</th>
              <th>Experience</th>
              <th>Status</th>
              <th style={{ textAlign: "right", width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {careers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  No career listings found.
                </td>
              </tr>
            ) : (
              careers.map((career) => (
                <tr key={career.id}>
                  <td>
                    <strong>{career.title}</strong>
                    <div style={{ color: "#718096", fontSize: "12px", marginTop: "4px", maxWidth: "280px" }}>
                      {career.description}
                    </div>
                  </td>
                  <td>{career.department}</td>
                  <td>{career.location}</td>
                  <td>{career.type}</td>
                  <td>{career.experience}</td>
                  <td>
                    <Badge tone={career.status === "closed" ? "slate" : "green"}>
                      {career.status === "closed" ? "Closed" : "Open"}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <Button variant="secondary" onClick={() => openEditModal(career)}>Edit</Button>
                      <Button variant="danger" onClick={() => handleDelete(career.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15, 23, 42, 0.48)" }}>
          <div style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: "12px", boxShadow: "0 20px 35px rgba(15, 23, 42, 0.22)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0 }}>{editingCareer ? "Edit Career" : "Add Career"}</h3>
              <button type="button" aria-label="Close career editor" onClick={() => setIsModalOpen(false)} style={{ border: 0, background: "transparent", fontSize: "24px", cursor: "pointer" }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px", padding: "20px" }}>
              <div className="form-grid">
                <Input label="Role title" name="title" value={formData.title} onChange={handleChange} required />
                <Input label="Department" name="department" value={formData.department} onChange={handleChange} required />
                <Input label="Location" name="location" value={formData.location} onChange={handleChange} required />
                <Input label="Employment type" name="type" value={formData.type} onChange={handleChange} required />
                <Input label="Experience" name="experience" value={formData.experience} onChange={handleChange} required />
                <label className="field">
                  <span>Status</span>
                  <select name="status" value={formData.status} onChange={handleChange} style={fieldStyle}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Description</span>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" style={fieldStyle} required />
              </label>
              <label className="field">
                <span>Responsibilities, one per line</span>
                <textarea name="responsibilities" value={formData.responsibilities} onChange={handleChange} rows="4" style={fieldStyle} />
              </label>
              <label className="field">
                <span>Requirements, one per line</span>
                <textarea name="requirements" value={formData.requirements} onChange={handleChange} rows="4" style={fieldStyle} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">{editingCareer ? "Save Changes" : "Add Career"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

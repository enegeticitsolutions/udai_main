import React, { useEffect, useState } from "react";

// Use proxy in dev; VITE_ADMIN_API can override for prod.
const API_BASE = import.meta.env.VITE_ADMIN_API || "";

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/donations`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load");
      setRows(json.data || []);
    } catch (err) {
      setError(err.message || "Unable to load donations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>Admin — Donations</h1>
        <button onClick={load}>Refresh</button>
      </header>

      <main>
        <section className="card">
          <div className="card-head">
            <h2>Latest Donations</h2>
            <span className="pill">{rows.length} records</span>
          </div>

          {error ? <div className="error">{error}</div> : null}
          {loading ? <div className="note">Loading...</div> : null}

          {!loading && !rows.length ? <div className="note">No donations found.</div> : null}

          {!loading && rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Purpose</th>
                    <th>Payment</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d._id || `${d.email}-${d.createdAt}`}>
                      <td>{d.name || "-"}</td>
                      <td>{d.email || "-"}</td>
                      <td>
                        <span className="pill">
                          {(d.currency || "INR") + " " + (d.amount ?? "-")}
                        </span>
                      </td>
                      <td>{d.purpose || "-"}</td>
                      <td>{d.paymentMethod || "-"}</td>
                      <td>{d.createdAt ? new Date(d.createdAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

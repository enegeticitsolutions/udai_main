import { useEffect, useState, useCallback } from "react";

const BACKEND_BASE = "http://localhost:4000";

function formatTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function extractField(raw, ...keys) {
  if (!raw) return "—";
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== "") return String(raw[key]);
  }
  return "—";
}

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  let bg = "#e0e0e0";
  let color = "#444";
  if (s.includes("deliver")) { bg = "#d4edda"; color = "#155724"; }
  else if (s.includes("receiv") || s.includes("inbound") || s.includes("read")) { bg = "#cce5ff"; color = "#004085"; }
  else if (s.includes("sent")) { bg = "#fff3cd"; color = "#856404"; }
  else if (s.includes("fail") || s.includes("reject")) { bg = "#f8d7da"; color = "#721c24"; }
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: bg,
      color,
      textTransform: "capitalize",
      letterSpacing: 0.3,
    }}>
      {status || "Unknown"}
    </span>
  );
}

export default function WhatsAppMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/webhook/messages`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMessages(json.data || []);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return (
    <div style={{ padding: 0 }}>
      {/* ── Header ───────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
            📩 WhatsApp Messages
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
            Live webhook data from MSG91 — auto-refreshes every 5 seconds
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: "#aaa" }}>
              Last update: {lastRefresh.toLocaleTimeString("en-IN")}
            </span>
          )}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            background: error ? "#f8d7da" : "#d4edda",
            color: error ? "#721c24" : "#155724",
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: error ? "#dc3545" : "#28a745",
              display: "inline-block",
            }} />
            {error ? "Disconnected" : "Live"}
          </span>
          <button
            onClick={fetchMessages}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "#344054",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f2f4f7")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          { label: "Total Messages", value: messages.length, icon: "📬", bg: "#eef2ff", accent: "#4f46e5" },
          {
            label: "Delivered",
            value: messages.filter((m) => (extractField(m.rawData, "eventName") || "").toLowerCase().includes("deliver")).length,
            icon: "✅",
            bg: "#ecfdf5",
            accent: "#059669",
          },
          {
            label: "Received / Inbound",
            value: messages.filter((m) => {
              const ev = (extractField(m.rawData, "eventName", "webhookType") || "").toLowerCase();
              return ev.includes("receiv") || ev.includes("inbound");
            }).length,
            icon: "📥",
            bg: "#eff6ff",
            accent: "#2563eb",
          },
          {
            label: "Failed",
            value: messages.filter((m) => (extractField(m.rawData, "eventName") || "").toLowerCase().includes("fail")).length,
            icon: "❌",
            bg: "#fef2f2",
            accent: "#dc2626",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.bg,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.accent }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#666", fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading messages...</div>
      ) : error ? (
        <div style={{
          textAlign: "center",
          padding: 30,
          color: "#721c24",
          background: "#f8d7da",
          borderRadius: 10,
          fontSize: 14,
        }}>
          ⚠️ Could not fetch messages: {error}
        </div>
      ) : messages.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: 40,
          color: "#888",
          background: "#f9fafb",
          borderRadius: 10,
          border: "1px dashed #d0d5dd",
        }}>
          No webhook messages received yet. Send a WhatsApp message to see data here.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Received At</th>
                <th style={thStyle}>Customer Number</th>
                <th style={thStyle}>Message / Content</th>
                <th style={thStyle}>Event Status</th>
                <th style={thStyle}>Direction</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, idx) => {
                const raw = msg.rawData || {};
                return (
                  <tr
                    key={msg._id}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc")}
                  >
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: 12, color: "#555" }}>
                      {formatTime(msg.receivedAt)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace", letterSpacing: 0.5 }}>
                      {extractField(raw, "customerNumber", "phone", "from", "sender")}
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {extractField(raw, "content", "text", "message", "body")}
                    </td>
                    <td style={tdStyle}>
                      {statusBadge(extractField(raw, "eventName", "status", "event"))}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#888" }}>
                      {raw.direction === "1" || raw.webhookType === "outbound"
                        ? "⬆️ Outbound"
                        : raw.direction === "0" || raw.webhookType === "inbound"
                        ? "⬇️ Inbound"
                        : extractField(raw, "webhookType", "direction")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "#667085",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "10px 14px",
  color: "#333",
};

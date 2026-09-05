import React, { useState, useEffect } from "react";
import Badge from "./Badge";
import Button from "./Button";
import { fetchSettings, updateSettings, testSmtpEmail } from "../services/adminApi";

export default function SettingsPage({ currentUser, onOpenResetCredentials }) {
  const [clinicData, setClinicData] = useState({
    clinicName: "UDAI Child Development & Therapy Centre",
    supportEmail: "support@udai.in",
    supportPhone: "+91 98765 43210",
    address: "New Delhi Clinic, India",
    workingHours: "Monday - Saturday: 9:00 AM - 6:00 PM",
    appointmentNotice: "Please arrive 10 minutes prior to your scheduled session.",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState(currentUser?.email || "");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const res = await fetchSettings();
      if (res && res.data) {
        setClinicData((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.warn("Using default clinic settings:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setIsSaving(true);
    setSaveFeedback("");
    try {
      await updateSettings(clinicData);
      setSaveFeedback("Clinic profile updated and saved to database successfully!");
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err) {
      alert("Failed to save settings: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestEmail(e) {
    e.preventDefault();
    if (!testEmailAddress.trim()) {
      alert("Please specify a recipient email address.");
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await testSmtpEmail(testEmailAddress.trim());
      setTestResult({ success: true, message: res.message || "Test email dispatched successfully!" });
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "SMTP test failed." });
    } finally {
      setIsSendingTest(false);
    }
  }

  return (
    <div className="settings-module">
      {saveFeedback && (
        <div style={{ padding: "14px 20px", background: "#f0fdf4", color: "#16a34a", borderRadius: "10px", marginBottom: "20px", fontSize: "14px", fontWeight: 600 }}>
          ✓ {saveFeedback}
        </div>
      )}

      <div className="split-grid" style={{ gap: "24px" }}>
        {/* Clinic Profile Editor */}
        <div className="content-card">
          <div className="section-head">
            <div>
              <h2 style={{ margin: 0 }}>Clinic Profile & Operations</h2>
              <p className="note" style={{ margin: "4px 0 0" }}>
                Official clinic details displayed across patient communications and receipts.
              </p>
            </div>
            <Badge tone="blue">Configuration</Badge>
          </div>

          <form onSubmit={handleSaveSettings} style={{ marginTop: "20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Centre Name
              </label>
              <input
                type="text"
                value={clinicData.clinicName}
                onChange={(e) => setClinicData({ ...clinicData, clinicName: e.target.value })}
                required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Official Email
                </label>
                <input
                  type="email"
                  value={clinicData.supportEmail}
                  onChange={(e) => setClinicData({ ...clinicData, supportEmail: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={clinicData.supportPhone}
                  onChange={(e) => setClinicData({ ...clinicData, supportPhone: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Clinic Location / Address
              </label>
              <input
                type="text"
                value={clinicData.address}
                onChange={(e) => setClinicData({ ...clinicData, address: e.target.value })}
                required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Operating Hours
              </label>
              <input
                type="text"
                value={clinicData.workingHours}
                onChange={(e) => setClinicData({ ...clinicData, workingHours: e.target.value })}
                required
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Appointment Notice for Parents
              </label>
              <textarea
                rows="3"
                value={clinicData.appointmentNotice}
                onChange={(e) => setClinicData({ ...clinicData, appointmentNotice: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", background: "var(--bg-input, #ffffff)", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "💾 Save Clinic Profile"}
            </Button>
          </form>
        </div>

        {/* Right Side Column: Active Admin & SMTP Diagnostics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Active Admin Profile */}
          <div className="content-card">
            <div className="section-head">
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>Current Administrator</h3>
                <p className="note" style={{ margin: "4px 0 0" }}>Logged in session details</p>
              </div>
              <Badge tone="green">{currentUser?.role === "super_admin" ? "Super Admin" : "Staff Admin"}</Badge>
            </div>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-input, #f8fafc)", borderRadius: "8px" }}>
                <span style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>Email (Login ID)</span>
                <strong style={{ fontSize: "13px" }}>{currentUser?.email}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-input, #f8fafc)", borderRadius: "8px" }}>
                <span style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>Access Level</span>
                <strong style={{ fontSize: "13px", textTransform: "capitalize" }}>
                  {currentUser?.role === "super_admin" ? "Full System Access (16/16 Pages)" : `${currentUser?.allowedPages?.length || 0} Pages Permitted`}
                </strong>
              </div>

              <div style={{ marginTop: "6px" }}>
                <Button variant="secondary" onClick={onOpenResetCredentials} style={{ width: "100%" }}>
                  🔑 Change ID / Password
                </Button>
              </div>
            </div>
          </div>

          {/* Email SMTP Diagnostic Card */}
          <div className="content-card">
            <div className="section-head">
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>Email SMTP Diagnostic Tool</h3>
                <p className="note" style={{ margin: "4px 0 0" }}>Verify email delivery connectivity</p>
              </div>
              <Badge tone="purple">SMTP Diagnostic</Badge>
            </div>

            <form onSubmit={handleTestEmail} style={{ marginTop: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Recipient Test Email
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter email to test..."
                  required
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color, #cbd5e1)", fontSize: "13px", background: "var(--bg-input, #ffffff)" }}
                />
                <Button type="submit" disabled={isSendingTest}>
                  {isSendingTest ? "Sending..." : "Send Test"}
                </Button>
              </div>

              {testResult && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    background: testResult.success ? "#f0fdf4" : "#fef2f2",
                    color: testResult.success ? "#16a34a" : "#dc2626",
                    border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {testResult.success ? "✓ " : "⚠️ "} {testResult.message}
                </div>
              )}
            </form>
          </div>

          {/* System Info */}
          <div className="content-card">
            <div className="section-head">
              <h3 style={{ margin: 0, fontSize: "16px" }}>System Information</h3>
              <Badge tone="slate">UDAI v2.1</Badge>
            </div>
            <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--muted, #64748b)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div>• Environment: <strong>Development / Local</strong></div>
              <div>• Admin Backend: <strong>http://localhost:5003</strong></div>
              <div>• Core Database: <strong>MongoDB Atlas + Local Storage Sync</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

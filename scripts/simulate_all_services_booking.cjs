const http = require("http");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./backend/.env" });

const scenarios = [
  {
    label: "a) Occupational Therapy (OT) - New Patient, Offline",
    expectedFee: 800,
    expectedSessions: 1,
    payload: {
      patientName: "Sim-OT-New",
      phoneNumber: "919811000001",
      department: "Occupational Therapy",
      appointmentType: "offline",
      appointmentDate: "2026-09-23",
      appointmentTime: "10:00",
      firstSession: "true",
      session_frequency: "Single Session"
    }
  },
  {
    label: "b) Speech Therapy - Returning Patient, Online",
    expectedFee: 600,
    expectedSessions: 1,
    payload: {
      patientName: "Sim-Speech-Returning",
      phoneNumber: "919811000002",
      department: "Speech Therapy",
      appointmentType: "online",
      appointmentDate: "2026-09-23",
      appointmentTime: "10:45",
      firstSession: "false",
      session_frequency: "Single Session"
    }
  },
  {
    label: "c) Special Education - Returning Patient, Offline",
    expectedFee: 800,
    expectedSessions: 1,
    payload: {
      patientName: "Sim-SpecialEd-Returning",
      phoneNumber: "919811000003",
      department: "Special Education",
      appointmentType: "offline",
      appointmentDate: "2026-09-23",
      appointmentTime: "11:00",
      firstSession: "false",
      session_frequency: "Single Session"
    }
  },
  {
    label: "d) Physiotherapy - Returning Patient, Online",
    expectedFee: 600,
    expectedSessions: 1,
    payload: {
      patientName: "Sim-Physio-Returning",
      phoneNumber: "919811000004",
      department: "Physiotherapy",
      appointmentType: "online",
      appointmentDate: "2026-09-23",
      appointmentTime: "11:30",
      firstSession: "false",
      session_frequency: "Single Session"
    }
  },
  {
    label: "e) Counselling - Returning Patient, 2 Days / Week",
    expectedFee: 1600,
    expectedSessions: 2,
    payload: {
      patientName: "Sim-Counsel-2Days",
      phoneNumber: "919811000005",
      department: "Counselling",
      appointmentType: "offline",
      appointmentDate: "2026-09-23",
      appointmentTime: "11:45",
      firstSession: "false",
      session_frequency: "2 Days / Week"
    }
  },
  {
    label: "f) Counselling - Returning Patient, 3 Days / Week",
    expectedFee: 2400,
    expectedSessions: 3,
    payload: {
      patientName: "Sim-Counsel-3Days",
      phoneNumber: "919811000006",
      department: "Counselling",
      appointmentType: "offline",
      appointmentDate: "2026-09-23",
      appointmentTime: "13:30",
      firstSession: "false",
      session_frequency: "3 Days / Week"
    }
  },
  {
    label: "g) Counselling - Returning Patient, Single Session",
    expectedFee: 800,
    expectedSessions: 1,
    payload: {
      patientName: "Sim-Counsel-Single",
      phoneNumber: "919811000007",
      department: "Counselling",
      appointmentType: "offline",
      appointmentDate: "2026-09-23",
      appointmentTime: "14:15",
      firstSession: "false",
      session_frequency: "Single Session"
    }
  }
];

function postBooking(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: "localhost",
      port: 4000,
      path: "/api/msg91-booking",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runSimulation() {
  console.log("===============================================================");
  console.log("🚀 Starting Dynamic Booking Simulation for All Therapy Services");
  console.log("===============================================================\n");

  const results = [];

  for (const s of scenarios) {
    console.log(`Running: ${s.label}...`);
    const res = await postBooking(s.payload);
    const apt = res.data;
    if (!apt) {
      console.error("  ❌ FAILED response:", res);
      results.push({ label: s.label, pass: false, error: res.message || "No data" });
      continue;
    }

    const feeMatches = apt.feeCharged === s.expectedFee;
    const sessionsMatch = apt.totalSessions === s.expectedSessions;

    console.log(`  -> Dept: ${apt.department}`);
    console.log(`  -> Assigned: ${apt.therapistName}`);
    console.log(`  -> Frequency: ${apt.session_frequency}`);
    console.log(`  -> Sessions: ${apt.totalSessions} (expected: ${s.expectedSessions})`);
    console.log(`  -> Fee Charged: ₹${apt.feeCharged} (expected: ₹${s.expectedFee})`);
    console.log(`  -> Result: ${feeMatches && sessionsMatch ? "✅ PASS" : "❌ FAIL"}\n`);

    results.push({
      label: s.label,
      pass: feeMatches && sessionsMatch,
      bookingId: apt.bookingId,
      department: apt.department,
      therapistName: apt.therapistName,
      session_frequency: apt.session_frequency,
      totalSessions: apt.totalSessions,
      feeCharged: apt.feeCharged
    });
  }

  console.log("===============================================================");
  console.log("📊 Direct Verification against MongoDB (appointments collection)");
  console.log("===============================================================\n");

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "udai";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    
    for (const r of results) {
      if (!r.bookingId) continue;
      const doc = await db.collection("appointments").findOne({ bookingId: r.bookingId });
      const webhookDoc = await db.collection("webhookmessages").findOne({ phone: doc?.phoneNumber });

      console.log(`[Verified Record]: ${r.label}`);
      console.log(`  • Booking ID:        ${doc?.bookingId}`);
      console.log(`  • Phone:             ${doc?.phoneNumber}`);
      console.log(`  • Department:        ${doc?.department}`);
      console.log(`  • Session Freq:      ${doc?.session_frequency}`);
      console.log(`  • Total Sessions:    ${doc?.totalSessions}`);
      console.log(`  • Fee Charged:       ₹${doc?.feeCharged}`);
      console.log(`  • Webhook Logged:    ${webhookDoc ? "YES ✅" : "NO ❌"} (Dept: ${webhookDoc?.department}, Fee: ₹${webhookDoc?.feeCharged})\n`);
    }

  } finally {
    await client.close();
  }

  const allPassed = results.every(r => r.pass);
  console.log(`All Scenarios Status: ${allPassed ? "✅ ALL 7 PASSED" : "❌ SOME FAILED"}`);
}

runSimulation().catch(console.error);

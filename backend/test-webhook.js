import axios from "axios";

const BACKEND_URL = (process.env.BASE_URL || process.env.BACKEND_URL || "https://udai-main.onrender.com").replace(/\/$/, "");
const PHONE = "919988776655";

async function run() {
  console.log("🚀 Starting mock WhatsApp chatbot webhook flow simulator...");
  
  try {
    // Helper to format MSG91 incoming message webhook structure
    const makeWebhookPayload = (phone, text) => ({
      data: {
        payload: {
          payload: {
            messages: [
              {
                id: `MSG-${Math.random().toString(36).substring(7)}`,
                from: phone,
                wa_id: phone,
                type: "text",
                text: {
                  body: text
                },
                timestamp: Math.floor(Date.now() / 1000)
              }
            ]
          }
        }
      }
    });

    // 1. Send greeting "Hi"
    console.log("\n💬 User sends: 'Hi'");
    let res = await axios.post(`${BACKEND_URL}/api/webhook`, makeWebhookPayload(PHONE, "Hi"));
    console.log("📥 Chatbot Response Status:", res.status, res.data);
    await new Promise((r) => setTimeout(r, 1000));

    // 2. Send Name "Kabir"
    console.log("\n💬 User sends: 'Kabir'");
    res = await axios.post(`${BACKEND_URL}/api/webhook`, makeWebhookPayload(PHONE, "Kabir"));
    console.log("📥 Chatbot Response Status:", res.status, res.data);
    await new Promise((r) => setTimeout(r, 1000));

    // 3. Send Age "8"
    console.log("\n💬 User sends: '8'");
    res = await axios.post(`${BACKEND_URL}/api/webhook`, makeWebhookPayload(PHONE, "8"));
    console.log("📥 Chatbot Response Status:", res.status, res.data);
    await new Promise((r) => setTimeout(r, 1000));

    // 4. Send Department "Speech Therapy"
    console.log("\n💬 User sends: 'Speech Therapy'");
    res = await axios.post(`${BACKEND_URL}/api/webhook`, makeWebhookPayload(PHONE, "Speech Therapy"));
    console.log("📥 Chatbot Response Status:", res.status, res.data);
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Also send raw message data directly to verify standard messaging log endpoint
    console.log("\n📬 Sending sample MSG91 appointment data directly to /webhook/receive-msg...");
    const sampleWebhookData = {
      customerNumber: PHONE,
      childName: "Aarav Kumar",
      parentName: "Amit Kumar",
      age: "6",
      firstSession: "yes",
      appointmentDate: "2026-07-20",
      appointmentTime: "11:30",
      department: "Occupational Therapy",
      concern: "Sensory regulation and articulation",
      direction: "0",
      eventName: "incoming"
    };

    res = await axios.post(`${BACKEND_URL}/webhook/receive-msg`, sampleWebhookData);
    console.log("📥 /webhook/receive-msg Response:", res.data);

    console.log("\n✅ Webhook simulation complete! Check your Admin page under 'WhatsApp Messages' and 'WhatsApp Appointments'.");
  } catch (err) {
    console.error("❌ Simulation failed:", err.message);
    if (err.response) {
      console.error("Response Details:", err.response.data);
    }
  }
}

run();

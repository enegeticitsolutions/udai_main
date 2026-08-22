import axios from "axios";
/**
 * Sends a free-form text message via MSG91 WhatsApp API.
 * MSG91 supports free-form messages only for replies within 24h window.
 * For outbound (first contact), templates are required.
 */
export async function sendWhatsAppText(to, message) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_NUMBER || "919911883075";
    if (!authKey) {
        console.error("[WhatsApp] MSG91_AUTH_KEY not set in environment.");
        return;
    }
    // Normalize phone to E.164 without '+'
    let phone = to.replace(/\D/g, "");
    if (phone.length === 10)
        phone = "91" + phone;
    const payload = {
        integrated_number: integratedNumber,
        content_type: "text",
        payload: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "text",
            text: { body: message },
        },
    };
    try {
        const response = await axios.post("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload, {
            headers: {
                "Content-Type": "application/json",
                authkey: authKey,
            },
        });
        console.log(`[WhatsApp] Message sent to ${phone}:`, response.data);
    }
    catch (error) {
        console.error(`[WhatsApp] Failed to send message to ${phone}:`, error.response?.data || error.message);
    }
}
/**
 * Sends a template message via MSG91 WhatsApp API.
 * Used for outbound (first contact) messages.
 */
export async function sendWhatsAppTemplate(to, templateName, languageCode = "en", components = {}) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_NUMBER || "919911883075";
    if (!authKey) {
        console.error("[WhatsApp] MSG91_AUTH_KEY not set in environment.");
        return { success: false, error: "Configuration error" };
    }
    let phone = to.replace(/\D/g, "");
    if (phone.length === 10)
        phone = "91" + phone;
    const payload = {
        integrated_number: integratedNumber,
        content_type: "template",
        payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode, policy: "deterministic" },
                namespace: null,
                to_and_components: [{ to: [phone], components }],
            },
        },
    };
    try {
        console.log(`[WhatsApp] Sending template "${templateName}" to ${phone}...`);
        const response = await axios.post("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", payload, {
            headers: { "Content-Type": "application/json", authkey: authKey },
        });
        console.log("[WhatsApp] MSG91 Response:", response.data);
        return { success: true, data: response.data };
    }
    catch (error) {
        console.error("[WhatsApp] API Error:", error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || "Failed to send" };
    }
}

import axios from "axios";

export interface WhatsAppPayload {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any;
}

export async function sendWhatsAppMessage({
  to,
  templateName,
  languageCode = "en",
  components = {}
}: WhatsAppPayload) {
  const url = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    console.error("MSG91_AUTH_KEY not found in environment variables.");
    return { success: false, error: "Configuration error" };
  }

  // Clean the phone number (remove +, spaces, etc.)
  let cleanTo = to.replace(/\D/g, "");

  // If it's a 10-digit number, prepend '91' (default for India)
  if (cleanTo.length === 10) {
    cleanTo = "91" + cleanTo;
  }

  const data = {
    integrated_number: "919911883075",
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
          policy: "deterministic"
        },
        namespace: null,
        to_and_components: [
          {
            to: [cleanTo],
            components: components
          }
        ]
      }
    }
  };

  try {
    console.log(`Sending WhatsApp message to ${cleanTo} using template ${templateName}...`);
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey
      }
    });

    console.log("MSG91 Response:", response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("MSG91 API Error:", error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || "Failed to send WhatsApp message" 
    };
  }
}

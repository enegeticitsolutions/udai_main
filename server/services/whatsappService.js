const axios = require("axios");

// Replace these with your actual values
const TOKEN = "YOUR_WHATSAPP_TOKEN";
const PHONE_ID = "YOUR_PHONE_NUMBER_ID";

async function sendMessage(to, message) {
    console.log("Mock WhatsApp Message to:", to);
    console.log("Message:", message);
}




module.exports = { sendMessage };

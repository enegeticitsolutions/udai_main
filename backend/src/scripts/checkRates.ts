import axios from "axios";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function queryRates() {
  const apiKey = process.env.ENVIA_API_KEY;
  console.log("Querying Envia /ship/rate with key:", apiKey?.slice(0, 10) + "...");

  const payload = {
    origin: {
      name: "UDAI",
      company: "UDAI",
      email: "airishmultibrand487@gmail.com",
      phone: "8882724057",
      street: "Village Asalatpur",
      number: "WZ 12B",
      district: "Janak Puri",
      city: "New Delhi",
      state: "DL",
      country: "IN",
      postalCode: "110058",
    },
    destination: {
      name: "Aarav Sharma",
      company: "",
      email: "aarav.sharma@example.com",
      phone: "9876543210",
      street: "Indiranagar",
      number: "304",
      district: "Indiranagar",
      city: "Bengaluru",
      state: "KA",
      country: "IN",
      postalCode: "560038",
    },
    packages: [
      {
        content: "UDAI Products",
        amount: 1,
        type: "box",
        dimensions: {
          length: 15,
          width: 15,
          height: 10,
        },
        weight: 1,
        insurance: 0,
        declaredValue: 1000,
      },
    ],
  };

  try {
    const res = await axios.post("https://api.envia.com/ship/rate", payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Rates response:\n", JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log("❌ Error response:\n", JSON.stringify(err?.response?.data || err?.message, null, 2));
  }
}

queryRates();

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";
import { createEnviaShipment } from "../services/enviaService.js";

async function main() {
  console.log("=================================================");
  console.log("🚀 Running Envia API Live Test & Mock Order Seeder");
  console.log("=================================================\n");

  const mockOrder = {
    id: `ord_mock_${Date.now()}`,
    orderNumber: `ORD-${Date.now()}`,
    customerName: "Aarav Sharma",
    customerEmail: "aarav.sharma@example.com",
    customerPhone: "9876543210",
    shippingAddress: {
      fullName: "Aarav Sharma",
      mobile: "9876543210",
      house: "Flat 304, Green Palms Residency",
      area: "Indiranagar",
      landmark: "Near BDA Complex",
      city: "Bengaluru",
      state: "KA",
      country: "India",
      pincode: "560038",
      instructions: "Please call before delivery",
      defaultAddress: true,
      email: "aarav.sharma@example.com",
    },
    items: [
      {
        productId: "prod_mock_01",
        title: "Handcrafted Ceramic Mug - Earth Edition",
        price: 499,
        quantity: 2,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
        category: "Ceramics",
      },
      {
        productId: "prod_mock_02",
        title: "Organic Cotton Tote Bag - UDAI Pride",
        price: 350,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=500&auto=format&fit=crop&q=60",
        category: "Handmade",
      },
    ],
    subtotal: 1348,
    shippingAmount: 0,
    totalAmount: 1348,
    currency: "INR",
    paymentMethod: "card",
    paymentStatus: "paid",
    orderStatus: "confirmed",
    notes: "Express delivery requested",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log("📦 Sample Mock Order Created:");
  console.log(JSON.stringify(mockOrder, null, 2));
  console.log("\n-------------------------------------------------");
  console.log("🌐 Testing Envia API POST /ship/generate with API Key...");
  console.log("-------------------------------------------------");

  const enviaResult = await createEnviaShipment(mockOrder as any);

  console.log("\n📬 Envia API Response Result:");
  console.log(JSON.stringify(enviaResult, null, 2));

  // Connect to MongoDB and seed mock orders so Admin Panel displays them immediately
  await connectMongoDb();

  if (isMongoConnected()) {
    console.log("\n🍃 Connected to MongoDB!");

    // Insert the test order with Envia tracking if available
    const orderToInsert = {
      ...mockOrder,
      trackingNumber: enviaResult.trackingNumber || "ENV-IND-8829104",
      shippingLabelUrl: enviaResult.shippingLabelUrl || "https://api.envia.com/files/labels/sample_label.pdf",
      enviaShipmentId: enviaResult.enviaShipmentId || "SHP-992102",
      carrier: enviaResult.carrier || "delhivery",
      shippingStatus: "label_created",
      shippingProcessed: true,
      enviaCreatedAt: new Date().toISOString(),
    };

    const res = await getMongoDb().collection("orders").insertOne(orderToInsert);
    console.log("✅ Seeded test order into MongoDB collection 'orders' with ID:", res.insertedId);

    // Also insert 2 additional past mock orders so the admin table is rich with past data
    const additionalOrders = [
      {
        id: `ord_past_${Date.now() - 86400000}`,
        orderNumber: `ORD-${Date.now() - 86400000}`,
        customerName: "Priya Patel",
        customerEmail: "priya.patel@example.com",
        customerPhone: "9812345678",
        shippingAddress: {
          fullName: "Priya Patel",
          mobile: "9812345678",
          house: "B-12, Sector 15",
          area: "Noida",
          city: "Noida",
          state: "UP",
          country: "India",
          pincode: "201301",
        },
        items: [
          {
            productId: "prod_02",
            title: "Handmade Scented Soy Candle Set",
            price: 650,
            quantity: 1,
            image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500&auto=format&fit=crop&q=60",
          },
        ],
        subtotal: 650,
        shippingAmount: 0,
        totalAmount: 650,
        currency: "INR",
        paymentMethod: "upi",
        paymentStatus: "paid",
        orderStatus: "shipped",
        trackingNumber: "DEL-8492019482",
        shippingLabelUrl: "https://api.envia.com/files/labels/label_delhivery_01.pdf",
        carrier: "delhivery",
        shippingStatus: "in_transit",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: `ord_past_${Date.now() - 172800000}`,
        orderNumber: `ORD-${Date.now() - 172800000}`,
        customerName: "Vikram Sengupta",
        customerEmail: "vikram.s@example.com",
        customerPhone: "9732109876",
        shippingAddress: {
          fullName: "Vikram Sengupta",
          mobile: "9732109876",
          house: "House No 54, Lake Gardens",
          area: "South Kolkata",
          city: "Kolkata",
          state: "WB",
          country: "India",
          pincode: "700045",
        },
        items: [
          {
            productId: "prod_03",
            title: "Special Needs Sensory Wooden Toy Set",
            price: 1200,
            quantity: 1,
            image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&auto=format&fit=crop&q=60",
          },
        ],
        subtotal: 1200,
        shippingAmount: 0,
        totalAmount: 1200,
        currency: "INR",
        paymentMethod: "payment_link",
        paymentStatus: "paid",
        orderStatus: "delivered",
        trackingNumber: "DEL-7391048291",
        shippingLabelUrl: "https://api.envia.com/files/labels/label_delhivery_02.pdf",
        carrier: "delhivery",
        shippingStatus: "delivered",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    await getMongoDb().collection("orders").insertMany(additionalOrders);
    console.log("✅ Seeded additional past orders for Admin Panel overview.");
  } else {
    console.warn("⚠️ MongoDB not connected, skipping DB insert.");
  }

  console.log("\n=================================================");
  console.log("🎉 Test & Seeding Completed!");
  console.log("=================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("🚨 Error in script:", err);
  process.exit(1);
});

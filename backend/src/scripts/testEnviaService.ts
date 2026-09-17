import { buildEnviaShipmentPayload, isShopPhysicalOrder, ENVIA_ORIGIN_ADDRESS } from "../services/enviaService.js";

function runTests() {
  console.log("🧪 [TEST] Running Envia Service Verification Tests...\n");

  // 1. Verify Origin Address
  console.log("Test 1: Verify Origin Address Configuration");
  if (ENVIA_ORIGIN_ADDRESS.postalCode === "110058" && ENVIA_ORIGIN_ADDRESS.city === "New Delhi") {
    console.log("✅ Origin address matches required specification.\n");
  } else {
    throw new Error("❌ Origin address mismatch");
  }

  // 2. Test Order Payload Generation
  console.log("Test 2: Build Shipment Payload for Sample Order");
  const sampleOrder = {
    id: "ord_test_123",
    orderNumber: "ORD-1726512345",
    customerName: "Rahul Sharma",
    customerEmail: "rahul.sharma@example.com",
    customerPhone: "+91 98765 43210",
    shippingAddress: {
      fullName: "Rahul Sharma",
      mobile: "+91 98765 43210",
      house: "Flat 402, Sunshine Heights",
      landmark: "Near City Mall",
      area: "Indiranagar",
      city: "Bengaluru",
      state: "KA",
      country: "India",
      pincode: "560038",
      instructions: "Leave at door",
      defaultAddress: false,
    },
    items: [
      {
        productId: "prod_1",
        title: "Handmade Ceramic Mug",
        price: 499,
        quantity: 2,
        image: "https://example.com/mug.jpg",
      },
    ],
    subtotal: 998,
    shippingAmount: 0,
    totalAmount: 998,
    currency: "INR",
    paymentMethod: "card" as const,
    paymentStatus: "paid" as const,
    orderStatus: "confirmed" as const,
    notes: "",
    createdAt: new Date().toISOString(),
  };

  const payload = buildEnviaShipmentPayload(sampleOrder);
  console.log("Generated Payload:\n", JSON.stringify(payload, null, 2));

  if (payload.destination.name !== "Rahul Sharma") {
    throw new Error("❌ Destination name mismatch");
  }
  if (payload.destination.postalCode !== "560038") {
    throw new Error("❌ Postal code mismatch");
  }
  if (payload.destination.country !== "IN") {
    throw new Error("❌ Country code normalization failed");
  }
  if (payload.origin.postalCode !== "110058") {
    throw new Error("❌ Origin postal code mismatch");
  }
  console.log("✅ Payload formulation verified successfully.\n");

  // 3. Test Shop Physical Order Detection
  console.log("Test 3: Shop vs Donation Order Filter");
  const isShop = isShopPhysicalOrder(sampleOrder);
  const isDonation = isShopPhysicalOrder({
    customerName: "Donor",
    category: "meal",
    amount: 500,
  });

  if (isShop === true && isDonation === false) {
    console.log("✅ Shop orders correctly routed, donations excluded from shipping.\n");
  } else {
    throw new Error("❌ Order filter check failed");
  }

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests();

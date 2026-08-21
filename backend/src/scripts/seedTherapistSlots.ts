import { seedTherapistSlots } from "../services/slotService.js";

async function main() {
  console.log("=== Starting Therapist Slots Seeding (Next 5 Days) ===");
  const result = await seedTherapistSlots();
  console.log(`✅ Seeding Complete! ${result.seededCount} slots seeded for dates:`, result.dates);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI || "";
if (!uri) {
  console.error("MONGODB_URI environment variable is required.");
  process.exit(1);
}
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("udai");
    const result = await db.collection("products").updateMany(
      { image: { $regex: "pms.datamoshtechnologies.com" } },
      { $set: { image: "/images/logo_udai.png" } }
    );
    console.log(result);
  } finally {
    await client.close();
  }
}
run();

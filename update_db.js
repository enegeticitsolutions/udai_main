import { MongoClient } from "mongodb";
const uri = "mongodb+srv://tripathishubh0099_db_user:32MjeqtkKKImOTC9@cluster0.uvehy1j.mongodb.net/?appName=Cluster0";
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

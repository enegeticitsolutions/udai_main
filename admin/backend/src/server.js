import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";

const app = express();
app.use(cors());

app.get("/donations", async (_req, res) => {
  try {
    const db = await connectDb();
    const donations = await db
      .collection("donations")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const port = Number(process.env.PORT || 5001);
app.listen(port, () => {
  console.log(`Admin backend running on http://localhost:${port}`);
});

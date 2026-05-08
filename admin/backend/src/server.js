import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/forms/contact", async (req, res) => {
  try {
    const db = await connectDb();
    const payload = {
      name: String(req.body?.name ?? "").trim(),
      email: String(req.body?.email ?? "").trim(),
      subject: String(req.body?.subject ?? "Website Inquiry").trim(),
      website: String(req.body?.website ?? "").trim(),
      message: String(req.body?.message ?? "").trim(),
      createdAt: new Date().toISOString(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      res.status(400).json({ success: false, message: "Name, email, and message are required" });
      return;
    }

    const result = await db.collection("contacts").insertOne(payload);
    res.status(201).json({
      success: true,
      data: { id: result.insertedId.toString(), ...payload },
      message: "Contact saved successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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

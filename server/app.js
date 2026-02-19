// ============================
// STEP 1: Load env variables
// ============================
require("dotenv").config();

// ============================
// STEP 2: Import packages
// ============================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ============================
// STEP 3: Middleware
// ============================
app.use(cors());
app.use(express.json()); // IMPORTANT for req.body

// ============================
// STEP 4: Test Route (DEBUG)
// ============================
app.post("/test", (req, res) => {
    console.log("TEST BODY:", req.body);
    res.json(req.body);
});

// ============================
// STEP 5: Health Check
// ============================
app.get("/", (req, res) => {
    res.send("Server is running...");
});

// ============================
// STEP 6: Routes
// ============================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/therapists", require("./routes/therapistRoutes"));
app.use("/api/whatsapp", require("./routes/whatsappRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// ============================
// STEP 7: Connect MongoDB
// ============================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("Mongo Error:", err));

// ============================
// STEP 8: Start Server
// ============================
const PORT = process.env.PORT || 5000;

console.log("PORT from ENV:", PORT);

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

import { Router } from "express";
import { authenticateAdmin } from "../services/adminAuthService.js";
import { appendNotification, createTherapistRecord, deleteTherapistRecord, getAdminBootstrap, toggleDeactivatedDate, updateAdminRecord, } from "../services/adminService.js";
import { addCareer, addProduct, deleteCareer, updateCareer, updateProduct, deleteProduct } from "../services/contentService.js";
import { careerSchema, productSchema } from "../schemas.js";
import { upload } from "../middleware/upload.js";
import { uploadToSupabase } from "../lib/supabase.js";
export const adminRouter = Router();
adminRouter.post("/login", async (req, res, next) => {
    try {
        const { email = "", password = "" } = req.body ?? {};
        const user = await authenticateAdmin(String(email).trim(), String(password));
        if (!user) {
            res.status(401).json({ success: false, message: "Invalid admin credentials" });
            return;
        }
        const { password: _password, ...safeUser } = user;
        res.json({ success: true, data: safeUser, message: "Login successful" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.get("/bootstrap", async (_req, res, next) => {
    try {
        const data = await getAdminBootstrap();
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/inquiries/:id", async (req, res, next) => {
    try {
        const updated = await updateAdminRecord("inquiries", req.params.id, req.body ?? {});
        if (!updated) {
            res.status(404).json({ success: false, message: "Inquiry not found" });
            return;
        }
        res.json({ success: true, data: updated, message: "Inquiry updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/volunteers/:id", async (req, res, next) => {
    try {
        const updated = await updateAdminRecord("volunteers", req.params.id, req.body ?? {});
        if (!updated) {
            res.status(404).json({ success: false, message: "Volunteer request not found" });
            return;
        }
        res.json({ success: true, data: updated, message: "Volunteer request updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/orders/:id", async (req, res, next) => {
    try {
        const updated = await updateAdminRecord("orders", req.params.id, req.body ?? {});
        if (!updated) {
            res.status(404).json({ success: false, message: "Order not found" });
            return;
        }
        res.json({ success: true, data: updated, message: "Order updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/therapists", async (req, res, next) => {
    try {
        const payload = {
            name: String(req.body?.name ?? "").trim(),
            department: String(req.body?.department ?? "").trim(),
            role: String(req.body?.role ?? "").trim(),
            experience: String(req.body?.experience ?? "").trim(),
            image: String(req.body?.image ?? "").trim(),
            active: req.body?.active !== false,
        };
        if (!payload.name || !payload.department || !payload.role || !payload.experience) {
            res.status(400).json({ success: false, message: "Name, department, role, and experience are required" });
            return;
        }
        const record = await createTherapistRecord(payload);
        res.status(201).json({ success: true, data: record, message: "Therapist added successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/therapists/:id", async (req, res, next) => {
    try {
        const updated = await updateAdminRecord("therapists", req.params.id, req.body ?? {});
        if (!updated) {
            res.status(404).json({ success: false, message: "Therapist not found" });
            return;
        }
        res.json({ success: true, data: updated, message: "Therapist updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.delete("/therapists/:id", async (req, res, next) => {
    try {
        const deleted = await deleteTherapistRecord(req.params.id);
        if (!deleted) {
            res.status(404).json({ success: false, message: "Therapist not found" });
            return;
        }
        res.json({ success: true, data: deleted, message: "Therapist removed successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/therapists/deactivate-date", async (req, res, next) => {
    try {
        const { therapistId, date } = req.body;
        if (!therapistId || !date) {
            res.status(400).json({ success: false, message: "therapistId and date are required" });
            return;
        }
        const result = await toggleDeactivatedDate(String(therapistId), String(date));
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/notifications/send", async (req, res, next) => {
    try {
        const { inquiryId, type, phone, childName, message } = req.body;
        if (!phone || !type) {
            res.status(400).json({ success: false, message: "phone and type are required" });
            return;
        }
        // Attempt to send WhatsApp message
        // We will just log it for now and simulate sending unless a template is matched.
        // In production, you would call `sendWhatsAppMessage` here if you had actual MSG91 templates.
        // Simulating WhatsApp send by just appending it to notifications DB
        const record = await appendNotification({
            inquiryId,
            type,
            phone,
            childName,
            message: message || `Sent ${type} to ${childName} (${phone})`,
            status: "sent"
        });
        res.json({ success: true, data: record, message: "Notification sent successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.get("/products", async (req, res, next) => {
    try {
        const { getProducts } = await import("../services/contentService.js");
        const all = await getProducts();
        const typeFilter = req.query.type;
        const data = typeFilter === "gift"
            ? all.filter((p) => p.isCorporateGift === true)
            : typeFilter === "product"
                ? all.filter((p) => !p.isCorporateGift)
                : all;
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/products", async (req, res, next) => {
    try {
        const payload = productSchema.parse(req.body);
        const product = await addProduct(payload);
        res.status(201).json({ success: true, data: product, message: "Product added successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/products/:id", async (req, res, next) => {
    try {
        const payload = productSchema.partial().parse(req.body);
        const updated = await updateProduct(req.params.id, payload);
        if (!updated) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        res.json({ success: true, data: updated, message: "Product updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.delete("/products/:id", async (req, res, next) => {
    try {
        const success = await deleteProduct(req.params.id);
        if (!success) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }
        res.json({ success: true, message: "Product deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/careers", async (req, res, next) => {
    try {
        const payload = careerSchema.parse(req.body);
        const career = await addCareer(payload);
        res.status(201).json({ success: true, data: career, message: "Career added successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.patch("/careers/:id", async (req, res, next) => {
    try {
        const payload = careerSchema.partial().parse(req.body);
        const career = await updateCareer(req.params.id, payload);
        if (!career) {
            res.status(404).json({ success: false, message: "Career not found" });
            return;
        }
        res.json({ success: true, data: career, message: "Career updated successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.delete("/careers/:id", async (req, res, next) => {
    try {
        if (!(await deleteCareer(req.params.id))) {
            res.status(404).json({ success: false, message: "Career not found" });
            return;
        }
        res.json({ success: true, message: "Career deleted successfully" });
    }
    catch (error) {
        next(error);
    }
});
adminRouter.post("/upload", upload.single("image"), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: "No file uploaded" });
            return;
        }
        const fileUrl = process.env.SUPABASE_URL
            ? await uploadToSupabase(req.file.path, req.file.originalname, req.file.mimetype)
            : `/uploads/${req.file.filename}`;
        res.json({ success: true, url: fileUrl, message: "File uploaded successfully" });
    }
    catch (error) {
        next(error);
    }
});

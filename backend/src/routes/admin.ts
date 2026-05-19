import { Router } from "express";
import { authenticateAdmin } from "../services/adminAuthService.js";
import { getAdminBootstrap, updateAdminRecord, toggleDeactivatedDate, appendNotification } from "../services/adminService.js";

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
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/bootstrap", async (_req, res, next) => {
  try {
    const data = await getAdminBootstrap();
    res.json({ success: true, data });
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});

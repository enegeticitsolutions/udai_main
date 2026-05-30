import { Router } from "express";
import { authenticateAdmin } from "../services/adminAuthService.js";
import { createAdminRecord, deleteAdminRecord, getAdminBootstrap, updateAdminRecord } from "../services/adminService.js";
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

adminRouter.post("/subscribers", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const record = await createAdminRecord("subscribers", { email });
    res.status(201).json({ success: true, data: record, message: "Subscriber saved successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/contacts", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body?.name ?? "").trim(),
      email: String(req.body?.email ?? "").trim(),
      subject: String(req.body?.subject ?? "").trim(),
      website: String(req.body?.website ?? "").trim(),
      message: String(req.body?.message ?? "").trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      res.status(400).json({ success: false, message: "Name, email, subject, and message are required" });
      return;
    }

    const record = await createAdminRecord("contacts", payload);
    res.status(201).json({ success: true, data: record, message: "Contact message saved successfully" });
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

adminRouter.post("/therapists", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body?.name ?? "").trim(),
      department: String(req.body?.department ?? "").trim(),
      role: String(req.body?.role ?? "").trim(),
      experience: String(req.body?.experience ?? "").trim(),
      active: req.body?.active !== false,
    };

    if (!payload.name || !payload.department || !payload.role || !payload.experience) {
      res.status(400).json({ success: false, message: "Name, department, role, and experience are required" });
      return;
    }

    const record = await createAdminRecord("therapists", payload);
    res.status(201).json({ success: true, data: record, message: "Therapist added successfully" });
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

adminRouter.delete("/therapists/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("therapists", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Therapist not found" });
      return;
    }

    res.json({ success: true, data: deleted, message: "Therapist removed successfully" });
  } catch (error) {
    next(error);
  }
});

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

adminRouter.post("/upload", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }
    const fileUrl = await uploadToSupabase(req.file.path, req.file.originalname, req.file.mimetype);
    res.json({ success: true, url: fileUrl, message: "File uploaded successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/products", async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    if (!payload.title || !payload.price || !payload.image) {
      res.status(400).json({ success: false, message: "Title, price, and image are required" });
      return;
    }
    
    if (!payload.slug) {
      payload.slug = slugify(payload.title);
    }
    
    const record = await createAdminRecord("products", payload);
    res.status(201).json({ success: true, data: record, message: "Product added successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const updates = req.body ?? {};
    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title);
    }
    const updated = await updateAdminRecord("products", req.params.id, updates);
    if (!updated) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.json({ success: true, data: updated, message: "Product updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/products/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("products", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Product removed successfully" });
  } catch (error) {
    next(error);
  }
});

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCareerPayload(body) {
  return {
    title: String(body?.title ?? "").trim(),
    department: String(body?.department ?? "").trim(),
    location: String(body?.location ?? "").trim(),
    type: String(body?.type ?? "").trim(),
    experience: String(body?.experience ?? "").trim(),
    description: String(body?.description ?? "").trim(),
    responsibilities: normalizeList(body?.responsibilities),
    requirements: normalizeList(body?.requirements),
    applyLink: String(body?.applyLink ?? "").trim(),
    status: body?.status === "closed" ? "closed" : "open",
  };
}

adminRouter.post("/careers", async (req, res, next) => {
  try {
    const payload = normalizeCareerPayload(req.body);
    if (!payload.title || !payload.department || !payload.location || !payload.type || !payload.experience || !payload.description || !payload.applyLink) {
      res.status(400).json({ success: false, message: "Complete all required career fields" });
      return;
    }

    const record = await createAdminRecord("careers", payload);
    res.status(201).json({ success: true, data: record, message: "Career added successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/careers/:id", async (req, res, next) => {
  try {
    const updated = await updateAdminRecord("careers", req.params.id, normalizeCareerPayload(req.body));
    if (!updated) {
      res.status(404).json({ success: false, message: "Career not found" });
      return;
    }
    res.json({ success: true, data: updated, message: "Career updated successfully" });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/careers/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAdminRecord("careers", req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Career not found" });
      return;
    }
    res.json({ success: true, data: deleted, message: "Career removed successfully" });
  } catch (error) {
    next(error);
  }
});

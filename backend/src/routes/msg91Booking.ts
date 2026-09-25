import { Router } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { config } from "../config.js";
import { calculateAppointmentFee, normalizeAppointmentDate, saveMsg91Appointment } from "../services/msg91AppointmentService.js";
import { getAvailableDates, getAvailableSlots, getDepartments, normalizeDepartment } from "../services/bookingService.js";
import { WebhookMessage } from "../models/WebhookMessage.js";
import { connectMongoDb, getMongoDb, isMongoConnected } from "../lib/mongodb.js";

const msg91BookingRouter = Router();

/**
 * Expose available departments for MSG91 flow (GET or POST)
 */
const handleDepartments = async (_req: any, res: any, next: any) => {
  try {
    const departments = await getDepartments();
    res.status(200).json({ success: true, status: "success", data: departments });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/departments", handleDepartments);
msg91BookingRouter.post("/departments", handleDepartments);

// In-memory intent map for recent service selections (keyed by clean 10-digit phone, expires in 20 mins)
const recentServiceSelectionMap = new Map<string, { department: string; timestamp: number }>();

export function recordRecentDepartmentSelection(phone: string, department: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const clean = digits.length >= 10 ? digits.slice(-10) : "";
  if (!clean || !department) return;
  recentServiceSelectionMap.set(clean, {
    department,
    timestamp: Date.now(),
  });
}

export function clearRecentDepartmentSelection(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const clean = digits.length >= 10 ? digits.slice(-10) : "";
  if (clean) {
    recentServiceSelectionMap.delete(clean);
  }
}

export function getRecentDepartmentSelection(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  const clean = digits.length >= 10 ? digits.slice(-10) : "";
  if (!clean) return null;
  const entry = recentServiceSelectionMap.get(clean);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 20 * 60 * 1000) {
    recentServiceSelectionMap.delete(clean);
    return null;
  }
  return entry.department;
}

/**
 * Match WhatsApp interactive clicked title (list_reply.title or button_reply.title)
 */
export function matchDepartmentFromTitle(title: unknown): string | null {
  if (!title || typeof title !== "string") return null;
  const str = title.trim();
  if (!str || str.startsWith("@") || str.startsWith("{{") || str.includes("@") || str.includes("{{")) return null;

  if (/Physical\s*Therapy/i.test(str)) return "Physical Therapy";
  if (/Physiotherapy|Physio/i.test(str)) return "Physiotherapy";
  if (/Occupational\s*Therapy|\bOT\b/i.test(str)) return "Occupational Therapy";
  if (/Speech\s*Therapy|\bSpeech\b/i.test(str)) return "Speech Therapy";
  if (/Special\s*Educat/i.test(str)) return "Special Education";
  if (/Academic\s*Support|Remedial/i.test(str)) return "Academic Support";
  if (/Counsell/i.test(str)) return "Child and Parental Counselling";

  return null;
}

/**
 * Auto-detect chosen department from recent WhatsApp messages in db.collection("webhookmessages")
 * Always queries the absolute latest interactive webhook first to prevent stale cache leakage.
 */
export async function detectDepartmentFromRecentMessages(
  cleanPhone: string,
  incomingDept?: string
): Promise<string | null> {
  const dept = String(incomingDept || "").trim();
  const isInvalid = !dept || dept.startsWith("@") || dept.startsWith("{{") || dept.includes("@") || dept.includes("{{");

  if (!isInvalid) {
    const directMatch = matchDepartmentFromTitle(dept);
    if (directMatch) {
      recordRecentDepartmentSelection(cleanPhone, directMatch);
      return directMatch;
    }
  }

  try {
    await connectMongoDb().catch(() => {});
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    if (db && cleanPhone) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Query the absolute latest interactive webhook in db.collection("webhookmessages") for this user's phone
      const recentMsgs = await db
        .collection("webhookmessages")
        .find({
          $or: [
            { phone: { $regex: cleanPhone + "$" } },
            { phoneNumber: { $regex: cleanPhone + "$" } },
            { "rawData.customerNumber": { $regex: cleanPhone + "$" } },
            { "rawData.phoneNumber": { $regex: cleanPhone + "$" } },
            { "rawData.phone": { $regex: cleanPhone + "$" } },
            { "rawData.from": { $regex: cleanPhone + "$" } },
            { "rawData.sender": { $regex: cleanPhone + "$" } },
          ],
        })
        .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
        .limit(15)
        .toArray();

      for (const msg of recentMsgs) {
        const ts = msg.receivedAt || msg.createdAt;
        if (ts) {
          const d = new Date(ts);
          if (!isNaN(d.getTime()) && d < fifteenMinutesAgo) continue;
        }

        const interactiveCandidates = [
          msg.rawData?.interactive?.list_reply?.title,
          msg.rawData?.interactive?.button_reply?.title,
          msg.rawData?.text?.body,
          msg.message,
          msg.rawData?.list_reply?.title,
          msg.rawData?.button_reply?.title,
          msg.rawData?.message,
        ];

        for (const candidate of interactiveCandidates) {
          const match = matchDepartmentFromTitle(candidate);
          if (match) {
            console.log(
              `[Real-Time WhatsApp Extraction] Matched department "${match}" from "${candidate}" for phone ${cleanPhone}`
            );
            // Overwrite any stale cached department with real-time selection
            recordRecentDepartmentSelection(cleanPhone, match);
            return match;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[detectDepartmentFromRecentMessages] Error:", err.message || err);
  }

  // Fallback to recent in-memory selection
  const cachedDept = getRecentDepartmentSelection(cleanPhone);
  if (cachedDept) {
    const matchedCached = matchDepartmentFromTitle(cachedDept) || cachedDept.trim();
    return matchedCached;
  }

  return dept && !dept.startsWith("@") && !dept.startsWith("{{") && !dept.includes("@") && !dept.includes("{{") ? dept.trim() : null;
}

/**
 * Expose available dates for a department (GET or POST)
 */
const handleDates = async (req: any, res: any, next: any) => {
  try {
    const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {}) as Record<string, unknown>;
    const rawCandidatePhone =
      req.query?.phone ?? req.query?.phoneNumber ?? req.query?.customerNumber ??
      data.phone ?? data.phoneNumber ?? data.customerNumber ?? data.mobile ?? "";
    const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    let rawDept = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();

    const matched = matchDepartmentFromTitle(rawDept);
    if (cleanPhone && matched) {
      recordRecentDepartmentSelection(cleanPhone, matched);
      rawDept = matched;
    } else if (cleanPhone && (!rawDept || rawDept.includes("@") || rawDept.includes("{{") || rawDept.toLowerCase() === "child and parental counselling")) {
      const detected = await detectDepartmentFromRecentMessages(cleanPhone, rawDept);
      if (detected) rawDept = detected;
    }

    const department = normalizeDepartment(rawDept);
    const dates = await getAvailableDates(department || "Child and Parental Counselling");
    res.status(200).json({ success: true, status: "success", data: dates });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/dates", handleDates);
msg91BookingRouter.post("/dates", handleDates);

/**
 * Expose available slots for a department on a date (GET or POST)
 */
const handleSlots = async (req: any, res: any, next: any) => {
  try {
    const data = (req.body?.data ?? req.body?.payload ?? req.body?.variables ?? req.body ?? {}) as Record<string, unknown>;
    const rawCandidatePhone =
      req.query?.phone ?? req.query?.phoneNumber ?? req.query?.customerNumber ??
      data.phone ?? data.phoneNumber ?? data.customerNumber ?? data.mobile ?? "";
    const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    let rawDept = String(
      req.query.department ?? req.query.service ?? req.query.selected_service ??
      data.department ?? data.service ?? data.selected_service ?? data.service_name ?? ""
    ).trim();

    const matched = matchDepartmentFromTitle(rawDept);
    if (cleanPhone && matched) {
      recordRecentDepartmentSelection(cleanPhone, matched);
      rawDept = matched;
    } else if (cleanPhone && (!rawDept || rawDept.includes("@") || rawDept.includes("{{") || rawDept.toLowerCase() === "child and parental counselling")) {
      const detected = await detectDepartmentFromRecentMessages(cleanPhone, rawDept);
      if (detected) rawDept = detected;
    }

    const department = normalizeDepartment(rawDept);
    const rawDate = String(
      req.query.date ?? req.query.appointment_date ?? req.query.selected_date ??
      data.date ?? data.appointment_date ?? data.selected_date ?? data.date_of_appointment ?? ""
    ).trim();
    const date = normalizeAppointmentDate(rawDate);

    const slots = await getAvailableSlots(department || "Child and Parental Counselling", date);
    const formattedSlots = slots
      .filter((s: any) => s.isAvailable !== false)
      .slice(0, 10)
      .map((slot: any) => ({
        title: slot.label || slot.time,
        value: slot.time,
        id: slot.time,
        label: slot.label || slot.time,
        time: slot.time,
        isAvailable: slot.isAvailable,
        availableCount: slot.availableCount,
        bookedCount: slot.bookedCount,
        totalTherapists: slot.totalTherapists,
      }));

    res.status(200).json({ success: true, status: "success", data: formattedSlots });
  } catch (error) {
    next(error);
  }
};
msg91BookingRouter.get("/slots", handleSlots);
msg91BookingRouter.post("/slots", handleSlots);

/**
 * POST /api/msg91-booking and /msg91/booking
 * Receives incoming appointment booking requests from MSG91 bot flows.
 */
msg91BookingRouter.post(["/", "/booking"], async (req, res) => {
  console.log("==> Incoming MSG91 Booking Payload:", req.body);
  try {
    const rawBody = (req.body ?? {}) as Record<string, any>;
    const nestedData = (rawBody.data ?? rawBody.payload ?? rawBody.variables ?? {}) as Record<string, any>;

    // Extract phone to clean last 10 digits
    const rawCandidatePhone =
      rawBody.phoneNumber ||
      rawBody.customerNumber ||
      rawBody.phone ||
      rawBody.mobile ||
      rawBody.contact ||
      rawBody.sender ||
      nestedData.phoneNumber ||
      nestedData.customerNumber ||
      nestedData.phone ||
      nestedData.mobile ||
      nestedData.contact ||
      nestedData.sender ||
      nestedData.customer_number ||
      nestedData.from ||
      rawBody.customer_number ||
      rawBody.from ||
      req.query?.phone ||
      req.query?.phoneNumber ||
      req.query?.customerNumber ||
      "";
    const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
    let cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";
    if (!cleanPhone && typeof req.body === "string") {
      const match = (req.body as string).match(/\d{10,12}/);
      if (match) cleanPhone = match[0].slice(-10);
    }

    // 1. Extract chosen service title / department from interactive list replies and standard keys
    let chosenService = String(
      rawBody.service ||
      rawBody.department ||
      rawBody.selectedService ||
      rawBody.service_name ||
      rawBody.selected_service ||
      rawBody.selected_department ||
      rawBody.interactive?.list_reply?.title ||
      rawBody.list_reply?.title ||
      nestedData.service ||
      nestedData.department ||
      nestedData.selectedService ||
      nestedData.service_name ||
      nestedData.selected_service ||
      nestedData.selected_department ||
      nestedData.interactive?.list_reply?.title ||
      nestedData.list_reply?.title ||
      ""
    ).trim();

    // 1 & 2. Identify the user's clicked service and target incoming webhook for THIS specific flow run
    let targetWebhookId: any = null;
    let detectedDept: string | null = null;
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;

    if (db && cleanPhone) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      const recentMsgs = await db
        .collection("webhookmessages")
        .find({
          $or: [
            { phone: { $regex: cleanPhone + "$" } },
            { phoneNumber: { $regex: cleanPhone + "$" } },
            { "rawData.customerNumber": { $regex: cleanPhone + "$" } },
            { "rawData.phoneNumber": { $regex: cleanPhone + "$" } },
            { "rawData.phone": { $regex: cleanPhone + "$" } },
            { "rawData.from": { $regex: cleanPhone + "$" } },
            { "rawData.sender": { $regex: cleanPhone + "$" } },
          ],
        })
        .sort({ receivedAt: -1, createdAt: -1, _id: -1 })
        .limit(10)
        .toArray();

      // Priority 1: inspect interactive list_reply / button_reply within the last 2 minutes
      for (const msg of recentMsgs) {
        const ts = msg.receivedAt || msg.createdAt;
        const msgDate = ts ? new Date(ts) : null;
        if (msgDate && !isNaN(msgDate.getTime()) && msgDate < twoMinutesAgo) continue;

        const interactiveCandidates = [
          msg.rawData?.interactive?.list_reply?.title,
          msg.rawData?.interactive?.button_reply?.title,
          msg.rawData?.text?.body,
          msg.message,
          msg.rawData?.list_reply?.title,
          msg.rawData?.button_reply?.title,
        ];

        for (const candidate of interactiveCandidates) {
          const match = matchDepartmentFromTitle(candidate);
          if (match) {
            detectedDept = match;
            targetWebhookId = msg._id;
            console.log(`[MSG91 Booking] Matched department "${match}" from session webhook _id=${msg._id} within last 2 minutes`);
            break;
          }
        }
        if (detectedDept) break;
      }

      // Priority 2: fallback up to 15 minutes if not detected in last 2 minutes
      if (!detectedDept) {
        for (const msg of recentMsgs) {
          const ts = msg.receivedAt || msg.createdAt;
          const msgDate = ts ? new Date(ts) : null;
          if (msgDate && !isNaN(msgDate.getTime()) && msgDate < fifteenMinutesAgo) continue;

          const candidates = [
            msg.rawData?.interactive?.list_reply?.title,
            msg.rawData?.interactive?.button_reply?.title,
            msg.rawData?.text?.body,
            msg.message,
            msg.rawData?.list_reply?.title,
            msg.rawData?.button_reply?.title,
          ];

          for (const candidate of candidates) {
            const match = matchDepartmentFromTitle(candidate);
            if (match) {
              detectedDept = match;
              targetWebhookId = msg._id;
              console.log(`[MSG91 Booking] Matched department "${match}" from session webhook _id=${msg._id} (fallback)`);
              break;
            }
          }
          if (detectedDept) break;
        }
      }

      // If no interactive match was found, still associate with the latest session message _id within 2 minutes
      if (!targetWebhookId && recentMsgs.length > 0) {
        const latest = recentMsgs[0];
        const ts = latest.receivedAt || latest.createdAt;
        const msgDate = ts ? new Date(ts) : null;
        if (msgDate && !isNaN(msgDate.getTime()) && msgDate >= twoMinutesAgo) {
          targetWebhookId = latest._id;
        }
      }
    }

    const isInvalidChosen = !chosenService || chosenService.startsWith("@") || chosenService.startsWith("{{") || chosenService.includes("@") || chosenService.includes("{{");

    if (detectedDept && (isInvalidChosen || chosenService.toLowerCase() === "child and parental counselling")) {
      chosenService = detectedDept;
    } else {
      const direct = matchDepartmentFromTitle(chosenService);
      if (direct) chosenService = direct;
    }

    if (chosenService) {
      rawBody.service = chosenService;
      rawBody.department = chosenService;
      rawBody.rawDepartment = chosenService;
      if (typeof rawBody.data === "object" && rawBody.data !== null) {
        rawBody.data.service = chosenService;
        rawBody.data.department = chosenService;
        rawBody.data.rawDepartment = chosenService;
      }
      if (typeof rawBody.payload === "object" && rawBody.payload !== null) {
        rawBody.payload.service = chosenService;
        rawBody.payload.department = chosenService;
        rawBody.payload.rawDepartment = chosenService;
      }
      if (typeof rawBody.variables === "object" && rawBody.variables !== null) {
        rawBody.variables.service = chosenService;
        rawBody.variables.department = chosenService;
        rawBody.variables.rawDepartment = chosenService;
      }
    }

    const { appointment, duplicate } = await saveMsg91Appointment(rawBody);
    console.info(`[MSG91 Booking] ${duplicate ? "Existing booking updated" : "New booking created"}: ${appointment.bookingId}`);

    // Final appointment department: preserve the exact user selection without overrides
    const finalDepartment = (
      chosenService ||
      appointment.rawDepartment ||
      appointment.department ||
      "Child and Parental Counselling"
    ).trim();
    appointment.department = finalDepartment;
    appointment.rawDepartment = finalDepartment;

    // 3. Update ONLY the specific incoming webhook document for this session in db.collection("webhookmessages") using its exact _id
    try {
      if (db && targetWebhookId) {
        await db.collection("webhookmessages").updateOne(
          { _id: targetWebhookId },
          {
            $set: {
              phone: appointment.phoneNumber || cleanPhone || "",
              childName: appointment.patientName || "Not specified",
              parentName: appointment.parentName || "",
              age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "",
              firstSession: (appointment as any).firstSession || "",
              isFirstSession: (appointment as any).isFirstSession,
              appointmentDate: appointment.appointmentDate || "",
              appointmentTime: appointment.appointmentTime || "",
              department: finalDepartment,
              service: finalDepartment,
              concern: appointment.mainConcern || "",
              assignedTherapist: appointment.therapistName,
              assignedTherapistId: appointment.therapistId,
              status: "confirmed",
              bookingStatus: "confirmed",
              session_frequency: appointment.session_frequency || "",
              totalSessions: appointment.totalSessions || 1,
              sessionSchedule: (appointment as any).sessionSchedule || [],
              sessionScheduleText: (appointment as any).sessionScheduleText || "",
              feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
              amount: (appointment as any).amount || 0,
              bookingSource: "whatsapp",
              bookingId: appointment.bookingId,
              updatedAt: new Date().toISOString(),
            },
          }
        );
        console.log(`[MSG91 Booking] Updated specific webhook document (_id: ${targetWebhookId}) with department "${finalDepartment}" and therapist "${appointment.therapistName}"`);
      } else {
        // If no prior webhook document in this session, create a single new one
        await WebhookMessage.create({
          rawData: req.body,
          phone: appointment.phoneNumber || cleanPhone || "",
          childName: appointment.patientName || "Not specified",
          parentName: appointment.parentName || "",
          age: appointment.age !== undefined && appointment.age !== null ? String(appointment.age) : "",
          firstSession: (appointment as any).firstSession || "",
          isFirstSession: (appointment as any).isFirstSession,
          appointmentDate: appointment.appointmentDate || "",
          appointmentTime: appointment.appointmentTime || "",
          department: finalDepartment,
          service: finalDepartment,
          concern: appointment.mainConcern || "",
          assignedTherapist: appointment.therapistName,
          assignedTherapistId: appointment.therapistId || undefined,
          status: "confirmed",
          session_frequency: appointment.session_frequency || "",
          totalSessions: appointment.totalSessions || 1,
          sessionSchedule: (appointment as any).sessionSchedule || [],
          sessionScheduleText: (appointment as any).sessionScheduleText || "",
          feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
          amount: (appointment as any).amount || 0,
          bookingSource: "whatsapp",
          bookingId: appointment.bookingId,
        });
        console.log(`[MSG91 Booking] Created isolated WebhookMessage with department "${finalDepartment}" and therapist "${appointment.therapistName}"`);
      }
    } catch (whErr: any) {
      console.error("[MSG91 Booking] Failed to save/update WebhookMessage:", whErr.message);
    }

    // 4. Sync ONLY this single transaction to chatbotsubmissions (for WhatsApp Appointments dashboard)
    try {
      if (db && (appointment.phoneNumber || cleanPhone)) {
        const txnId = appointment.bookingId || `MSG91-${Date.now()}`;
        await db.collection("chatbotsubmissions").updateOne(
          { transactionId: txnId },
          {
            $set: {
              phone: appointment.phoneNumber || cleanPhone,
              message: appointment.mainConcern || `Appointment for ${appointment.patientName}`,
              department: finalDepartment,
              service: finalDepartment,
              userDetails: {
                name: appointment.patientName || undefined,
                age: appointment.age || undefined,
                parentName: appointment.parentName || undefined,
                problem: appointment.mainConcern || appointment.therapistName || undefined,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                department: finalDepartment,
                service: finalDepartment,
                assignedTherapist: appointment.therapistName || "Ms Tanu Rajput",
                session_frequency: appointment.session_frequency,
                totalSessions: appointment.totalSessions,
                sessionSchedule: (appointment as any).sessionSchedule || [],
                sessionScheduleText: (appointment as any).sessionScheduleText || "",
                feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
              },
              assignedTherapist: appointment.therapistName || "Ms Tanu Rajput",
              assignedTherapistId: appointment.therapistId || "roster-counselling-1",
              status: "confirmed",
              session_frequency: appointment.session_frequency,
              totalSessions: appointment.totalSessions,
              sessionSchedule: (appointment as any).sessionSchedule || [],
              sessionScheduleText: (appointment as any).sessionScheduleText || "",
              feeCharged: appointment.feeCharged ?? (appointment as any).amount ?? 0,
              amount: (appointment as any).amount,
              source: "whatsapp",
              rawPayload: req.body,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              transactionId: txnId,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    } catch (submissionsErr: any) {
      console.error("[MSG91 Booking] Failed to sync chatbotsubmissions:", submissionsErr.message);
    }

    // Clear stale in-memory cached department so past selections never leak into future sessions
    clearRecentDepartmentSelection(cleanPhone);

    // 5. Razorpay dynamic payment link integration
    let paymentUrl = "";
    let paymentLinkId = "";
    const fee = appointment.feeCharged ?? (appointment as any).amount ?? 800;

    try {
      const keyId = process.env.RAZORPAY_KEY_ID || config.razorpayKeyId;
      const keySecret = process.env.RAZORPAY_KEY_SECRET || config.razorpayKeySecret;

      if (keyId && keySecret) {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const customerContact = cleanPhone
          ? (cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone.slice(-10)}`)
          : undefined;
        const customerName = appointment.parentName || appointment.patientName || "Parent";

        const paymentLinkPayload: any = {
          amount: Math.round(Number(fee) * 100),
          currency: "INR",
          accept_partial: false,
          description: `Appointment Booking for ${appointment.patientName || "Patient"} (${appointment.bookingId})`,
          customer: {
            name: customerName,
            contact: customerContact,
            ...(rawBody.email || nestedData.email ? { email: rawBody.email || nestedData.email } : {}),
          },
          notify: {
            sms: false,
            email: false,
          },
          reminder_enable: false,
          notes: {
            bookingId: appointment.bookingId,
            childName: appointment.patientName || "",
            department: finalDepartment,
          },
        };

        const paymentLink: any = await razorpay.paymentLink.create(paymentLinkPayload);
        paymentUrl = paymentLink?.short_url || "";
        paymentLinkId = paymentLink?.id || "";
        console.log(`✅ [MSG91 Booking] Razorpay Payment Link Created: ${paymentLinkId} -> ${paymentUrl}`);

        if (db && appointment.bookingId && paymentUrl) {
          await db.collection("appointments").updateOne(
            { bookingId: appointment.bookingId },
            {
              $set: {
                paymentUrl,
                paymentLinkId,
                paymentStatus: "pending",
                updatedAt: new Date().toISOString(),
              },
            }
          );

          if (targetWebhookId) {
            await db.collection("webhookmessages").updateOne(
              { _id: targetWebhookId },
              { $set: { paymentUrl, paymentLinkId, updatedAt: new Date().toISOString() } }
            );
          }

          await db.collection("chatbotsubmissions").updateOne(
            { transactionId: appointment.bookingId },
            { $set: { paymentUrl, paymentLinkId, updatedAt: new Date() } }
          );
        }
      } else {
        console.warn("⚠️ [MSG91 Booking] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured");
      }
    } catch (rzpErr: any) {
      console.error("❌ [MSG91 Booking] Failed to create Razorpay payment link:", rzpErr?.message || rzpErr);
    }

    res.status(200).json({
      success: true,
      status: "success",
      bookingId: appointment.bookingId,
      fee: fee,
      paymentUrl: paymentUrl,
      paymentLinkId: paymentLinkId,
      data: {
        ...appointment,
        paymentUrl,
        paymentLinkId,
        fee,
      },
      message: duplicate ? "Booking record updated successfully" : "Booking saved successfully",
    });
  } catch (error: any) {
    console.error("[MSG91 Booking] Error saving booking:", error.message || error);
    res.status(200).json({
      success: true,
      status: "success",
      message: "Request processed",
      error: error.message,
    });
  }
});

/**
 * POST /api/msg91/calculate-fee
 * Returns the correct appointment fee based on patient type, appointment mode,
 * department, and (for Counselling returning patients) session frequency.
 *
 * Body:
 *  {
 *    isNew: boolean,                        // from /check-patient-status response
 *    appointmentType: "online" | "offline", // consultation mode
 *    department: string,                    // e.g. "Counselling", "OT", "Speech Therapy"
 *    session_frequency?: string             // e.g. "Week", "3 Sessions", "full_week", "Single"
 *  }
 *
 * Response:
 *  { success: true, amount: number, totalSessions: number, feeCharged: number }
 *
 * Pricing rules:
 *  New patient   – Online: ₹600 | Offline: ₹800
 *  Returning + Counselling + 3 Days / "2400" – ₹2400, 3 sessions
 *  Returning + Counselling + 2 Days / "1600" – ₹1600, 2 sessions
 *  Returning + Counselling + Single           – ₹800,  1 session
 *  Returning + other services – Online: ₹600 | Offline: ₹800
 */
msg91BookingRouter.all("/calculate-fee", async (req, res) => {
  try {
    const data = { ...(req.query || {}), ...(req.body || {}) };
    const rawCandidatePhone =
      data.phone ||
      data.phoneNumber ||
      data.customerNumber ||
      data.mobile ||
      "";
    const digitsOnly = String(rawCandidatePhone || "").replace(/\D/g, "");
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    let isNew: boolean;
    const rawIsNew = data.isNew ?? data.is_new ?? data.is_new_patient ?? data.isNewPatient ?? data.firstSession ?? data.isFirstSession;
    if (rawIsNew !== undefined && rawIsNew !== null && rawIsNew !== "") {
      isNew = rawIsNew === true || rawIsNew === "true" || rawIsNew === "yes" || rawIsNew === 1 || rawIsNew === "1";
    } else if (cleanPhone) {
      // Check if phone has existing bookings
      const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
      if (db) {
        const phoneRegex = new RegExp(`${cleanPhone}$`);
        const priorCount = await db.collection("appointments").countDocuments({
          $or: [
            { phoneNumber: phoneRegex },
            { phone: phoneRegex },
            { "rawPayload.customerNumber": phoneRegex },
            { "rawPayload.phoneNumber": phoneRegex },
          ],
          bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
        }).catch(() => 0);
        isNew = priorCount === 0;
      } else {
        isNew = false;
      }
    } else {
      isNew = false;
    }

    const appointmentType = String(
      data.appointmentType ?? data.appointment_type ?? data.paymentMode ?? data.payment_mode ?? data.mode ?? "in-person"
    ).trim();
    const rawDept = String(data.department ?? data.service ?? data.selected_service ?? "").trim();
    // Only lock to Counselling if patient is strictly a new first-time patient!
    const department = isNew ? "Child and Parental Counselling" : normalizeDepartment(rawDept);
    const session_frequency = String(data.session_frequency ?? data.sessionFrequency ?? data.frequency ?? "").trim();

    const { amount, totalSessions, feeCharged } = calculateAppointmentFee({
      isNew,
      appointmentType,
      department,
      session_frequency,
    });

    console.log(`[calculate-fee] isNew=${isNew} dept=${department} type=${appointmentType} freq=${session_frequency} => ₹${amount} (${totalSessions} session(s))`);

    return res.json({
      success: true,
      amount,
      totalSessions,
      feeCharged,
      fee: feeCharged,
      sessions: totalSessions,
      data: { amount, totalSessions, feeCharged }
    });
  } catch (error: any) {
    console.error("[calculate-fee] Error:", error.message || error);
    return res.json({ success: true, amount: 800, totalSessions: 1, feeCharged: 800 });
  }
});

/**
 * ALL /api/msg91/check-patient-status and /msg91/check-patient-status
 * Handles both GET and POST requests.
 * Checks whether a phone number has any existing (non-cancelled/non-rejected)
 * appointments or bookings.
 * Resiliently extracts phone from query, body, params, nested payload, or customerNumber.
 * Never throws 400: defaults gracefully to isNew=true if phone is missing or invalid.
 */
msg91BookingRouter.all(["/check-patient-status", "/msg91/check-patient-status"], async (req, res) => {
  try {
    await connectMongoDb().catch(() => {});

    const body = req.body || {};
    const query = req.query || {};
    const params = req.params || {};
    const nested = body.data || body.payload || body.variables || {};

    // 1. Extract phone from req.query, req.body, params, or nested data
    const rawCandidate =
      req.query?.phone ||
      req.query?.phoneNumber ||
      req.body?.phone ||
      req.body?.phoneNumber ||
      req.body?.customerNumber ||
      query.customerNumber ||
      params.phoneNumber ||
      params.customerNumber ||
      params.phone ||
      body.mobile ||
      body.contact ||
      body.sender ||
      (body.data && (body.data.phone || body.data.phoneNumber || body.data.contact || body.data.sender || body.data.customerNumber)) ||
      nested.phone ||
      nested.phoneNumber ||
      nested.customerNumber ||
      nested.mobile ||
      nested.contact ||
      nested.sender ||
      nested.customer_number ||
      nested.from ||
      body.customer_number ||
      body.customer_no ||
      body.mobile_number ||
      body.phone_number ||
      body.from ||
      body.number ||
      query.mobile ||
      query.contact ||
      query.sender ||
      query.customer_number ||
      query.from ||
      "";

    let rawPhone = (rawCandidate || "").toString().trim();

    // Fallback if candidate was empty but raw body is string containing phone digits
    if (!rawPhone && typeof req.body === "string") {
      const match = req.body.match(/\d{10,12}/);
      if (match) rawPhone = match[0];
    }

    // 2. Sanitize: strip non-digit characters and take the last 10 digits
    const db = isMongoConnected() ? getMongoDb() : mongoose.connection.db;
    let digitsOnly = rawPhone.replace(/\D/g, "");
    let cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "";

    // If phone is missing or empty, do NOT query DB or fall back to DB records! Default immediately to new patient
    if (!cleanPhone) {
      console.warn(`[check-patient-status] Missing or empty phone parameter (query: ${JSON.stringify(req.query)}, body: ${JSON.stringify(req.body)}). Defaulting to new patient.`);
      return res.status(200).json({
        success: true,
        isNew: true,
        is_new: true,
        is_new_patient: "true",
        isNewPatient: true,
        is_new_patient_bool: true,
        existingPatient: false,
        existing_patient: false,
        is_returning: false,
        isReturning: false,
        patientName: "",
        childName: "",
        status: "new",
        count: 0,
        message: "Defaulted to new patient due to missing phone parameter",
        data: {
          success: true,
          isNew: true,
          is_new: true,
          is_new_patient: "true",
          isNewPatient: true,
          is_new_patient_bool: true,
          existingPatient: false,
          existing_patient: false,
          patientName: "",
          childName: "",
          status: "new",
          count: 0,
        },
      });
    }

    // 3. Query DB for existing appointments/messages matching last 10 digits regex
    let count = 0;
    let patientName = "";

    if (db) {
      const phoneRegex = new RegExp(`${cleanPhone}$`);
      const apptFilter = {
        $or: [
          { phoneNumber: phoneRegex },
          { phone: phoneRegex },
          { "rawPayload.customerNumber": phoneRegex },
          { "rawPayload.phoneNumber": phoneRegex },
        ],
        bookingStatus: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
      };
      const webhookFilter = {
        $or: [
          { phone: phoneRegex },
          { phoneNumber: phoneRegex },
          { "rawData.customerNumber": phoneRegex },
          { "rawData.phoneNumber": phoneRegex },
        ],
        status: { $nin: ["cancelled", "Cancelled", "rejected", "Rejected"] },
      };

      const [apptCount, webhookCount, latestAppt, latestWebhook] = await Promise.all([
        db.collection("appointments").countDocuments(apptFilter).catch(() => 0),
        db.collection("webhookmessages").countDocuments(webhookFilter).catch(() => 0),
        db.collection("appointments").findOne(apptFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
        db.collection("webhookmessages").findOne(webhookFilter, { sort: { createdAt: -1, _id: -1 } }).catch(() => null),
      ]);

      count = (apptCount || 0) + (webhookCount || 0);
      patientName =
        latestAppt?.patientName ||
        latestWebhook?.childName ||
        latestWebhook?.patientName ||
        latestAppt?.parentName ||
        latestWebhook?.parentName ||
        "";
    }

    const existingPatient = count > 0;
    const isNew = !existingPatient;
    console.log(`[check-patient-status] phone=${cleanPhone} existingPatient=${existingPatient} totalCount=${count} patientName="${patientName}" => isNew=${isNew}`);

    return res.status(200).json({
      success: true,
      isNew,
      is_new: isNew,
      is_new_patient: isNew ? "true" : "false",
      isNewPatient: isNew,
      is_new_patient_bool: isNew,
      existingPatient,
      existing_patient: existingPatient,
      is_returning: existingPatient,
      isReturning: existingPatient,
      patientName,
      childName: patientName,
      status: isNew ? "new" : "returning",
      phone: cleanPhone,
      count,
      data: {
        success: true,
        isNew,
        is_new: isNew,
        is_new_patient: isNew ? "true" : "false",
        isNewPatient: isNew,
        is_new_patient_bool: isNew,
        existingPatient,
        existing_patient: existingPatient,
        is_returning: existingPatient,
        isReturning: existingPatient,
        patientName,
        childName: patientName,
        status: isNew ? "new" : "returning",
        count,
      },
    });
  } catch (error: any) {
    console.error("[check-patient-status] Error:", error?.message || error);
    // Never return 400 or 500 to prevent MSG91 bot from hanging
    return res.status(200).json({
      success: true,
      isNew: true,
      is_new: true,
      is_new_patient: "true",
      isNewPatient: true,
      is_new_patient_bool: true,
      existingPatient: false,
      existing_patient: false,
      is_returning: false,
      isReturning: false,
      patientName: "",
      childName: "",
      status: "new",
      count: 0,
      fallback: true,
      message: "Defaulted to new patient due to missing phone parameter",
      data: {
        success: true,
        isNew: true,
        is_new: true,
        is_new_patient: "true",
        isNewPatient: true,
        is_new_patient_bool: true,
        existingPatient: false,
        existing_patient: false,
        is_returning: false,
        isReturning: false,
        patientName: "",
        childName: "",
        status: "new",
        count: 0,
      },
    });
  }
});

export default msg91BookingRouter;


import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getMongoDb } from "../lib/mongodb.js";
import { sendEmail } from "./emailService.js";
import { HttpError } from "../utils/httpError.js";
const SALT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
export const DUPLICATE_ACCOUNT_MESSAGE = "An account with this email or mobile number already exists.";
function normalizeId(value) {
    if (value instanceof ObjectId)
        return value.toString();
    return String(value ?? "");
}
function normalizeUser(document) {
    return {
        id: normalizeId(document._id),
        name: document.name,
        email: document.email,
        phone: document.phone,
        role: document.role,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    };
}
function normalizeAddress(document) {
    return {
        id: normalizeId(document._id),
        userId: String(document.userId),
        fullName: String(document.fullName),
        phone: String(document.phone),
        city: String(document.city),
        state: String(document.state),
        pincode: String(document.pincode),
        addressLine1: String(document.addressLine1),
        addressLine2: String(document.addressLine2 ?? ""),
        createdAt: String(document.createdAt),
        updatedAt: document.updatedAt ? String(document.updatedAt) : undefined,
    };
}
function normalizeOrder(document) {
    const { _id, ...rest } = document;
    return {
        id: normalizeId(_id ?? rest.id),
        ...rest,
    };
}
export async function ensureUserIndexes() {
    const db = getMongoDb();
    await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("users").createIndex({ phone: 1 }, { unique: true, sparse: true }),
        db.collection("addresses").createIndex({ userId: 1 }),
        db.collection("orders").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("carts").createIndex({ userId: 1 }, { unique: true }),
        db.collection("pendingSignups").createIndex({ email: 1 }, { unique: true }),
        db.collection("pendingSignups").createIndex({ otpExpiry: 1 }, { expireAfterSeconds: 0 }),
    ]);
}
export function signUserToken(user) {
    const options = {
        subject: user.id,
        expiresIn: config.jwtExpiresIn,
    };
    return jwt.sign({
        email: user.email,
        role: user.role,
    }, config.jwtSecret, options);
}
export function normalizeSignupPhone(input) {
    return (input.phone ?? input.mobileNumber)?.trim() || undefined;
}
export async function findExistingSignupUser(input) {
    const email = input.email.trim().toLowerCase();
    const phone = normalizeSignupPhone(input);
    const duplicateChecks = [{ email }];
    if (phone) {
        duplicateChecks.push({ phone }, { mobileNumber: phone });
    }
    return getMongoDb().collection("users").findOne({ $or: duplicateChecks });
}
export async function signupUser(input) {
    const db = getMongoDb();
    await ensureUserIndexes();
    const email = input.email.trim().toLowerCase();
    const phone = normalizeSignupPhone(input);
    const existing = await findExistingSignupUser({ email, phone });
    if (existing) {
        throw new HttpError(400, DUPLICATE_ACCOUNT_MESSAGE);
    }
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const userDocument = {
        name: input.name.trim(),
        email,
        password: passwordHash,
        ...(phone ? { phone } : {}),
        role: "user",
        createdAt: now,
        updatedAt: now,
    };
    let result;
    try {
        result = await db.collection("users").insertOne(userDocument);
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            throw new HttpError(400, DUPLICATE_ACCOUNT_MESSAGE);
        }
        throw error;
    }
    const user = normalizeUser({
        _id: result.insertedId,
        name: input.name.trim(),
        email,
        password: passwordHash,
        ...(phone ? { phone } : {}),
        role: "user",
        createdAt: now,
        updatedAt: now,
    });
    return {
        user,
        token: signUserToken(user),
    };
}
function otpEmailTemplate(title, otp) {
    return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
      <h2 style="color:#2f5597">${title}</h2>
      <p>Use this one-time password to continue:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#111827">${otp}</p>
      <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request this, you can ignore this email.</p>
    </div>
  `;
}
export async function requestSignupVerification(input) {
    const db = getMongoDb();
    await ensureUserIndexes();
    const email = input.email.trim().toLowerCase();
    const phone = normalizeSignupPhone(input);
    const existing = await findExistingSignupUser({ email, phone });
    if (existing) {
        throw new HttpError(400, DUPLICATE_ACCOUNT_MESSAGE);
    }
    const otp = generateSixDigitOtp();
    const [passwordHash, otpHash] = await Promise.all([
        bcrypt.hash(input.password, SALT_ROUNDS),
        bcrypt.hash(otp, SALT_ROUNDS),
    ]);
    const now = new Date().toISOString();
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const pendingSignup = {
        name: input.name.trim(),
        email,
        ...(phone ? { phone } : {}),
        passwordHash,
        otpHash,
        otpExpiry,
        otpAttempts: 0,
        createdAt: now,
        updatedAt: now,
    };
    const { createdAt, ...pendingSignupUpdate } = pendingSignup;
    await db.collection("pendingSignups").updateOne({ email }, {
        $set: pendingSignupUpdate,
        $setOnInsert: { createdAt },
    }, { upsert: true });
    const info = await sendEmail({
        to: email,
        subject: "Verify your UDAI account",
        html: otpEmailTemplate("Verify your UDAI account", otp),
    });
    if (!info) {
        throw new HttpError(500, "Unable to send signup OTP. Please try again.");
    }
}
export async function verifySignupOtp(input) {
    const db = getMongoDb();
    await ensureUserIndexes();
    const email = input.email.trim().toLowerCase();
    const pendingSignup = await db.collection("pendingSignups").findOne({ email });
    if (!pendingSignup || pendingSignup.otpExpiry < new Date()) {
        throw new HttpError(400, "Invalid or expired OTP");
    }
    if (pendingSignup.otpAttempts >= 5) {
        throw new HttpError(429, "Too many OTP attempts. Please request a new OTP.");
    }
    const otpMatches = await bcrypt.compare(input.otp, pendingSignup.otpHash);
    if (!otpMatches) {
        await db.collection("pendingSignups").updateOne({ _id: pendingSignup._id }, { $inc: { otpAttempts: 1 }, $set: { updatedAt: new Date().toISOString() } });
        throw new HttpError(400, "OTP does not matched.");
    }
    const existing = await findExistingSignupUser({
        email: pendingSignup.email,
        phone: pendingSignup.phone,
    });
    if (existing) {
        await db.collection("pendingSignups").deleteOne({ _id: pendingSignup._id });
        throw new HttpError(400, DUPLICATE_ACCOUNT_MESSAGE);
    }
    const now = new Date().toISOString();
    const userDocument = {
        name: pendingSignup.name,
        email: pendingSignup.email,
        password: pendingSignup.passwordHash,
        ...(pendingSignup.phone ? { phone: pendingSignup.phone } : {}),
        role: "user",
        createdAt: now,
        updatedAt: now,
    };
    let result;
    try {
        result = await db.collection("users").insertOne(userDocument);
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            await db.collection("pendingSignups").deleteOne({ _id: pendingSignup._id });
            throw new HttpError(400, DUPLICATE_ACCOUNT_MESSAGE);
        }
        throw error;
    }
    await db.collection("pendingSignups").deleteOne({ _id: pendingSignup._id });
    const user = normalizeUser({
        _id: result.insertedId,
        name: pendingSignup.name,
        email: pendingSignup.email,
        password: pendingSignup.passwordHash,
        ...(pendingSignup.phone ? { phone: pendingSignup.phone } : {}),
        role: "user",
        createdAt: now,
        updatedAt: now,
    });
    return {
        user,
        token: signUserToken(user),
    };
}
export async function loginUser(input) {
    const db = getMongoDb();
    const identifier = input.identifier.trim().toLowerCase();
    const query = {
        $or: [{ email: identifier }, { phone: identifier }]
    };
    const userDocument = await db.collection("users").findOne(query);
    if (!userDocument) {
        throw new HttpError(401, "Invalid email, phone, or password");
    }
    if (input.password) {
        if (!userDocument.password)
            throw new HttpError(401, "Password login is not set up");
        const passwordMatches = await bcrypt.compare(input.password, userDocument.password);
        if (!passwordMatches) {
            throw new HttpError(401, "Invalid email, phone, or password");
        }
    }
    else if (input.otp) {
        if (!userDocument.otp || userDocument.otp !== input.otp) {
            throw new HttpError(401, "Invalid or expired OTP");
        }
        if (userDocument.otpExpiry && new Date(userDocument.otpExpiry) < new Date()) {
            throw new HttpError(401, "Invalid or expired OTP");
        }
        // Clear OTP after successful use
        await db.collection("users").updateOne({ _id: userDocument._id }, { $unset: { otp: "", otpExpiry: "" } });
    }
    else {
        throw new HttpError(400, "Password or OTP is required");
    }
    const user = normalizeUser(userDocument);
    return {
        user,
        token: signUserToken(user),
    };
}
export async function sendOtp(identifier) {
    const db = getMongoDb();
    const id = identifier.trim().toLowerCase();
    const user = await db.collection("users").findOne({
        $or: [{ email: id }, { phone: id }]
    });
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.collection("users").updateOne({ _id: user._id }, { $set: { otp, otpExpiry } });
    console.log(`[DEV ONLY] OTP for ${identifier}: ${otp}`);
}
function generateSixDigitOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}
function passwordResetEmailTemplate(otp) {
    return otpEmailTemplate("Reset your UDAI password", otp);
}
export async function requestPasswordReset(emailInput) {
    const db = getMongoDb();
    const email = emailInput.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email });
    if (!user) {
        throw new HttpError(404, "No account exists for this email address");
    }
    const otp = generateSixDigitOtp();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
    await db.collection("users").updateOne({ _id: user._id }, {
        $set: {
            passwordResetOtpHash: otpHash,
            passwordResetOtpExpiry: otpExpiry,
            passwordResetAttempts: 0,
            updatedAt: new Date().toISOString(),
        },
    });
    const info = await sendEmail({
        to: email,
        subject: "Your UDAI password reset OTP",
        html: passwordResetEmailTemplate(otp),
    });
    if (!info) {
        throw new HttpError(500, "Unable to send password reset OTP. Please try again.");
    }
}
export async function resetPasswordWithOtp(input) {
    const db = getMongoDb();
    const email = input.email.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email });
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiry) {
        throw new HttpError(400, "Invalid or expired OTP");
    }
    if (new Date(user.passwordResetOtpExpiry) < new Date()) {
        throw new HttpError(400, "Invalid or expired OTP");
    }
    if ((user.passwordResetAttempts ?? 0) >= 5) {
        throw new HttpError(429, "Too many OTP attempts. Please request a new OTP.");
    }
    const otpMatches = await bcrypt.compare(input.otp, user.passwordResetOtpHash);
    if (!otpMatches) {
        await db.collection("users").updateOne({ _id: user._id }, { $inc: { passwordResetAttempts: 1 } });
        throw new HttpError(400, "Invalid or expired OTP");
    }
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    await db.collection("users").updateOne({ _id: user._id }, {
        $set: {
            password: passwordHash,
            updatedAt: new Date().toISOString(),
        },
        $unset: {
            passwordResetOtpHash: "",
            passwordResetOtpExpiry: "",
            passwordResetAttempts: "",
            otp: "",
            otpExpiry: "",
        },
    });
}
export async function getUserProfile(userId) {
    const userDocument = await getMongoDb()
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });
    if (!userDocument) {
        throw new HttpError(404, "User not found");
    }
    return normalizeUser(userDocument);
}
export async function getUserAddresses(userId) {
    const docs = await getMongoDb()
        .collection("addresses")
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
    return docs.map((doc) => normalizeAddress(doc));
}
export async function createUserAddress(userId, input) {
    const now = new Date().toISOString();
    const result = await getMongoDb().collection("addresses").insertOne({
        userId,
        ...input,
        createdAt: now,
        updatedAt: now,
    });
    return normalizeAddress({
        _id: result.insertedId,
        userId,
        ...input,
        createdAt: now,
        updatedAt: now,
    });
}
export async function getUserOrders(userId) {
    const docs = await getMongoDb()
        .collection("orders")
        .find({
        userId,
        $or: [{ paymentStatus: "paid" }, { orderStatus: "confirmed" }],
    })
        .sort({ createdAt: -1 })
        .toArray();
    return docs.map((doc) => normalizeOrder(doc));
}
export async function createUserOrder(userId, order) {
    const now = new Date().toISOString();
    const result = await getMongoDb().collection("orders").insertOne({
        ...order,
        userId,
        createdAt: now,
        updatedAt: now,
    });
    return normalizeOrder({
        _id: result.insertedId,
        ...order,
        userId,
        createdAt: now,
        updatedAt: now,
    });
}
function normalizeCartItemQuantity(value) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity))
        return 1;
    return Math.min(Math.max(Math.trunc(quantity), 1), 99);
}
function mergeCartItems(existingItems, incomingItems) {
    const merged = new Map();
    for (const item of [...existingItems, ...incomingItems]) {
        const productId = String(item.product.id);
        const current = merged.get(productId);
        if (current) {
            merged.set(productId, {
                product: item.product,
                quantity: Math.max(normalizeCartItemQuantity(current.quantity), normalizeCartItemQuantity(item.quantity)),
            });
        }
        else {
            merged.set(productId, {
                product: item.product,
                quantity: normalizeCartItemQuantity(item.quantity),
            });
        }
    }
    return Array.from(merged.values());
}
export async function getUserCart(userId) {
    const cart = await getMongoDb().collection("carts").findOne({ userId });
    return {
        items: mergeCartItems([], (cart?.items ?? [])),
    };
}
export async function saveUserCart(userId, items) {
    const now = new Date().toISOString();
    const normalizedItems = mergeCartItems([], items);
    await getMongoDb().collection("carts").updateOne({ userId }, {
        $set: {
            userId,
            items: normalizedItems,
            updatedAt: now,
        },
        $setOnInsert: {
            createdAt: now,
        },
    }, { upsert: true });
    return { items: normalizedItems };
}
export async function mergeUserCart(userId, incomingItems) {
    const current = await getUserCart(userId);
    return saveUserCart(userId, mergeCartItems(current.items, incomingItems));
}

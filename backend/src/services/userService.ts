import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getMongoDb } from "../lib/mongodb.js";
import type { Address, Order, User, UserDocument } from "../types.js";
import { HttpError } from "../utils/httpError.js";

const SALT_ROUNDS = 12;

type SignupInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

type LoginInput = {
  identifier: string;
  password?: string;
  otp?: string;
};

type AddressInput = Omit<Address, "id" | "userId" | "createdAt" | "updatedAt">;

function normalizeId(value: unknown) {
  if (value instanceof ObjectId) return value.toString();
  return String(value ?? "");
}

function normalizeUser(document: UserDocument): User {
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

function normalizeAddress(document: Record<string, unknown>): Address {
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

function normalizeOrder(document: Record<string, unknown>): Order {
  const { _id, ...rest } = document;
  return {
    id: normalizeId(_id ?? rest.id),
    ...rest,
  } as Order;
}

export async function ensureUserIndexes() {
  const db = getMongoDb();
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("addresses").createIndex({ userId: 1 }),
    db.collection("orders").createIndex({ userId: 1, createdAt: -1 }),
  ]);
}

export function signUserToken(user: User) {
  const options: SignOptions = {
    subject: user.id,
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    options,
  );
}

export async function signupUser(input: SignupInput) {
  const db = getMongoDb();
  await ensureUserIndexes();

  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim();
  
  const query = phone 
    ? { $or: [{ email }, { phone }] }
    : { email };
    
  const existing = await db.collection<UserDocument>("users").findOne(query);
  if (existing) {
    throw new HttpError(409, "An account with this email or phone already exists");
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const result = await db.collection("users").insertOne({
    name: input.name.trim(),
    email,
    password: passwordHash,
    phone,
    role: "user",
    createdAt: now,
    updatedAt: now,
  });

  const user = normalizeUser({
    _id: result.insertedId,
    name: input.name.trim(),
    email,
    password: passwordHash,
    phone,
    role: "user",
    createdAt: now,
    updatedAt: now,
  });

  return {
    user,
    token: signUserToken(user),
  };
}

export async function loginUser(input: LoginInput) {
  const db = getMongoDb();
  const identifier = input.identifier.trim().toLowerCase();
  
  const query = {
    $or: [{ email: identifier }, { phone: identifier }]
  };
  
  const userDocument = await db.collection<UserDocument>("users").findOne(query);
  if (!userDocument) {
    throw new HttpError(401, "Invalid email, phone, or password");
  }

  if (input.password) {
    if (!userDocument.password) throw new HttpError(401, "Password login is not set up");
    const passwordMatches = await bcrypt.compare(input.password, userDocument.password);
    if (!passwordMatches) {
      throw new HttpError(401, "Invalid email, phone, or password");
    }
  } else if (input.otp) {
    if (!userDocument.otp || userDocument.otp !== input.otp) {
      throw new HttpError(401, "Invalid or expired OTP");
    }
    if (userDocument.otpExpiry && new Date(userDocument.otpExpiry) < new Date()) {
      throw new HttpError(401, "Invalid or expired OTP");
    }
    // Clear OTP after successful use
    await db.collection("users").updateOne(
      { _id: userDocument._id },
      { $unset: { otp: "", otpExpiry: "" } }
    );
  } else {
    throw new HttpError(400, "Password or OTP is required");
  }

  const user = normalizeUser(userDocument);
  return {
    user,
    token: signUserToken(user),
  };
}

export async function sendOtp(identifier: string) {
  const db = getMongoDb();
  const id = identifier.trim().toLowerCase();
  
  const user = await db.collection<UserDocument>("users").findOne({
    $or: [{ email: id }, { phone: id }]
  });
  
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { otp, otpExpiry } }
  );
  
  console.log(`[DEV ONLY] OTP for ${identifier}: ${otp}`);
}

export async function getUserProfile(userId: string) {
  const userDocument = await getMongoDb()
    .collection<UserDocument>("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!userDocument) {
    throw new HttpError(404, "User not found");
  }

  return normalizeUser(userDocument);
}

export async function getUserAddresses(userId: string) {
  const docs = await getMongoDb()
    .collection("addresses")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => normalizeAddress(doc));
}

export async function createUserAddress(userId: string, input: AddressInput) {
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

export async function getUserOrders(userId: string) {
  const docs = await getMongoDb()
    .collection("orders")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => normalizeOrder(doc));
}

export async function createUserOrder(userId: string, order: Omit<Order, "id" | "createdAt" | "updatedAt">) {
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

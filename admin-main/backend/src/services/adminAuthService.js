import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { readJsonFile, writeJsonFile } from "../lib/fileStore.js";
import { adminUsers as seedAdminUsers } from "../data/seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function adminUsersPath() {
  return path.resolve(__dirname, "..", "data", "admin-users.json");
}

export async function readAdminUsers() {
  try {
    return await readJsonFile(adminUsersPath());
  } catch {
    return seedAdminUsers;
  }
}

export async function saveAdminUsers(users) {
  await writeJsonFile(adminUsersPath(), users);
  return users;
}

export async function authenticateAdmin(email, password) {
  const users = await readAdminUsers();
  const user = users.find(
    (item) =>
      item.email.toLowerCase() === String(email).trim().toLowerCase() &&
      item.password === String(password) &&
      item.isActive !== false,
  );

  return user ?? null;
}

export async function listAdminUsers() {
  const users = await readAdminUsers();
  return users.map(({ password: _pwd, ...safeUser }) => safeUser);
}

export async function createAdminUser({
  name,
  email,
  password,
  role = "admin",
  permissions = [],
}) {
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("Email (Login ID) is required");
  }
  if (!password || String(password).length < 4) {
    throw new Error("Password must be at least 4 characters long");
  }

  const users = await readAdminUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(`An admin with email "${cleanEmail}" already exists`);
  }

  const defaultPermissions = [
    "Dashboard",
    "WhatsApp Appointments",
    "WhatsApp Messages",
    "Orders / Purchases",
    "Donations",
    "Volunteers",
    "Therapist Management",
    "Availability Manager",
    "Products",
    "Career Management",
    "Subscribe",
    "Contacts",
    "Notifications Center",
    "Message Broadcast",
    "Reports / Analytics",
    "Settings",
  ];

  const assignedPermissions = Array.isArray(permissions) && permissions.length > 0
    ? permissions
    : role === "super_admin"
      ? ["Admin Management", ...defaultPermissions]
      : defaultPermissions;

  const newUser = {
    id: `user_${Date.now()}`,
    name: String(name || "Admin User").trim(),
    email: cleanEmail,
    password: String(password),
    role: role === "super_admin" ? "super_admin" : role || "admin",
    permissions: assignedPermissions,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveAdminUsers(users);

  const { password: _pwd, ...safeUser } = newUser;
  return safeUser;
}

export async function updateAdminUser(id, updates = {}) {
  const users = await readAdminUsers();
  const userIdx = users.findIndex((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());

  if (userIdx === -1) {
    throw new Error("Admin user not found");
  }

  const user = users[userIdx];

  // If email change requested, verify uniqueness
  if (updates.email) {
    const newEmail = String(updates.email).trim().toLowerCase();
    const duplicate = users.find((u, i) => i !== userIdx && u.email.toLowerCase() === newEmail);
    if (duplicate) {
      throw new Error(`Email "${newEmail}" is already in use by another admin`);
    }
    user.email = newEmail;
  }

  if (updates.name !== undefined) {
    user.name = String(updates.name).trim();
  }

  if (updates.password && String(updates.password).trim()) {
    user.password = String(updates.password).trim();
  }

  if (updates.role !== undefined) {
    user.role = updates.role;
  }

  if (Array.isArray(updates.permissions)) {
    user.permissions = updates.permissions;
  }

  if (updates.isActive !== undefined) {
    user.isActive = Boolean(updates.isActive);
  }

  user.updatedAt = new Date().toISOString();
  users[userIdx] = user;
  await saveAdminUsers(users);

  const { password: _pwd, ...safeUser } = user;
  return safeUser;
}

export async function deleteAdminUser(id, requesterEmail = "") {
  const users = await readAdminUsers();
  const userIdx = users.findIndex((u) => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());

  if (userIdx === -1) {
    throw new Error("Admin user not found");
  }

  const targetUser = users[userIdx];

  // Prevent self-deletion
  if (requesterEmail && targetUser.email.toLowerCase() === requesterEmail.toLowerCase()) {
    throw new Error("You cannot delete your own account");
  }

  // Prevent deleting the last super_admin
  if (targetUser.role === "super_admin") {
    const superAdmins = users.filter((u) => u.role === "super_admin");
    if (superAdmins.length <= 1) {
      throw new Error("Cannot delete the only remaining Super Administrator");
    }
  }

  users.splice(userIdx, 1);
  await saveAdminUsers(users);
  return { success: true, message: `Admin ${targetUser.email} deleted successfully` };
}

export async function resetCredentials({
  currentEmail,
  newEmail,
  currentPassword,
  newPassword,
}) {
  const cleanCurrentEmail = String(currentEmail || "").trim().toLowerCase();
  if (!cleanCurrentEmail) {
    throw new Error("Current login email is required");
  }

  const users = await readAdminUsers();
  const userIdx = users.findIndex((u) => u.email.toLowerCase() === cleanCurrentEmail);

  if (userIdx === -1) {
    throw new Error("Admin account not found");
  }

  const user = users[userIdx];

  // Verify current password
  if (user.password !== String(currentPassword)) {
    throw new Error("Current password is incorrect");
  }

  // If new email requested
  if (newEmail && String(newEmail).trim()) {
    const cleanNewEmail = String(newEmail).trim().toLowerCase();
    if (cleanNewEmail !== cleanCurrentEmail) {
      const duplicate = users.find((u, i) => i !== userIdx && u.email.toLowerCase() === cleanNewEmail);
      if (duplicate) {
        throw new Error(`Email "${cleanNewEmail}" is already registered`);
      }
      user.email = cleanNewEmail;
    }
  }

  // If new password requested
  if (newPassword && String(newPassword).trim()) {
    if (String(newPassword).length < 4) {
      throw new Error("New password must be at least 4 characters long");
    }
    user.password = String(newPassword).trim();
  }

  user.updatedAt = new Date().toISOString();
  users[userIdx] = user;
  await saveAdminUsers(users);

  const { password: _pwd, ...safeUser } = user;
  return safeUser;
}

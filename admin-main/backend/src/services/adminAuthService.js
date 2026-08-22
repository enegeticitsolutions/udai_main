import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/fileStore.js";
import { adminUsers as seedAdminUsers } from "../data/seedData.js";

function adminUsersPath() {
  return path.join(config.projectRoot, "src", "data", "admin-users.json");
}

async function readAdminUsers() {
  try {
    return await readJsonFile(adminUsersPath());
  } catch {
    return seedAdminUsers;
  }
}

export async function authenticateAdmin(email, password) {
  const users = await readAdminUsers();
  const user = users.find(
    (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password && item.isActive !== false,
  );

  return user ?? null;
}

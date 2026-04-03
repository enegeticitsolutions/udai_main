import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/fileStore.js";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  isActive: boolean;
};

function adminUsersPath() {
  return path.join(config.backendDataDir, "admin-users.json");
}

export async function authenticateAdmin(email: string, password: string) {
  const users = await readJsonFile<AdminUser[]>(adminUsersPath());
  return users.find((user) => user.isActive && user.email === email && user.password === password) ?? null;
}

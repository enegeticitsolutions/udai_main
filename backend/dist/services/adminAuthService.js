import path from "node:path";
import { config } from "../config.js";
import { readJsonFile } from "../lib/fileStore.js";
function adminUsersPath() {
    return path.join(config.backendDataDir, "admin-users.json");
}
export async function authenticateAdmin(email, password) {
    const users = await readJsonFile(adminUsersPath());
    return users.find((user) => user.isActive && user.email === email && user.password === password) ?? null;
}

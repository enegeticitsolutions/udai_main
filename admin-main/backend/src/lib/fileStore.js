import fs from "node:fs/promises";
import path from "node:path";

export async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

export async function writeJsonFile(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  } catch (err) {
    if (err && (err.code === "EACCES" || err.code === "EPERM")) {
      try {
        await fs.chmod(filePath, 0o666);
        await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
        return;
      } catch {
        // ignore chmod error and throw original err
      }
    }
    throw err;
  }
}

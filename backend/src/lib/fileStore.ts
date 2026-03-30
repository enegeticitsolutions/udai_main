import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export async function ensureStorageDir() {
  await fs.mkdir(config.storageDir, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function appendRecord<T, P extends object>(
  fileName: string,
  record: P,
): Promise<T> {
  await ensureStorageDir();
  const filePath = path.join(config.storageDir, fileName);

  let current: T[] = [];

  try {
    current = await readJsonFile<T[]>(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }

  const entry = {
    ...record,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  } as unknown as T;

  current.push(entry);
  await fs.writeFile(filePath, JSON.stringify(current, null, 2));

  return entry;
}

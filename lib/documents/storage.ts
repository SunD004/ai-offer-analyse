import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export async function saveFile(
  buffer: Buffer,
  originalName: string
): Promise<{ filename: string; filepath: string }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(originalName);
  const filename = `${nanoid()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filepath, buffer);

  return { filename, filepath };
}

export async function deleteFile(filename: string): Promise<void> {
  const filepath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.unlink(filepath);
  } catch {
    // File may already be deleted
  }
}

export function getFilePath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

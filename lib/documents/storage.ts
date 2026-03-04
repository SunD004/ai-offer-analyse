import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { getSupabaseClient } from "@/lib/supabase-storage";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const BUCKET = "docs";

function isProduction(): boolean {
  return process.env.PRODUCTION === "true";
}

export async function saveFile(
  buffer: Buffer,
  originalName: string
): Promise<{ filename: string; filepath: string }> {
  const ext = path.extname(originalName);
  const filename = `${nanoid()}${ext}`;

  if (isProduction()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: "application/octet-stream" });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return { filename, filepath: filename };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return { filename, filepath };
}

export async function deleteFile(filename: string): Promise<void> {
  if (isProduction()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(BUCKET).remove([filename]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
    return;
  }

  const filepath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.unlink(filepath);
  } catch {
    // File may already be deleted
  }
}

export async function getFileBuffer(filename: string): Promise<Buffer> {
  if (isProduction()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(filename);
    if (error || !data)
      throw new Error(`Supabase download failed: ${error?.message}`);
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const filepath = path.join(UPLOAD_DIR, filename);
  return fs.readFile(filepath);
}

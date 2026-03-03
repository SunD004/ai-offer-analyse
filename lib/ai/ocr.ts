import { Mistral } from "@mistralai/mistralai";
import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xml", ".html"];

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (TEXT_EXTENSIONS.includes(ext)) {
    return fs.readFile(filePath, "utf-8");
  }

  if (ext === ".docx") {
    const fileBuffer = await fs.readFile(filePath);
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    return value;
  }

  if (ext === ".xlsx") {
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return `## ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join("\n\n");
  }

  const fileBuffer = await fs.readFile(filePath);
  const base64 = fileBuffer.toString("base64");

  const mimeType = getMimeType(ext);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const result = await client.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: dataUrl,
    },
  });

  const pages = result.pages ?? [];
  return pages.map((page) => page.markdown).join("\n\n---\n\n");
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

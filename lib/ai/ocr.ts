import { Mistral } from "@mistralai/mistralai";
import path from "path";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xml", ".html"];

export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (TEXT_EXTENSIONS.includes(ext)) {
    return buffer.toString("utf-8");
  }

  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (ext === ".xlsx") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sections: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: "",
      });
      const nonEmptyRows = rows.filter((row) =>
        row.some((cell) => String(cell).trim() !== "")
      );
      if (nonEmptyRows.length === 0) continue;
      const text = nonEmptyRows
        .map((row) =>
          row
            .map((cell) => String(cell).trim())
            .filter(Boolean)
            .join(" | ")
        )
        .filter(Boolean)
        .join("\n");
      sections.push(`## ${sheetName}\n${text}`);
    }
    return sections.join("\n\n") || "No data found in spreadsheet.";
  }

  const base64 = buffer.toString("base64");
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

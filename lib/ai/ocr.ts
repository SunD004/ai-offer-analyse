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
    return extractExcelText(buffer);
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

function formatCellValue(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  // If the cell has a formatted text value, prefer it (handles dates, percentages, etc.)
  if (cell.w !== undefined) return cell.w.trim();
  if (cell.v === undefined || cell.v === null) return "";
  return String(cell.v).trim();
}

function extractExcelText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true, // parse dates as JS Date objects
    cellNF: true, // keep number format
    cellText: true, // generate .w formatted text
  });

  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const totalRows = range.e.r - range.s.r + 1;
    const totalCols = range.e.c - range.s.c + 1;

    if (totalRows === 0 || totalCols === 0) continue;

    // Read all rows with formatted values
    const allRows: string[][] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        row.push(formatCellValue(sheet[addr]));
      }
      allRows.push(row);
    }

    // Remove fully empty rows
    const rows = allRows.filter((row) => row.some((cell) => cell !== ""));
    if (rows.length === 0) continue;

    // Trim trailing empty columns
    let maxCol = 0;
    for (const row of rows) {
      for (let c = row.length - 1; c >= 0; c--) {
        if (row[c] !== "") {
          maxCol = Math.max(maxCol, c);
          break;
        }
      }
    }
    const trimmedRows = rows.map((row) => row.slice(0, maxCol + 1));

    // Detect if first row looks like a header (non-numeric, non-empty)
    const firstRow = trimmedRows[0];
    const looksLikeHeader =
      firstRow.length > 0 &&
      firstRow.filter((c) => c !== "").length >= firstRow.length * 0.5 &&
      firstRow.every((c) => c === "" || isNaN(Number(c)));

    if (looksLikeHeader && trimmedRows.length > 1) {
      // Render as Markdown table
      const headers = firstRow.map((h) => h || "-");
      const separator = headers.map(() => "---");
      const tableLines = [
        `| ${headers.join(" | ")} |`,
        `| ${separator.join(" | ")} |`,
        ...trimmedRows.slice(1).map(
          (row) => {
            // Pad row to header length
            const padded = [...row];
            while (padded.length < headers.length) padded.push("");
            return `| ${padded.join(" | ")} |`;
          }
        ),
      ];
      sections.push(`## ${sheetName}\n\n${tableLines.join("\n")}`);
    } else {
      // No clear header — render as key-value or plain rows
      // Check if it's a 2-column key-value layout
      const is2ColKV =
        maxCol === 1 &&
        trimmedRows.every(
          (row) => row[0] !== "" && isNaN(Number(row[0]))
        );

      if (is2ColKV) {
        const kvLines = trimmedRows.map(
          (row) => `- **${row[0]}** : ${row[1] ?? ""}`
        );
        sections.push(`## ${sheetName}\n\n${kvLines.join("\n")}`);
      } else {
        // Generic: render as Markdown table with column indices as headers
        const colHeaders = Array.from(
          { length: maxCol + 1 },
          (_, i) => `Col ${i + 1}`
        );
        const separator = colHeaders.map(() => "---");
        const tableLines = [
          `| ${colHeaders.join(" | ")} |`,
          `| ${separator.join(" | ")} |`,
          ...trimmedRows.map((row) => {
            const padded = [...row];
            while (padded.length < colHeaders.length) padded.push("");
            return `| ${padded.join(" | ")} |`;
          }),
        ];
        sections.push(`## ${sheetName}\n\n${tableLines.join("\n")}`);
      }
    }
  }

  return sections.join("\n\n---\n\n") || "No data found in spreadsheet.";
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

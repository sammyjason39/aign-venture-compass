// Server-only: turn an uploaded financial workbook (xlsx/xls/csv) into compact
// text that an LLM can read. Uses SheetJS (pure JS, Worker-compatible).
import * as XLSX from "xlsx";

export function isSpreadsheet(name: string, mime: string): boolean {
  return (
    /\.(xlsx|xls|xlsm|csv)$/i.test(name) ||
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    mime === "text/csv"
  );
}

/**
 * Read every sheet and emit a readable CSV-ish dump, one block per sheet.
 * Blank rows are dropped to keep the payload small.
 */
export function extractSpreadsheetText(bytes: Uint8Array): string {
  const wb = XLSX.read(bytes, { type: "array" });
  const blocks: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false, FS: "," });
    const trimmed = csv
      .split("\n")
      .map((l) => l.replace(/,+\s*$/, "").trim())
      .filter((l) => l.replace(/,/g, "").trim().length > 0)
      .join("\n");
    if (trimmed) blocks.push(`### Sheet: ${sheetName}\n${trimmed}`);
  }

  // Guard against runaway payloads.
  return blocks.join("\n\n").slice(0, 60000);
}

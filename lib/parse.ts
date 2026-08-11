import ExcelJS from "exceljs";
import {
  COLUMN_MAP,
  REQUIRED_COLUMNS,
  REQUIRED_EMAIL_COLUMNS,
  KNOWN_COLUMNS,
  normalizeSport,
  skillColumnFor,
} from "./column-map";
import type { IncomingRow } from "./types";

export interface ParseResult {
  ok: boolean;
  /** Populated only when required columns are structurally missing. */
  missingColumns?: string[];
  rows: IncomingRow[];
  /** Rows with no usable name AND no usable email — excluded from `rows`. */
  unusableRowCount: number;
}

function cellText(row: ExcelJS.Row, colIndex: number | undefined): string {
  if (!colIndex) return "";
  const cell = row.getCell(colIndex);
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export async function parseRosterFile(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, missingColumns: [...REQUIRED_COLUMNS, "Email Address"], rows: [], unusableRowCount: 0 };
  }

  const headerRow = sheet.getRow(1);
  const headerToCol = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value ?? "").trim();
    if (text) headerToCol.set(text, colNumber);
  });

  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headerToCol.has(c));
  const hasEmailColumn = REQUIRED_EMAIL_COLUMNS.some((c) => headerToCol.has(c));
  if (missingRequired.length > 0 || !hasEmailColumn) {
    return {
      ok: false,
      missingColumns: [...missingRequired, ...(hasEmailColumn ? [] : ["Email Address"])],
      rows: [],
      unusableRowCount: 0,
    };
  }

  const rows: IncomingRow[] = [];
  let unusableRowCount = 0;

  const col = (key: keyof typeof COLUMN_MAP) => headerToCol.get(COLUMN_MAP[key]);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.actualCellCount === 0) return;

    const firstName = cellText(row, col("firstName"));
    const lastName = cellText(row, col("lastName"));
    const email = cellText(row, col("email")) || cellText(row, col("emailSecondary"));

    const hasName = firstName.trim().length > 0 || lastName.trim().length > 0;
    const hasEmail = email.trim().length > 0;
    if (!hasName && !hasEmail) {
      unusableRowCount += 1;
      return;
    }

    const sportRaw = cellText(row, col("sportSelected"));
    const sportSelected = normalizeSport(sportRaw);
    const skillCol = skillColumnFor(sportRaw);
    const skillLevel = skillCol ? cellText(row, headerToCol.get(skillCol)) : "";

    const raw: Record<string, string> = {};
    headerToCol.forEach((colNumber, header) => {
      if (KNOWN_COLUMNS.has(header)) return;
      const text = cellText(row, colNumber);
      if (text) raw[header] = text;
    });

    rows.push({
      rowIndex: rowNumber,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      gender: cellText(row, col("gender")) || undefined,
      civilStatus: cellText(row, col("civilStatus")) || undefined,
      dgroupMemberStatus: (cellText(row, col("dgroupMemberStatus")) || undefined) as IncomingRow["dgroupMemberStatus"],
      dgroupStatus: (cellText(row, col("dgroupStatus")) || undefined) as IncomingRow["dgroupStatus"],
      dgroupInterestedInJoining: (cellText(row, col("dgroupInterestedInJoining")) || undefined) as IncomingRow["dgroupInterestedInJoining"],
      dgroupLeadingWillingToAbsorb: cellText(row, col("dgroupLeadingWillingToAbsorb")) || undefined,
      churchAffiliation: cellText(row, col("churchAffiliation")) || undefined,
      sportSelected: sportSelected || "Unspecified",
      skillLevel: skillLevel || undefined,
      firstTimeSelfReported: cellText(row, col("firstTimeSelfReported")) || undefined,
      submittedAt: cellText(row, col("timestamp")) || new Date().toISOString(),
      raw,
    });
  });

  return { ok: true, rows, unusableRowCount };
}

export type CsvRow = Record<string, string>;

function splitLines(text: string): string[] {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/);
}

function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) ?? []).length;
  const comma = (headerLine.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  out.push(field);
  return out.map((value) => value.trim());
}

/** Parses a simple CSV (comma or semicolon separated, optional quotes) into keyed rows. */
export function parseCsv(text: string): CsvRow[] {
  const lines = splitLines(text).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

/** Accepts YYYY-MM-DD or DD.MM.YYYY and returns ISO date or "" when empty/invalid. */
export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const german = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (german) {
    const [, d, m, y] = german;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return "";
}

export function normalizeBoolean(value: string, fallback = true): boolean {
  const v = value.trim().toLowerCase();
  if (v === "") return fallback;
  return ["ja", "true", "1", "yes", "y", "aktiv"].includes(v);
}

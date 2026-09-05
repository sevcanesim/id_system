// Bağımlılıksız, minimal CSV/TSV ayrıştırıcı. Excel'in Türkçe yerel ayarda
// varsayılan olarak noktalı virgül (;) kullanmasını da desteklemek için
// ayraç, başlık satırından otomatik tespit edilir (virgül vs noktalı
// virgül sayımı). RFC 4180'e yakın: çift tırnaklı alanlar, tırnak içinde
// kaçışlı çift tırnak (""), CRLF/LF, baştaki UTF-8 BOM.

export function detectDelimiter(headerLine: string): "," | ";" {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Bir CSV metnini satır/sütun dizisine çevirir. Boş satırlar atlanır.
export function parseCsv(text: string, delimiter?: "," | ";"): string[][] {
  const normalized = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = normalized.split("\n", 1)[0] || "";
  const sep = delimiter || detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };
  while (i < normalized.length) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === sep) {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/**
 * Turkish Excel expects a semicolon-delimited file and otherwise tends to put
 * a whole comma-delimited row into column A. The BOM makes UTF-8 Turkish
 * characters unambiguous when a downloaded CSV is opened directly in Excel.
 */
export function createExcelCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined) => {
    const raw = String(value ?? "");
    // Protect user-provided cells from being interpreted as an Excel formula
    // when the report or failed-row file is opened.
    const safe = typeof value === "string" && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  };

  return `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`;
}

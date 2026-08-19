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

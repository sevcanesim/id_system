import { parseCsv } from "../csv";
import { normalizeEmailField } from "../form-standards";

export type BulkInviteRole = "ADMIN" | "HR" | "EMPLOYEE";

export type BulkInviteRow = {
  line: number;
  email: string;
  fullName: string;
  title: string;
  department: string;
  role: BulkInviteRole;
};

export type BulkInviteRowError = {
  line: number;
  raw: string[];
  error: string;
};

export type BulkInviteParseResult = {
  rows: BulkInviteRow[];
  errors: BulkInviteRowError[];
  duplicateEmails: string[];
};

const HEADER_ALIASES: Record<string, string> = {
  email: "email",
  eposta: "email",
  "e-posta": "email",
  "e posta": "email",
  mail: "email",
  ad: "firstName",
  isim: "firstName",
  firstname: "firstName",
  soyad: "lastName",
  soyisim: "lastName",
  lastname: "lastName",
  "ad soyad": "fullName",
  "adsoyad": "fullName",
  fullname: "fullName",
  unvan: "title",
  "ünvan": "title",
  title: "title",
  departman: "department",
  department: "department",
  rol: "role",
  role: "role",
};

const ROLE_ALIASES: Record<string, BulkInviteRole> = {
  admin: "ADMIN",
  yönetici: "ADMIN",
  "kurumsal yönetici": "ADMIN",
  "kurumsal yonetici": "ADMIN",
  ik: "HR",
  hr: "HR",
  "i̇nsan kaynakları": "HR",
  "insan kaynaklari": "HR",
  "ik yöneticisi": "HR",
  "ik yoneticisi": "HR",
  çalışan: "EMPLOYEE",
  calisan: "EMPLOYEE",
  employee: "EMPLOYEE",
  "": "EMPLOYEE",
};

function normalizeHeaderKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CSV metnini şirket davet satırlarına çevirir. Beklenen sütunlar (herhangi
// bir sırada, Türkçe/İngilizce başlık takma adları desteklenir):
// E-posta (zorunlu) + (Ad Soyad) VEYA (Ad + Soyad) (zorunlu) + Ünvan,
// Departman, Rol (opsiyonel, varsayılan Çalışan). Satır numaraları başlık
// dahil 1'den başlar (kullanıcının Excel'de gördüğü satır numarasıyla eşleşir).
export function parseBulkInviteCsv(text: string): BulkInviteParseResult {
  const table = parseCsv(text);
  const rows: BulkInviteRow[] = [];
  const errors: BulkInviteRowError[] = [];
  const seen = new Map<string, number>();
  const duplicateEmails: string[] = [];

  if (table.length === 0) return { rows, errors, duplicateEmails };

  const header = table[0].map(normalizeHeaderKey);
  const columnIndex: Record<string, number> = {};
  header.forEach((cell, index) => {
    const mapped = HEADER_ALIASES[cell];
    if (mapped && columnIndex[mapped] === undefined) columnIndex[mapped] = index;
  });

  if (columnIndex.email === undefined) {
    errors.push({ line: 1, raw: table[0], error: "E-posta sütunu bulunamadı. Başlık satırında 'E-posta' veya 'Email' olmalı." });
    return { rows, errors, duplicateEmails };
  }

  for (let i = 1; i < table.length; i += 1) {
    const raw = table[i];
    const line = i + 1;
    const get = (key: string) => (columnIndex[key] !== undefined ? (raw[columnIndex[key]] || "").trim() : "");

    const email = normalizeEmailField(get("email"));
    if (!email) {
      errors.push({ line, raw, error: "E-posta boş." });
      continue;
    }
    if (!EMAIL_PATTERN.test(email)) {
      errors.push({ line, raw, error: `Geçersiz e-posta: "${email}".` });
      continue;
    }

    let fullName = get("fullName");
    if (!fullName) {
      const firstName = get("firstName");
      const lastName = get("lastName");
      fullName = `${firstName} ${lastName}`.trim();
    }
    if (fullName.length < 2) {
      errors.push({ line, raw, error: "Ad Soyad en az 2 karakter olmalı." });
      continue;
    }

    const roleRaw = normalizeHeaderKey(get("role"));
    const role = ROLE_ALIASES[roleRaw];
    if (roleRaw && !role) {
      errors.push({ line, raw, error: `Tanınmayan rol: "${get("role")}". Geçerli değerler: Çalışan, İK Yöneticisi, Kurumsal Yönetici.` });
      continue;
    }

    if (seen.has(email)) {
      duplicateEmails.push(email);
      errors.push({ line, raw, error: `Bu dosyada tekrar eden e-posta (ilk geçtiği satır: ${seen.get(email)}).` });
      continue;
    }
    seen.set(email, line);

    rows.push({
      line,
      email,
      fullName,
      title: get("title"),
      department: get("department"),
      role: role || "EMPLOYEE",
    });
  }

  return { rows, errors, duplicateEmails };
}

export const BULK_INVITE_CSV_TEMPLATE =
  "E-posta,Ad,Soyad,Ünvan,Departman,Rol\nmehmet.yilmaz@firma.com,Mehmet,Yılmaz,Satış Uzmanı,Satış,Çalışan\nayse.kaya@firma.com,Ayşe,Kaya,İnsan Kaynakları Uzmanı,İnsan Kaynakları,İK\n";

export const BULK_INVITE_MAX_ROWS = 200;

export function isBulkInviteMailFailed(row: { status: "created" | "error"; emailSent?: boolean }) {
  return row.status === "created" && row.emailSent === false;
}

export function summarizeBulkInviteResults(
  results: Array<{ status: "created" | "error"; emailSent?: boolean }>,
) {
  return {
    created: results.filter((row) => row.status === "created").length,
    failed: results.filter((row) => row.status === "error").length,
    mailFailed: results.filter(isBulkInviteMailFailed).length,
  };
}

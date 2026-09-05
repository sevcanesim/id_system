import { describe, expect, it } from "vitest";
import { parseCsv } from "../csv";
import { BULK_INVITE_CSV_TEMPLATE, parseBulkInviteCsv } from "./bulk-invite";

describe("Excel-compatible bulk invite CSV", () => {
  it("downloads as a Turkish Excel CSV and imports back without losing columns or diacritics", () => {
    const bytes = new TextEncoder().encode(BULK_INVITE_CSV_TEMPLATE);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(BULK_INVITE_CSV_TEMPLATE).toContain("E-posta;Ad;Soyad;Ünvan;Departman;Rol\r\n");

    const rawTable = parseCsv(BULK_INVITE_CSV_TEMPLATE);
    expect(rawTable[0]).toEqual(["E-posta", "Ad", "Soyad", "Ünvan", "Departman", "Rol"]);
    expect(rawTable[1]?.[2]).toBe("Yılmaz");
    expect(rawTable[2]?.[1]).toBe("Ayşe");

    const parsed = parseBulkInviteCsv(BULK_INVITE_CSV_TEMPLATE);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toMatchObject([
      { email: "mehmet.yilmaz@firma.com", fullName: "Mehmet Yılmaz", role: "EMPLOYEE" },
      { email: "ayse.kaya@firma.com", fullName: "Ayşe Kaya", role: "HR" },
    ]);
  });
});

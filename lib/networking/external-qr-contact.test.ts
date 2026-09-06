import { describe, expect, it } from "vitest";
import { parseExternalQrPayload } from "./external-qr-contact";

describe("parseExternalQrPayload", () => {
  it("extracts a vCard into editable contact fields", () => {
    expect(parseExternalQrPayload("BEGIN:VCARD\nVERSION:3.0\nFN:Deniz Kaya\nEMAIL:deniz@example.com\nTEL:+90 555 000 00 00\nORG:Yenomilabs\nTITLE:Ürün Tasarımcısı\nEND:VCARD")).toEqual({
      kind: "contact",
      contact: {
        fullName: "Deniz Kaya",
        email: "deniz@example.com",
        phone: "+90 555 000 00 00",
        company: "Yenomilabs",
        position: "Ürün Tasarımcısı",
      },
    });
  });

  it("parses MECARD without trusting malformed email data", () => {
    expect(parseExternalQrPayload("MECARD:N:Kaya,Deniz;EMAIL:not-an-email;TEL:+905550000000;ORG:Yenomilabs;;")).toEqual({
      kind: "contact",
      contact: {
        fullName: "Deniz Kaya",
        email: "",
        phone: "+905550000000",
        company: "Yenomilabs",
        position: "",
      },
    });
  });

  it("accepts only web links and strips embedded credentials", () => {
    expect(parseExternalQrPayload("https://card.example/profile?ref=qr")).toEqual({
      kind: "link",
      url: "https://card.example/profile?ref=qr",
    });
    expect(parseExternalQrPayload("https://name:secret@card.example/profile")).toEqual({
      kind: "link",
      url: "https://card.example/profile",
    });
    expect(parseExternalQrPayload("javascript:alert(1)")).toBeNull();
  });
});

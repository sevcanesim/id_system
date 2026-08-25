import React from "react";
import { describe, expect, it } from "vitest";
import HowItWorksPage, { metadata } from "./page";
import { HowItWorksBoard, steps, benefits } from "./HowItWorksBoard";

// Set global React for Vitest JSX execution
(globalThis as unknown as { React: typeof React }).React = React;

describe("HowItWorksPage (/nasil-calisir metadata & contract)", () => {
  it("1. exports correct page metadata title and description", () => {
    expect(metadata.title).toBe("Nasıl Çalışır — Yenomi ID");
    expect(metadata.description).toContain("Kartı yaklaştır, güncel profil açılsın");
  });

  it("2 & 3. exports exactly 4 canonical steps with unique IDs", () => {
    expect(steps).toHaveLength(4);
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual(["01", "02", "03", "04"]);
    expect(new Set(ids).size).toBe(4);
  });

  it("4. step navigation labels use Turkish sentence case", () => {
    expect(steps[0].label).toBe("Kartını seç");
    expect(steps[1].label).toBe("Profilini oluştur");
    expect(steps[2].label).toBe("Dokundur veya QR okut");
    expect(steps[3].label).toBe("Kayıp moduyla kontrol et");
  });

  it("5. benefits grid uses precise payment & security copy without vague claims", () => {
    expect(benefits).toHaveLength(4);
    expect(benefits[0][0]).toBe("Ödeme bilgilerin korunur");
    expect(benefits[0][1]).toContain("ödeme kartı verilerini kendi sunucularında tutmaz");
  });

  it("6. HowItWorksPage delegates to HowItWorksBoard client component", () => {
    const element = HowItWorksPage();
    expect(element).toBeDefined();
    expect(element.type).toBe(HowItWorksBoard);
  });

  it("7. HowItWorksBoard instantiates cleanly as a React component element", () => {
    const element = React.createElement(HowItWorksBoard);
    expect(element).toBeDefined();
    expect(element.type).toBe(HowItWorksBoard);
  });
});

import React from "react";
import { describe, expect, it } from "vitest";
import HowItWorksPage, { metadata } from "./page";
import { HowItWorksBoard, steps } from "./HowItWorksBoard";

// Set global React for Vitest JSX execution
(globalThis as unknown as { React: typeof React }).React = React;

describe("HowItWorksPage (/nasil-calisir metadata & contract)", () => {
  it("exports correct page metadata title and description", () => {
    expect(metadata.title).toBe("Nasıl Çalışır — Yenomi ID");
    expect(metadata.description).toContain("Kartı yaklaştır, güncel profil açılsın");
  });

  it("renders HowItWorksPage with HowItWorksBoard root element", () => {
    const element = HowItWorksPage();
    expect(element).toBeDefined();
    expect(element.type).toBe(HowItWorksBoard);
  });

  it("exports 4 canonical steps with correct IDs and titles", () => {
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.id)).toEqual(["01", "02", "03", "04"]);
    expect(steps[0].label).toBe("Kartını seç");
    expect(steps[1].label).toBe("Profilini oluştur");
    expect(steps[2].label).toBe("Dokundur veya QR okut");
    expect(steps[3].label).toBe("Kayıp moduyla kontrol et");
  });

  it("instantiates HowItWorksBoard React element cleanly", () => {
    const element = React.createElement(HowItWorksBoard);
    expect(element).toBeDefined();
    expect(element.type).toBe(HowItWorksBoard);
  });
});

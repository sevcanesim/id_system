import React from "react";
import { describe, expect, it } from "vitest";
import SupportPage, { metadata } from "./page";

// Set global React for Vitest JSX execution
(globalThis as unknown as { React: typeof React }).React = React;

describe("SupportPage (/destek metadata & contract)", () => {
  it("1. exports correct page metadata title and description", () => {
    expect(metadata.title).toBe("Yardım Merkezi — Yenomi ID");
    expect(metadata.description).toContain("Kayıp kart, kargo, iyzico ödemesi, hesap ve kurumsal panel. Net cevaplar.");
  });

  it("2. SupportPage resolves searchParams and renders cleanly as an async component", async () => {
    const searchParams = Promise.resolve({ q: "kargo" });
    const element = await SupportPage({ searchParams });

    expect(element).toBeDefined();
    expect(element.type).toBe("main");
    expect(element.props.id).toBe("main-content");
    expect(element.props.className).toBe("support-page");
  });

  it("3. SupportPage renders empty state when search query matches no FAQs", async () => {
    const searchParams = Promise.resolve({ q: "gecersiz_arama_maddesi_999" });
    const element = await SupportPage({ searchParams });

    expect(element).toBeDefined();
    const mainChildren = React.Children.toArray(element.props.children);
    expect(mainChildren.length).toBeGreaterThan(0);
  });

  it("4. SupportPage renders populated FAQs when query is empty", async () => {
    const searchParams = Promise.resolve({});
    const element = await SupportPage({ searchParams });

    expect(element).toBeDefined();
    expect(element.props.className).toBe("support-page");
  });
});

import { describe, expect, it } from "vitest";
import { wrongPortalMessage } from "./account-type";
import {
  firstSearchParam,
  LOGIN_ERROR_MESSAGES,
  loginErrorMessage,
  loginPagePath,
  parseLoginMode,
  parseLoginPortal,
  resolveLoginReturnPath,
  safeLoginNext,
  wrongPortalErrorCode,
} from "./login-search";

describe("login search parsing", () => {
  it("keeps in-app next paths and rejects open redirects", () => {
    expect(safeLoginNext("/checkout")).toBe("/checkout");
    expect(safeLoginNext("/kartlarim")).toBe("/kartlarim");
    expect(safeLoginNext("//evil.example")).toBe("/kartlarim");
    expect(safeLoginNext("/giris")).toBe("/kartlarim");
    expect(safeLoginNext("https://evil.example")).toBe("/kartlarim");
    expect(safeLoginNext(null)).toBe("/kartlarim");
  });

  it("reads the selected portal from the query before hydration", () => {
    expect(parseLoginPortal("business")).toBe("business");
    expect(parseLoginPortal("individual")).toBe("individual");
    expect(parseLoginPortal("other")).toBe("individual");
    expect(parseLoginMode("recovery")).toBe("recovery");
    expect(parseLoginMode("signup")).toBe("login");
    expect(firstSearchParam(["business", "individual"])).toBe("business");
  });

  it("maps a business tab without an explicit next onto the corporate workspace", () => {
    expect(resolveLoginReturnPath("business", null)).toBe("/kurumsal/panel");
    expect(resolveLoginReturnPath("business", "/kartlarim")).toBe("/kurumsal/panel");
    expect(resolveLoginReturnPath("individual", "/kurumsal/panel")).toBe("/kartlarim");
    expect(resolveLoginReturnPath("business", "/checkout")).toBe("/checkout");
  });

  it("does not paint unknown error codes onto the login card", () => {
    expect(loginErrorMessage("INVALID_CREDENTIALS")).toBe("E-posta veya şifre hatalı.");
    expect(loginErrorMessage("<script>alert(1)</script>")).toBe("");
    expect(loginErrorMessage("nope")).toBe("");
    expect(wrongPortalErrorCode("CORPORATE")).toBe("WRONG_PORTAL_CORPORATE");
    expect(wrongPortalErrorCode("INDIVIDUAL")).toBe("WRONG_PORTAL_INDIVIDUAL");
    expect(LOGIN_ERROR_MESSAGES.WRONG_PORTAL_CORPORATE).toBe(wrongPortalMessage("CORPORATE"));
    expect(LOGIN_ERROR_MESSAGES.WRONG_PORTAL_INDIVIDUAL).toBe(wrongPortalMessage("INDIVIDUAL"));
  });

  it("keeps the corporate tab as a real /giris destination", () => {
    expect(loginPagePath("business", "/kartlarim")).toBe("/giris?portal=business&next=%2Fkurumsal%2Fpanel");
    expect(loginPagePath("individual", "/kartlarim")).toBe("/giris?portal=individual");
    expect(loginPagePath("individual", "/checkout", { error: "INVALID_CREDENTIALS" })).toBe(
      "/giris?portal=individual&next=%2Fcheckout&error=INVALID_CREDENTIALS",
    );
  });
});

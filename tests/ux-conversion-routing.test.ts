import assert from "node:assert/strict";
import test from "node:test";

import { getCardProfileCompletion } from "../lib/card-profile";
import {
  DEFAULT_BUSINESS_NEXT,
  DEFAULT_INDIVIDUAL_NEXT,
  resolveLoginReturnPath,
  safeLoginNext,
} from "../lib/auth/login-search";

const completeProfile = {
  name: "Sevcan Karadeniz",
  role: "Kurucu",
  company: "Yenomi",
  phone: "+905551112233",
  whatsapp: "+905551112233",
  email: "sevcan@example.com",
  website: "https://example.com",
  linkedin: "https://linkedin.com/in/example",
  instagram: "",
  location: "İzmir",
  image: "https://example.com/avatar.jpg",
};

test("individual login defaults to the active card workspace", () => {
  assert.equal(DEFAULT_INDIVIDUAL_NEXT, "/kartim");
  assert.equal(safeLoginNext(undefined), "/kartim");
  assert.equal(resolveLoginReturnPath("individual", "/kartlarim"), "/kartim");
});

test("business login keeps the corporate workspace and explicit commerce targets", () => {
  assert.equal(DEFAULT_BUSINESS_NEXT, "/kurumsal/panel");
  assert.equal(resolveLoginReturnPath("business", "/hesabim"), "/kurumsal/panel");
  assert.equal(resolveLoginReturnPath("individual", "/checkout"), "/checkout");
  assert.equal(resolveLoginReturnPath("business", "/checkout"), "/checkout");
});

test("profile completion is derived from canonical required fields", () => {
  const completion = getCardProfileCompletion({ ...completeProfile, image: "" });

  assert.equal(completion.percent, 80);
  assert.equal(completion.isComplete, false);
  assert.deepEqual(completion.missing.map((item) => item.key), ["image"]);
});

test("recommended fields guide polish without lowering core completion", () => {
  const completion = getCardProfileCompletion({
    ...completeProfile,
    whatsapp: "",
    location: "",
  });

  assert.equal(completion.percent, 100);
  assert.equal(completion.isComplete, true);
  assert.deepEqual(completion.recommended.map((item) => item.key), ["whatsapp", "location"]);
});

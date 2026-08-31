import fs from "node:fs";

function update(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No change applied to ${path}`);
  fs.writeFileSync(path, after);
}

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`Missing pattern: ${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Pattern not unique: ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

update("app/api/commerce/checkout/route.ts", (source) => {
  let next = source;
  const importAnchor = 'import { checkoutAttemptRateLimit } from "../../../../lib/security/rate-limit";';
  if (!next.includes('from "../../../../lib/commerce/checkout-resume"')) {
    next = replaceOnce(
      next,
      importAnchor,
      `${importAnchor}\nimport { checkoutResumeExpiry } from "../../../../lib/commerce/checkout-resume";`,
      "checkout resume import",
    );
  }

  const marker = '    const { data: openAttempt } = await admin\n      .from("commerce_payment_attempts")';
  const block = `    const resumeExpiresAt = checkoutResumeExpiry();\n    const { error: resumeSessionError } = await admin.from("commerce_checkout_sessions").upsert({\n      order_id: order.id,\n      expires_at: resumeExpiresAt.toISOString(),\n      updated_at: new Date().toISOString(),\n      draft_payload: {\n        items: calculated.map((item) => ({\n          productId: item.product.slug,\n          variantSku: item.variant.sku,\n          kind: item.product.kind,\n          name: item.product.name,\n          unitPriceKurus: item.unitPriceKurus,\n          quantity: item.quantity,\n          configuration: item.configuration || {},\n        })),\n        form: {\n          recipientName: body.customer.name.trim(),\n          email: normalizedEmail,\n          phone: body.customer.phone,\n          addressLine: shipping.addressLine,\n          district: shipping.district,\n          city: shipping.city,\n          postalCode: shipping.postalCode || "",\n          deliveryNote: shipping.deliveryNote || "",\n          latitude: shipping.latitude,\n          longitude: shipping.longitude,\n          companyName: company?.name || "",\n          companyTaxNumber: company?.taxNumber || "",\n          companyTaxOffice: company?.taxOffice || "",\n        },\n      },\n    }, { onConflict: "order_id" });\n    if (resumeSessionError) {\n      console.error("checkout resume snapshot could not be persisted", {\n        orderId: order.id,\n        message: resumeSessionError.message,\n      });\n    }\n\n${marker}`;
  if (!next.includes("checkout resume snapshot could not be persisted")) {
    next = replaceOnce(next, marker, block, "checkout snapshot insertion");
  }
  return next;
});

update("app/checkout/page.tsx", (source) => {
  let next = source;
  next = replaceOnce(
    next,
    'import { readCart, type CartItem } from "../../lib/cart";',
    'import { readCart, writeCart, type CartItem } from "../../lib/cart";',
    "checkout cart import",
  );
  const bootstrapImport = 'import { bootstrapAuthenticatedCheckout } from "../../lib/commerce/checkout-session-bootstrap";';
  next = replaceOnce(
    next,
    bootstrapImport,
    `${bootstrapImport}\nimport { parseCheckoutResumeDraft } from "../../lib/commerce/checkout-resume-draft";`,
    "checkout resume draft import",
  );

  const oldEffect = `  useEffect(() => {\n    const supabase = getSupabaseBrowserClient();\n    if (!supabase) {\n      setCheckoutReady(true);\n      return;\n    }\n    void supabase.auth.getSession().then(({ data }) => bootstrapAuthenticatedCheckout(data.session, { setForm, setItems, setIsAuthenticated, setOrganizationTargets, setCheckoutReady }));\n  }, []);`;
  const newEffect = `  useEffect(() => {\n    let cancelled = false;\n    const resumeToken = new URLSearchParams(window.location.search).get("resume");\n    void (async () => {\n      const supabase = getSupabaseBrowserClient();\n      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };\n      await bootstrapAuthenticatedCheckout(data.session, {\n        setForm,\n        setItems,\n        setIsAuthenticated,\n        setOrganizationTargets,\n        setCheckoutReady: resumeToken ? () => undefined : setCheckoutReady,\n      });\n      if (cancelled || !resumeToken) return;\n\n      try {\n        const response = await fetch(\`/api/commerce/checkout/resume?token=\${encodeURIComponent(resumeToken)}\`, {\n          credentials: "same-origin",\n          cache: "no-store",\n        });\n        const payload = await response.json();\n        if (!response.ok) throw new Error(payload.error || "Sipariş taslağı yüklenemedi.");\n        const draft = parseCheckoutResumeDraft(payload.draft);\n        if (!draft || typeof payload.orderId !== "string") throw new Error("Sipariş taslağı doğrulanamadı.");\n        writeCart(draft.items);\n        setItems(draft.items);\n        setPendingCheckoutOrderId(payload.orderId);\n        setForm((current) => ({\n          ...current,\n          ...draft.form,\n          identityNumber: "",\n          distanceSalesAccepted: false,\n          personalizationAccepted: false,\n        }));\n        setActiveStep("buyer");\n        setToast("Sepetin ve teslimat bilgilerin geri yüklendi. Kimlik numaranı ve onaylarını yeniden girerek devam edebilirsin.");\n        window.history.replaceState(null, "", "/checkout");\n      } catch (error) {\n        setMessage(error instanceof Error ? error.message : "Sipariş taslağı yüklenemedi.");\n      } finally {\n        if (!cancelled) setCheckoutReady(true);\n      }\n    })();\n    return () => { cancelled = true; };\n  }, []);`;
  next = replaceOnce(next, oldEffect, newEffect, "checkout bootstrap effect");
  return next;
});

update("app/kurumsal/panel/CorporatePanelClient.tsx", (source) => {
  return replaceOnce(
    source,
    `          rows: bulkInvitePreview.rows.slice(0, BULK_INVITE_MAX_ROWS).map((row) => ({\n            email: row.email,`,
    `          rows: bulkInvitePreview.rows.slice(0, BULK_INVITE_MAX_ROWS).map((row) => ({\n            line: row.line,\n            email: row.email,`,
    "bulk invite source line",
  );
});

update("app/kurumsal/panel/components/EmployeesPanel.tsx", (source) => {
  let next = source;
  next = replaceOnce(
    next,
    `  bulkInviteResults: {\n    created: number;\n    failed: number;`,
    `  bulkInviteResults: {\n    created: number;\n    failed: number;\n    failedRowsCsvUrl?: string;\n    auditHealthy?: boolean;`,
    "bulk invite result type",
  );
  next = replaceOnce(
    next,
    `                </p>\n                {bulkMailFailed.length > 0 && (`,
    `                </p>\n                {bulkInviteResults.failedRowsCsvUrl && (bulkInviteResults.failed > 0 || bulkMailFailed.length > 0) && (\n                  <a className="p11-secondary" href={bulkInviteResults.failedRowsCsvUrl}>Başarısız kayıtları CSV indir</a>\n                )}\n                {bulkInviteResults.auditHealthy === false && (\n                  <p role="alert">Davetler işlendi ancak audit kayıtlarının bir kısmı doğrulanamadı. Operasyon ekibinin incelemesi gerekiyor.</p>\n                )}\n                {bulkMailFailed.length > 0 && (`,
    "bulk invite report link",
  );
  return next;
});

fs.unlinkSync(new URL(import.meta.url));
console.log("PASS — commerce resilience codemod applied");

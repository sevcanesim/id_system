import fs from 'node:fs';

const legalFiles = ['app/gizlilik/page.tsx','app/mesafeli-satis-sozlesmesi/page.tsx','app/iade-iptal/page.tsx'];
const banned = [/\[Şirket unvanı/i,/\[Ticaret unvanı/i,/\[Vergi kimlik/i,/\[Tebligata/i,/genel bir taslak/i,/hazırlanmış bir taslaktır/i,/yürürlük tarihiyle güncellenmelidir/i];
for (const file of legalFiles) {
  const text = fs.readFileSync(file,'utf8');
  for (const pattern of banned) if (pattern.test(text)) throw new Error(`${file}: hukuki placeholder/taslak ifadesi kaldı: ${pattern}`);
}
for (const file of ['docs/phase0/OPERATIONS_RUNBOOK.md','docs/phase0/CUSTOMER_INCIDENT_EMAIL_TEMPLATES.md','docs/phase0/SECRET_ROTATION_CHECKLIST.md','docs/phase0/RUNTIME_ACCEPTANCE.md','lib/config/legal-identity.ts','app/api/admin/commerce/reconciliation/route.ts']) {
  if (!fs.existsSync(file)) throw new Error(`Faz 0 artefaktı eksik: ${file}`);
}

const orderPage = fs.readFileSync('app/nfc-siparis/page.tsx','utf8');
if (!orderPage.includes('distanceSalesAccepted') || !orderPage.includes('personalizationAccepted')) {
  throw new Error('Checkout zorunlu sözleşme ve kişiselleştirme onaylarını ayrı state olarak tutmalı.');
}
if (orderPage.includes('consentAccepted')) {
  throw new Error('Checkout tek birleşik consent state kullanmamalı.');
}
if (!orderPage.includes('Gizlilik ve KVKK Aydınlatma Metni') || !orderPage.includes('ayrı bir pazarlama izni anlamına gelmez')) {
  throw new Error('Checkout gizlilik bilgilendirmesini zorunlu sözleşme onayından ayırmalı.');
}
const refundPage = fs.readFileSync('app/iade-iptal/page.tsx','utf8');
if (/hello@yenomilabs\.com/i.test(refundPage)) {
  throw new Error('İade/iptal sayfasında eski hardcoded destek e-postası kaldı.');
}
const prodVerifier = fs.readFileSync('scripts/verify-production-env.mjs','utf8');
for (const key of ['LEGAL_ENTITY_TYPE','LEGAL_TAX_OFFICE','LEGAL_AUTHORIZED_PERSON','LEGAL_PHONE','LEGAL_WEBSITE','LEGAL_PAYMENT_PROVIDER','LEGAL_INVOICE_PROVIDER']) {
  if (!prodVerifier.includes(`'${key}'`)) throw new Error(`Production legal env gate eksik: ${key}`);
}
const legalIdentity = fs.readFileSync('lib/config/legal-identity.ts','utf8');
if (/OPSOLA|6440962576|0644096257600001|\+90 555 834 2672|www\.opsola\.com/i.test(legalIdentity)) {
  throw new Error('Yenomi ID hukuk kimliğinde başka bir işletmeye ait fallback bulunamaz.');
}

console.log('Roadmap Faz 0 static sözleşmesi BAŞARILI.');

const reconciliationRoute = fs.readFileSync('app/api/admin/commerce/reconciliation/route.ts','utf8');
for (const marker of ['PAID_ORDER_WITHOUT_PAID_ATTEMPT','PAID_ATTEMPT_ORDER_NOT_PAID','FULFILLMENT_REVIEW_REQUIRED','COMMERCE_RECONCILIATION_ISSUE_RESOLVED']) {
  if (!reconciliationRoute.includes(marker)) throw new Error(`Reconciliation kontrolü eksik: ${marker}`);
}

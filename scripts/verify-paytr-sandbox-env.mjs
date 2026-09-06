const env = process.env;
const required = ['PAYTR_MERCHANT_ID', 'PAYTR_MERCHANT_KEY', 'PAYTR_MERCHANT_SALT', 'PAYTR_PRESENTATION_ENCRYPTION_KEY', 'NEXT_PUBLIC_SITE_URL'];
const missing = required.filter((key) => !String(env[key] || '').trim());

if (missing.length) {
  console.error(`PayTR sandbox env eksik: ${missing.join(', ')}`);
  process.exit(1);
}

if (String(env.PAYTR_TEST_MODE).toLowerCase() !== 'true') {
  console.error('PayTR sandbox doğrulaması için PAYTR_TEST_MODE=true olmalı.');
  process.exit(1);
}

if (!/^[A-Za-z0-9_-]{43}$/.test(String(env.PAYTR_PRESENTATION_ENCRYPTION_KEY || '').trim())) {
  console.error('PAYTR_PRESENTATION_ENCRYPTION_KEY 32 baytlık base64url anahtar olmalı.');
  process.exit(1);
}

const callbackBase = String(env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, '');
if (!/^https:\/\//.test(callbackBase) && !/^http:\/\/localhost(?::\d+)?$/i.test(callbackBase)) {
  console.error('NEXT_PUBLIC_SITE_URL PayTR callback için HTTPS public URL veya localhost olmalı.');
  process.exit(1);
}

console.log(`PayTR sandbox env kontrolü BAŞARILI (${callbackBase}).`);

const env = process.env;
const required = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL', 'NEXT_PUBLIC_SITE_URL'];
const missing = required.filter((key) => !String(env[key] || '').trim());
if (missing.length) {
  console.error(`Iyzico sandbox env eksik: ${missing.join(', ')}`);
  process.exit(1);
}
const base = String(env.IYZICO_BASE_URL).replace(/\/$/, '');
if (base !== 'https://sandbox-api.iyzipay.com') {
  console.error('Iyzico sandbox doğrulaması için IYZICO_BASE_URL=https://sandbox-api.iyzipay.com olmalı.');
  process.exit(1);
}
const callbackBase = String(env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, '');
if (!/^https:\/\//.test(callbackBase) && !/^http:\/\/localhost(?::\d+)?$/i.test(callbackBase)) {
  console.error('NEXT_PUBLIC_SITE_URL sandbox callback için HTTPS public URL veya localhost olmalı.');
  process.exit(1);
}
console.log(`Iyzico sandbox env kontrolü BAŞARILI (${callbackBase}).`);

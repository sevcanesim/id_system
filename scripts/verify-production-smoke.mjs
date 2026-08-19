const base = String(process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/i.test(base)) {
  console.error('Production smoke BAŞARISIZ: NEXT_PUBLIC_SITE_URL gerçek HTTPS production domain olmalı.');
  process.exit(1);
}

const targets = ['/', '/giris', '/urunler', '/urunler/nfc-kart', '/robots.txt'];
const attempts = 6;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(path) {
  let last = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        redirect: 'follow',
        headers: { 'user-agent': 'yenomi-faz10-production-smoke/1.0' },
      });
      last = { status: response.status, url: response.url };
      if (response.status >= 200 && response.status < 400) return last;
    } catch (error) {
      last = { error: error instanceof Error ? error.message : String(error) };
    }
    if (i < attempts) await sleep(5000);
  }
  return last;
}

let failed = false;
for (const path of targets) {
  const result = await fetchWithRetry(path);
  if (!result || result.error || !(result.status >= 200 && result.status < 400)) {
    console.error(`FAIL  ${path} -> ${result?.error || result?.status || 'no response'}`);
    failed = true;
  } else {
    console.log(`PASS  ${path} -> ${result.status}`);
  }
}

if (failed) {
  console.error('\nProduction smoke BAŞARISIZ. Deploy promotion tamamlanmış sayılmamalı.');
  process.exit(1);
}
console.log(`\nProduction smoke BAŞARILI (${base}).`);

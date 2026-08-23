const base = String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/i.test(base)) {
  console.error("Production smoke BAŞARISIZ: NEXT_PUBLIC_SITE_URL gerçek HTTPS production domain olmalı.");
  process.exit(1);
}

const attempts = 6;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(path) {
  let last = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        redirect: "follow",
        headers: { "user-agent": "yenomi-faz10-production-smoke/1.0" },
      });
      const headers = Object.fromEntries(response.headers.entries());
      const text = await response.text();
      last = { status: response.status, url: response.url, headers, text };
      if (response.status >= 200 && response.status < 400) return last;
    } catch (error) {
      last = { error: error instanceof Error ? error.message : String(error) };
    }
    if (i < attempts) await sleep(5000);
  }
  return last;
}

function header(result, name) {
  const headers = result.headers || {};
  return headers[name] || headers[name.toLowerCase()] || "";
}

function cspNonce(result) {
  return (header(result, "content-security-policy").match(/'nonce-([^']+)'/) || [])[1] || "";
}

let failed = false;
function pass(message) {
  console.log(`PASS  ${message}`);
}
function fail(message) {
  console.error(`FAIL  ${message}`);
  failed = true;
}

const reach = ["/", "/giris", "/urunler", "/urunler/nfc-kart", "/nasil-calisir", "/kurumsal", "/checkout", "/robots.txt", "/sitemap.xml"];
const documents = {};

for (const path of reach) {
  const result = await fetchWithRetry(path);
  if (!result || result.error || !(result.status >= 200 && result.status < 400)) {
    fail(`${path} -> ${result?.error || result?.status || "no response"}`);
    continue;
  }
  documents[path] = result;
  pass(`${path} -> ${result.status}`);
}

for (const path of ["/", "/giris", "/checkout", "/urunler"]) {
  const result = documents[path];
  if (!result) continue;
  const nonce = cspNonce(result);
  const html = result.text || "";
  if (!nonce) fail(`${path} CSP has no script nonce`);
  else if (!html.includes(`nonce="${nonce}"`)) fail(`${path} HTML does not stamp CSP nonce (static HIT + strict-dynamic blocks Next)`);
  else pass(`${path} HTML stamps matching CSP nonce`);
  const cache = header(result, "cache-control");
  if (!/no-store/i.test(cache)) fail(`${path} document Cache-Control must be no-store so a CDN HIT cannot pair old HTML with a new nonce`);
  else pass(`${path} document is no-store`);
}

const home = documents["/"]?.text || "";
if (home.includes("yi-menu")) pass("homepage includes the public hamburger control");
else fail("homepage missing button.yi-menu");

const how = documents["/nasil-calisir"]?.text || "";
if (how.includes("how-steps-board")) pass("/nasil-calisir ships the merged how-steps-board");
else fail("/nasil-calisir missing how-steps-board (stale 4-up still live)");

const corporate = documents["/kurumsal"]?.text || "";
if (corporate.includes("/kurumsal?plan=CAMPAIGN-MAIL#teklif") || /<h2[^>]*>\s*Campaign Mail\s*</i.test(corporate)) {
  fail("/kurumsal still merchandises Campaign Mail as a public sales card");
} else {
  pass("/kurumsal does not merchandise a Campaign Mail sales card");
}

const sitemap = documents["/sitemap.xml"]?.text || "";
for (const path of ["/", "/nasil-calisir", "/kurumsal", "/destek"]) {
  const loc = path === "/" ? `<loc>${base}</loc>` : `<loc>${base}${path}</loc>`;
  if (sitemap.includes(loc)) pass(`sitemap lists ${path} on ${base}`);
  else fail(`sitemap missing ${loc}`);
}

if (failed) {
  console.error("\nProduction smoke BAŞARISIZ. Deploy promotion tamamlanmış sayılmamalı.");
  process.exit(1);
}
console.log(`\nProduction smoke BAŞARILI (${base}).`);

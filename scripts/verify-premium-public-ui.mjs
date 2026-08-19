import fs from 'node:fs';
const files = [
  'app/design-tokens.css',
  'app/LandingClient.tsx',
  'app/urunler/page.tsx',
  'app/urunler/nfc-kart/page.tsx',
  'app/kurumsal/page.tsx',
  'app/layout.tsx',
];
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Missing premium UI file: ${file}`);
}
const layout = fs.readFileSync('app/layout.tsx','utf8');
if (!layout.includes('design-tokens.css')) throw new Error('Canonical design token layer is not imported.');
const css = fs.readFileSync('app/design-tokens.css','utf8');
const routeCss = fs.readFileSync('app/public-conversion.css','utf8');
const commerceCss = fs.readFileSync('app/commerce-flow.css','utf8');
const authCss = fs.readFileSync('app/auth-flow.css','utf8');
for (const token of ['.p4-public-home','@media(max-width:760px)','prefers-reduced-motion']) {
  if (!routeCss.includes(token)) throw new Error(`Premium UI contract missing: ${token}`);
}
for (const token of ['.p6-auth-page','prefers-reduced-motion']) {
  if (!authCss.includes(token)) throw new Error(`Premium auth UI contract missing: ${token}`);
}
for (const token of ['.p5-product-page','.p5-cart-page','.p5-checkout-page','prefers-reduced-motion']) {
  if (!commerceCss.includes(token)) throw new Error(`Premium commerce UI contract missing: ${token}`);
}
for (const token of ['QUIET PREMIUM FOUNDATION','--accent-champagne','#F7F7F5','#111111']) {
  if (!css.includes(token)) throw new Error(`Canonical premium foundation missing: ${token}`);
}
const products = fs.readFileSync('app/urunler/page.tsx','utf8');
for (const banned of ['Yıldır güvendeyiz','%100</strong><small>Güvenli altyapı']) {
  if (products.includes(banned)) throw new Error(`Unverifiable trust claim remains: ${banned}`);
}
console.log('Premium public UI contract: PASS');

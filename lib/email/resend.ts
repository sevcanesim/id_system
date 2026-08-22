function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

const RESEND_API_URL = "https://api.resend.com/emails";
const emailPublicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Shared branded header used at the top of every transactional email.
// logo-email.png is a dedicated export (900x900, same artwork as the app
// icon) — email clients fetch images from a real URL, so this must point at
// the deployed public/ asset rather than a relative path. Kept as a local
// constant (not imported from lib/payments/config) so this module has no
// dependency on the payments layer.
function emailHeader(): string {
  return `<div style="text-align:center;margin-bottom:24px"><img src="${emailPublicSiteUrl}/images/yenomilabs-logo-email.png" alt="Yenomi Labs" width="56" height="56" style="border-radius:50%;display:inline-block"/></div>`;
}

type MailInput={to:string;subject:string;html:string;replyTo?:string};
async function sendMail(input:MailInput){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.EMAIL_FROM||"Yenomi ID <noreply@yenomilabs.com>";
  if(!apiKey)return{sent:false,reason:"RESEND_API_KEY_MISSING" as const};
  const payload:Record<string,unknown>={from,to:[input.to],subject:input.subject,html:input.html};
  if(input.replyTo)payload.reply_to=input.replyTo;
  const response=await fetch(RESEND_API_URL,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response.ok)return{sent:false,reason:`RESEND_${response.status}` as const};
  return{sent:true as const};
}
export function sendActivationEmail(input:{to:string;activationUrl:string;orderNumber:string;hoursValid?:number;audience?:"individual"|"corporate"}){const hours=input.hoursValid??168;const validityText=hours%24===0?`${hours/24} gün`:`${hours} saat`;const corporate=input.audience==="corporate";const intro=corporate?"Ödemen alındı. Şirket panelini açmak ve çalışan lisanslarını yönetmek için aşağıdaki bağlantıyı kullan.":"Ödemen alındı. Dijital sayfa hakkını hesabına bağlamak için aşağıdaki bağlantıyı kullan.";return sendMail({to:input.to,subject:`Yenomi ID hesabını etkinleştir — ${input.orderNumber}`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>Yenomi ID hesabını etkinleştir</h1><p>${intro}</p><p><a href="${input.activationUrl}" style="display:inline-block;padding:14px 20px;background:#17121f;color:white;text-decoration:none;border-radius:10px">Hesabımı etkinleştir</a></p><p>Bu bağlantı ${validityText} geçerlidir.</p><p>Sipariş: <strong>${input.orderNumber}</strong></p></div>`})}
export function sendOrderReadyEmail(input:{to:string;orderNumber:string;createCardUrl:string;audience?:"individual"|"corporate"}){const corporate=input.audience==="corporate";const body=corporate?"Ödemen alındı ve şirket hesabın tanımlandı. Aktivasyon kodu girmen gerekmiyor. Çalışan lisanslarını ve kart üretimini panelden yönetebilirsin.":"Ödemen alındı ve Yenomi ID hizmetin hesabına otomatik olarak tanımlandı. Aktivasyon kodu girmen gerekmiyor.";const cta=corporate?"Kurumsal paneli aç":"Kartvizit bilgilerimi doldur";return sendMail({to:input.to,subject:`Siparişin hesabına tanımlandı — ${input.orderNumber}`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>Yenomi ID hizmetin hazır</h1><p>${body}</p><p><a href="${input.createCardUrl}" style="display:inline-block;padding:14px 20px;background:#17121f;color:white;text-decoration:none;border-radius:10px">${cta}</a></p><p>Sipariş: <strong>${escapeHtml(input.orderNumber)}</strong></p></div>`})}
export function sendOrganizationInviteEmail(input:{to:string;inviteUrl:string;organizationName:string}){return sendMail({to:input.to,subject:`${input.organizationName} Yenomi Business daveti`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>${escapeHtml(input.organizationName)} ekibine davet edildin</h1><p>Kurumsal dijital kimliğini oluşturmak ve şirket hesabına katılmak için daveti kabul et.</p><p><a href="${input.inviteUrl}" style="display:inline-block;padding:14px 20px;background:#17121f;color:white;text-decoration:none;border-radius:10px">Daveti kabul et</a></p><p>Bağlantı 7 gün geçerlidir ve tek kullanımlıktır.</p></div>`})}
export function sendShippingEmail(input:{to:string;orderNumber:string;company?:string|null;tracking?:string|null}){return sendMail({to:input.to,subject:`Siparişin kargoya verildi — ${input.orderNumber}`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>Siparişin kargoya verildi</h1><p><strong>${escapeHtml(input.orderNumber)}</strong> numaralı siparişin hazırlandı ve kargoya teslim edildi.</p><p>Kargo: <strong>${escapeHtml(input.company||"Bilgi bekleniyor")}</strong><br/>Takip no: <strong>${escapeHtml(input.tracking||"Bilgi bekleniyor")}</strong></p></div>`})}
export function sendAbandonedCheckoutEmail(input:{to:string;orderNumber:string;checkoutUrl:string;wave:"first"|"day"}) {
  const later = input.wave === "day";
  const intro = later
    ? "Ödemen hâlâ tamamlanmadı. Siparişin birkaç gün içinde otomatik iptal edilecek."
    : "Ödeme sayfasını açık bırakmış olabilirsin. Siparişin seni bekliyor.";
  return sendMail({
    to: input.to,
    subject: later
      ? `Ödemen tamamlanmadı — ${input.orderNumber}`
      : `Siparişin bekliyor — ${input.orderNumber}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>Ödemen tamamlanmadı</h1><p>${intro}</p><p><a href="${input.checkoutUrl}" style="display:inline-block;padding:14px 20px;background:#17121f;color:white;text-decoration:none;border-radius:10px">Ödemeye devam et</a></p><p>Sipariş: <strong>${escapeHtml(input.orderNumber)}</strong></p></div>`,
  });
}

function isPrivateIpv4(host: string) {
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

export function isPublicHttpsWebhook(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;
  if (host.endsWith(".local") || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".lan")) {
    return false;
  }
  if (host.includes(":")) {
    if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return false;
    if (host.startsWith("::ffff:")) return !isPrivateIpv4(host.slice("::ffff:".length));
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) && isPrivateIpv4(host)) return false;
  return true;
}

async function notifyOpsChannel(text: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) return { sent: false as const, reason: "SLACK_WEBHOOK_UNSET" };
  if (!isPublicHttpsWebhook(webhook)) return { sent: false as const, reason: "SLACK_WEBHOOK_BLOCKED" };
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return { sent: false as const, reason: `SLACK_${response.status}` };
    return { sent: true as const };
  } catch {
    return { sent: false as const, reason: "SLACK_UNAVAILABLE" };
  }
}

export async function sendOpsFulfillmentAlertEmail(input:{
  kind: "new" | "escalation";
  openCount: number;
  issues: Array<{ orderNumber: string; issueCode: string; createdAt: string }>;
}) {
  const to = process.env.OPS_ALERT_TO || process.env.CORPORATE_LEAD_TO || "hello@yenomilabs.com";
  const title = input.kind === "escalation"
    ? "24 saatten uzun açık fulfillment kaydı"
    : "Yeni commerce fulfillment kaydı";
  const rows = input.issues.map((issue) => `${escapeHtml(issue.orderNumber)} — ${escapeHtml(issue.issueCode)}`).join("<br/>");
  const slackLines = input.issues.map((issue) => `• ${issue.orderNumber} (${issue.issueCode})`).join("\n");
  const [mail, slack] = await Promise.all([
    sendMail({
      to,
      subject: `Yenomi ID ops — ${title} (${input.openCount} açık)`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">${emailHeader()}<h1>${title}</h1><p>Açık kayıt: <strong>${input.openCount}</strong></p><p>${rows || "Kayıt yok."}</p><p>Kaynak: commerce_fulfillment_issues</p></div>`,
    }),
    notifyOpsChannel(`${title}\nAçık kayıt: ${input.openCount}\n${slackLines}`),
  ]);
  if (mail.sent || slack.sent) return { sent: true as const };
  return { sent: false as const, reason: mail.reason || slack.reason };
}

export function sendCorporateLeadEmail(input:{id:string;fullName:string;email:string;company:string;employeeCount:string;message:string;plan:string}) {
  const safe = (value:string) => escapeHtml(value);
  return sendMail({
    to: process.env.CORPORATE_LEAD_TO || "hello@yenomilabs.com",
    subject: `Yeni Yenomi Business teklif talebi — ${safe(input.company)}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">${emailHeader()}<h1>Yeni kurumsal teklif talebi</h1><p><strong>Talep ID:</strong> ${safe(input.id)}</p><p><strong>Plan:</strong> ${safe(input.plan)}</p><p><strong>Ad soyad:</strong> ${safe(input.fullName)}<br/><strong>E-posta:</strong> ${safe(input.email)}<br/><strong>Şirket:</strong> ${safe(input.company)}<br/><strong>Çalışan sayısı:</strong> ${safe(input.employeeCount)}</p><p><strong>İhtiyaç:</strong><br/>${safe(input.message || "Belirtilmedi").replace(/\n/g,"<br/>")}</p><p>Kaynak: Yenomi Business teklif formu</p></div>`,
  });
}

export function sendNetworkingFollowUpEmail(input:{to:string;organizationName:string;leadName:string;template:"EVENT_BEFORE"|"EVENT_MET"|"OFFER"|"AFTER_MEETING"|"PRESENTATION"|"EVENT_THANKS"|"PRODUCT_INFO"|"CUSTOM";replyTo?:string}) {
  const org = escapeHtml(input.organizationName);
  const name = escapeHtml(input.leadName);
  const copy = {
    EVENT_BEFORE: { subject: `${input.organizationName} — etkinlikte görüşmek isteriz`, body: `<p>Merhaba ${name},</p><p>${org} olarak yaklaşan etkinlikte sizinle tanışmak isteriz.</p>` },
    EVENT_MET: { subject: `Tanıştığımıza memnun oldum — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>Bugün tanıştığımıza memnun oldum. Konuştuğumuz konu hakkında ${org} olarak bağlantıda kalmak isteriz.</p>` },
    OFFER: { subject: `Teklifimizi iletiyorum — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>Görüşmemizin ardından ${org} teklifimizi sizinle paylaşmak isteriz.</p>` },
    AFTER_MEETING: { subject: `Görüşmemizin ardından — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>${org} ile görüşmenizin ardından sonraki adımı birlikte netleştirmek isteriz.</p>` },
    PRESENTATION: { subject: `Sunumu iletiyorum — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>Konuştuğumuz sunumu ${org} olarak sizinle paylaşıyorum.</p>` },
    EVENT_THANKS: { subject: `Etkinlik sonrası teşekkür — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>Etkinlikte ayırdığınız zaman için teşekkür ederiz. ${org} olarak bağlantıda kalalım.</p>` },
    PRODUCT_INFO: { subject: `Ürün bilgisi — ${input.organizationName}`, body: `<p>Merhaba ${name},</p><p>İstediğiniz ürün bilgilerini ${org} olarak iletiyorum.</p>` },
    CUSTOM: { subject: `${input.organizationName} — bağlantıda kalalım`, body: `<p>Merhaba ${name},</p><p>${org} olarak sizinle bağlantıda kalmak isteriz.</p>` },
  }[input.template];
  return sendMail({
    to: input.to,
    subject: copy.subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">${emailHeader()}<h1>${org}</h1>${copy.body}<p>Bu ileti, paylaştığınız iletişim bilgisi üzerine gönderildi.</p></div>`,
    replyTo: input.replyTo,
  });
}


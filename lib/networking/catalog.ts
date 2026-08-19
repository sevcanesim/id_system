export const NETWORKING_LOCALES = ["tr", "en"] as const;
export type NetworkingLocale = (typeof NETWORKING_LOCALES)[number];

export const NETWORKING_INTERESTS = [
  "Partnership",
  "Distribution",
  "Investment",
  "Procurement",
  "Sales",
  "Business Development",
  "Employment",
  "Media / Press",
  "Product information",
  "Meeting",
  "Become a customer",
  "Other",
] as const;

export const TURKEY_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin",
  "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta",
  "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla",
  "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak",
  "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "MAIL_SENT",
  "MEETING_REQUESTED",
  "MEETING_SCHEDULED",
  "MEETING_DONE",
  "FOLLOW_UP",
  "WON",
  "CLOSED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MEETING_TYPES = ["ONLINE", "IN_PERSON"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export function detectNetworkingLocale(acceptLanguage: string | null | undefined): NetworkingLocale {
  const value = (acceptLanguage || "").toLowerCase();
  if (value.includes("tr")) return "tr";
  return "en";
}

export function meetingRequiresPlanning(city: string, country: string, type: MeetingType) {
  if (type !== "IN_PERSON") return false;
  const normalizedCity = city.trim().toLocaleLowerCase("tr-TR");
  const normalizedCountry = country.trim().toLocaleLowerCase("tr-TR");
  const inIzmir = normalizedCity === "izmir" || normalizedCity === "i̇zmir";
  const inTurkey = !normalizedCountry || normalizedCountry === "türkiye" || normalizedCountry === "turkey" || normalizedCountry === "tr";
  return !(inIzmir && inTurkey);
}

export const SCORE_WEIGHTS = {
  QR_SCAN: 10,
  CONTACT_SHARED: 15,
  MEETING_REQUESTED: 20,
  PRESENTATION_VIEWED: 10,
  PRESENTATION_VIEWED_REPEAT: 15,
  PARTNERSHIP_INTEREST: 20,
} as const;

export function scoreLead(events: readonly string[], interests: readonly string[] = []) {
  let score = 0;
  if (events.includes("QR_SCAN")) score += SCORE_WEIGHTS.QR_SCAN;
  if (events.includes("CONTACT_SHARED")) score += SCORE_WEIGHTS.CONTACT_SHARED;
  if (events.includes("MEETING_REQUESTED")) score += SCORE_WEIGHTS.MEETING_REQUESTED;
  const views = events.filter((event) => event === "PRESENTATION_VIEWED").length;
  if (views > 0) score += SCORE_WEIGHTS.PRESENTATION_VIEWED;
  if (views >= 3) score += SCORE_WEIGHTS.PRESENTATION_VIEWED_REPEAT;
  if (interests.some((item) => /partnership/i.test(item))) score += SCORE_WEIGHTS.PARTNERSHIP_INTEREST;
  return Math.min(100, score);
}

export function scoreLabel(score: number) {
  if (score >= 70) return "Hot";
  if (score >= 40) return "Warm";
  return "New";
}

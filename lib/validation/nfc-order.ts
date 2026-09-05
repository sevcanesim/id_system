export type NfcOrderValidationData = {
  quantity: number;
  printName: string;
  phone: string;
  email: string;
  addressLine: string;
  district: string;
  city: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNfcOrderStep(step: number, data: NfcOrderValidationData, hasSlug: boolean): string | null {
  if (step === 1 && (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 100)) {
    return "Kart adedi 1 ile 100 arasında olmalı.";
  }
  if (step === 2 && !hasSlug) return "Önce yayınlanmış bir Yenomi ID oluşturmalısın.";
  if (step === 3) {
    if (data.printName.trim().length < 2) return "Ad soyad alanını tamamla.";
    if (data.phone.replace(/\D/g, "").length < 10) return "Geçerli bir telefon numarası gir.";
    if (!emailPattern.test(data.email.trim())) return "Geçerli bir e-posta adresi gir.";
  }
  if (step === 4) {
    if (data.addressLine.trim().length < 8) return "Açık adresi daha ayrıntılı gir.";
    if (data.district.trim().length < 2) return "İlçe alanını tamamla.";
    if (data.city.trim().length < 2) return "İl alanını tamamla.";
  }
  return null;
}

export function highestReachableNfcOrderStep(data: NfcOrderValidationData, hasSlug: boolean) {
  for (let step = 1; step <= 4; step += 1) {
    if (validateNfcOrderStep(step, data, hasSlug)) return step;
  }
  return 5;
}

export type LinkItem = {
  title: string;
  subtitle: string;
  href: string;
  kind?: "save" | "phone" | "whatsapp" | "mail" | "external" | "map" | "social";
  download?: boolean;
};

export type Profile = {
  slug: string;
  name: string;
  role: string;
  description: string;
  image: string;
  imagePosition?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  links: LinkItem[];
};

export const profiles: Record<string, Profile> = {
  sevcanesimkaradeniz: {
    slug: "sevcanesimkaradeniz",
    name: "Sevcan Eşim Karadeniz",
    role: "Founder & Software Systems Lead | Yenomilabs",
    description: "Endüstriyel şirketler için özel yazılım, mobil uygulama, QR rapor akışı, portal ve şirket içi mini sistemler geliştiriyorum.",
    image: "/images/sevcan.JPEG",
    imagePosition: "50% 28%",
    email: "sevcan@yenomilabs.com",
    phone: "+905069573672",
    whatsapp: "https://wa.me/905069573672?text=Merhaba%2C%20proje%20hakk%C4%B1nda%20konu%C5%9Fmak%20istiyorum",
    linkedin: "https://www.linkedin.com/in/sevcanesim",
    instagram: "https://instagram.com/sevcanesimm",
    links: [
      { title: "WhatsApp", subtitle: "Yazılım ihtiyacı için hızlı iletişim kur", href: "https://wa.me/905069573672?text=Merhaba%2C%20%C5%9Firketimiz%20i%C3%A7in%20%C3%B6zel%20yaz%C4%B1l%C4%B1m%20%2F%20mobil%20uygulama%20%2F%20portal%20ihtiyac%C4%B1n%C4%B1%20konu%C5%9Fmak%20istiyorum", kind: "whatsapp" },
      { title: "Telefon ile Ara", subtitle: "0506 957 36 72 - Tek dokunuşla ara", href: "tel:+905069573672", kind: "phone" },
      { title: "Kişiyi Kaydet", subtitle: "Rehbere eklemek için dijital kartvizit (.vcf)", href: "/sevcanesimkaradeniz/vcard", kind: "save", download: true },
      { title: "Yazılım Hizmetleri", subtitle: "Özel yazılım, mobil uygulama, QR ve portal akışları", href: "https://yenomilabs.com/hizmetler", kind: "external" },
      { title: "Yenomilabs", subtitle: "Endüstriyel yazılım, mobil uygulama, QR ve portal sistemleri", href: "https://yenomilabs.com", kind: "external" },
      { title: "LinkedIn", subtitle: "Profesyonel geçmiş ve iş ağı", href: "https://www.linkedin.com/in/sevcanesim", kind: "social" },
      { title: "E-posta", subtitle: "sevcan@yenomilabs.com - Yazılım kapsamı için mail gönder", href: "mailto:sevcan@yenomilabs.com", kind: "mail" }
    ]
  }
};

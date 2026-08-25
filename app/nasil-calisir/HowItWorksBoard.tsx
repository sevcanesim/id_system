"use client";

import React, { useState, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

export const finishes = [
  { id: "matte", finish: "matte" as const, label: "Mat siyah" },
  { id: "metal", finish: "metal" as const, label: "Fırçalanmış metal" },
  { id: "white", finish: "white" as const, label: "Minimal beyaz" },
];

export const liveRoles = [
  { id: "product", role: "Ürün Yöneticisi" },
  { id: "sales", role: "Satış Direktörü" },
];

export const steps = [
  { id: "01", label: "Kartını seç", title: "Tasarım ve malzeme tercihini yap." },
  { id: "02", label: "Profilini oluştur", title: "Bilgilerini oluştur, istediğin zaman güncelle." },
  { id: "03", label: "Dokundur veya QR okut", title: "Karşı taraf uygulama indirmeden profilini açsın." },
  { id: "04", label: "Kayıp moduyla kontrol et", title: "Gerekirse fiziksel kart erişimini anında durdur." },
] as const;

export type StepId = typeof steps[number]["id"];

export const benefits: Array<[string, string, IconName]> = [
  ["Ödeme bilgilerin korunur", "Yenomi ödeme kartı verilerini kendi sunucularında tutmaz.", "shield"],
  ["Anında güncellenir", "Unvan veya telefon değişince kartı yeniden bastırmazsın.", "refresh"],
  ["Uygulama gerekmez", "Profil doğrudan telefonun tarayıcısında açılır.", "link"],
  ["Kontrol sende", "Kayıp moduyla fiziksel kart erişimini durdurabilirsin.", "lock"],
];

export function HowItWorksBoard() {
  const [activeStep, setActiveStep] = useState<StepId>("01");
  const [selectedFinish, setSelectedFinish] = useState<"matte" | "metal" | "white">("metal");
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number>(0);
  const [isLostModeActive, setIsLostModeActive] = useState<boolean>(false);

  const tabRefs = useRef<Record<StepId, HTMLButtonElement | null>>({
    "01": null,
    "02": null,
    "03": null,
    "04": null,
  });

  const stepIds: StepId[] = ["01", "02", "03", "04"];

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentId: StepId) => {
    const currentIndex = stepIds.indexOf(currentId);
    let targetIndex = -1;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % stepIds.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + stepIds.length) % stepIds.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = stepIds.length - 1;
    }

    if (targetIndex !== -1) {
      const nextId = stepIds[targetIndex];
      setActiveStep(nextId);
      tabRefs.current[nextId]?.focus();
    }
  };

  const activeRole = liveRoles[selectedRoleIndex];

  return (
    <main id="main-content" className="how-it-works-page">
      {/* HERO */}
      <section className="how-hero" aria-labelledby="how-title">
        <div className="how-hero-inner">
          <span className="section-kicker">YENOMI ID</span>
          <h1 id="how-title">Kartı yaklaştır.<br />Güncel profil açılsın.</h1>
          <p>Uygulama yok. Unvanın değişince baskı yok. Kaybolursa kapatırsın. Kendin için al, ekibin için yönet.</p>
        </div>
      </section>

      {/* ONE INTERACTIVE 4-STEP BOARD */}
      <section className="how-steps" aria-labelledby="how-steps-title">
        <h2 id="how-steps-title" className="sr-only">Yenomi ID dört adımda nasıl çalışır?</h2>

        <div className="how-steps-board">
          {/* STEP NAVIGATION (Sol Kolon / Desktop / Segmented Header Mobile) */}
          <div className="how-step-nav" role="tablist" aria-label="Yenomi ID 4 Adımda Nasıl Çalışır">
            {steps.map((step) => {
              const isSelected = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  ref={(el) => { tabRefs.current[step.id] = el; }}
                  role="tab"
                  id={`how-tab-${step.id}`}
                  aria-selected={isSelected}
                  aria-controls={`how-stage-${step.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  className={`how-step-nav__item how-step-nav__item--${step.id}${isSelected ? " is-active" : ""}`}
                  onClick={() => setActiveStep(step.id)}
                  onKeyDown={(e) => handleKeyDown(e, step.id)}
                >
                  <span className="how-step-nav__number">{step.id}</span>
                  <div className="how-step-nav__text">
                    <strong>{step.label}</strong>
                    <span>{step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* DYNAMIC VISUAL STAGE (Sağ Kolon / Stage Viewport) */}
          <div className="how-steps-board__stage">
            {/* STEP 01 — KARTINI SEÇ */}
            <article
              className={`how-scene how-scene--01 how-step-feature${activeStep === "01" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-01"
              aria-labelledby="how-tab-01"
              hidden={activeStep !== "01"}
            >
              <div className="how-scene-header">
                <span className="how-step-number">Adım 01</span>
                <h3>Tarzını ve Kartını Seç</h3>
                <p>Tasarım ve malzeme tercihini yap. Fiziksel kartın ve dijital profilin anında hazırlansın.</p>
              </div>

              <div className="how-finish-picker">
                <div className="how-finish-picker__options" role="radiogroup" aria-label="Kart Malzemesi Seçimi">
                  {finishes.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedFinish === option.finish}
                      className={`how-finish-picker__btn${selectedFinish === option.finish ? " is-active" : ""}`}
                      onClick={() => setSelectedFinish(option.finish)}
                    >
                      <span className={`how-finish-dot how-finish-dot--${option.finish}`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="how-finish-picker__display">
                  <div className="how-card-specimen-wrap">
                    <YenomiProductVisual variant="card" finish={selectedFinish} compact />
                  </div>
                  <div className="how-card-specimen-meta">
                    <span className="how-specimen-badge">YENOMI PHYSICAL CARD SPECIMEN</span>
                    <strong>{finishes.find(f => f.finish === selectedFinish)?.label} Finish</strong>
                    <div className="how-specimen-tech">
                      <span><Icon name="shield" /> Built-in NFC Chip</span>
                      <span><Icon name="qr" /> Dynamic Laser QR</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* STEP 02 — PROFİLİNİ OLUŞTUR */}
            <article
              className={`how-scene how-scene--02 how-step-feature${activeStep === "02" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-02"
              aria-labelledby="how-tab-02"
              hidden={activeStep !== "02"}
            >
              <div className="how-scene-header">
                <span className="how-step-number">Adım 02</span>
                <h3>Profilini Oluştur ve Güncelle</h3>
                <p>Unvan, iletişim ve sosyal hesap bilgilerini düzenle. Değişiklik kart yeniden basılmadan anında yansır.</p>
              </div>

              <div className="how-live-sync">
                <div className="how-live-sync__editor">
                  <div className="how-live-sync__editor-head">
                    <Icon name="refresh" />
                    <span>CANLI DİJİTAL EDİTÖR</span>
                  </div>
                  <div className="how-live-sync__editor-fields">
                    <div className="how-field-group">
                      <label htmlFor="editor-name">AD SOYAD</label>
                      <input id="editor-name" type="text" value="Selin Kaya" readOnly />
                    </div>
                    <div className="how-field-group">
                      <label htmlFor="editor-company">ŞİRKET</label>
                      <input id="editor-company" type="text" value="Yenomi Labs" readOnly />
                    </div>
                    <div className="how-field-group">
                      <label>UNVAN SEÇİMİ (CANLI TEST)</label>
                      <div className="how-role-selector">
                        {liveRoles.map((roleOpt, idx) => (
                          <button
                            key={roleOpt.id}
                            type="button"
                            className={`how-role-btn${selectedRoleIndex === idx ? " is-active" : ""}`}
                            onClick={() => setSelectedRoleIndex(idx)}
                          >
                            {roleOpt.role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="how-live-sync__arrow" aria-hidden="true">
                  <span>→</span>
                  <small>Anında Senkronizasyon</small>
                </div>

                <div className="how-live-sync__preview">
                  <div className="how-phone-frame">
                    <div className="how-phone-notch" />
                    <div className="how-phone-screen">
                      <div className="how-profile-specimen">
                        <div className="how-profile-avatar">SK</div>
                        <strong>Selin Kaya</strong>
                        <span className="how-profile-title">{activeRole.role}</span>
                        <span className="how-profile-company">Yenomi Labs</span>
                        <div className="how-profile-actions">
                          <span className="how-pbtn"><Icon name="phone" /> Ara</span>
                          <span className="how-pbtn"><Icon name="mail" /> E-posta</span>
                          <span className="how-pbtn"><Icon name="link" /> Rehbere Ekle</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="how-live-sync__pulse">Fiziksel kart yeniden basılmaz</span>
                </div>
              </div>
            </article>

            {/* STEP 03 — DOKUNDUR VEYA QR OKUT */}
            <article
              className={`how-scene how-scene--03 how-step-feature${activeStep === "03" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-03"
              aria-labelledby="how-tab-03"
              hidden={activeStep !== "03"}
            >
              <div className="how-scene-header">
                <span className="how-step-number">Adım 03</span>
                <h3>Dokundur veya QR Okut</h3>
                <p>NFC ile telefonun arkasına yaklaştır veya QR okut. Karşı taraf uygulama indirmeden tarayıcıda doğrudan açılır.</p>
              </div>

              <div className="how-tap-sequence">
                <div className="how-tap-step">
                  <div className="how-tap-icon"><Icon name="nfc" /></div>
                  <strong>1. Fiziksel Kart</strong>
                  <span>NFC çip veya lazer QR</span>
                </div>
                <div className="how-tap-divider">➔</div>
                <div className="how-tap-step">
                  <div className="how-tap-icon"><Icon name="sparkles" /></div>
                  <strong>2. Temassız Etkileşim</strong>
                  <span>Uygulama indirme gerekmez</span>
                </div>
                <div className="how-tap-divider">➔</div>
                <div className="how-tap-step">
                  <div className="how-tap-icon"><Icon name="link" /></div>
                  <strong>3. Mobil Tarayıcı</strong>
                  <span>Profil anında görüntülenir</span>
                </div>
              </div>

              <div className="how-tap-visual-stage">
                <div className="how-tap-card-visual">
                  <YenomiProductVisual variant="card" finish="metal" compact />
                  <div className="how-nfc-wave" aria-hidden="true">((( )))</div>
                </div>
                <div className="how-tap-browser-specimen">
                  <div className="how-browser-bar">
                    <span className="how-browser-dot" />
                    <span className="how-browser-url">https://id.yenomi.com/p/selin-kaya</span>
                  </div>
                  <div className="how-browser-content">
                    <YenomiProductVisual variant="profile" compact />
                  </div>
                </div>
              </div>
            </article>

            {/* STEP 04 — KAYIP MODUYLA KONTROL ET */}
            <article
              className={`how-scene how-scene--04 how-step-feature${activeStep === "04" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-04"
              aria-labelledby="how-tab-04"
              hidden={activeStep !== "04"}
            >
              <div className="how-scene-header">
                <div className="how-step-top">
                  <span className="how-step-number">Adım 04</span>
                  <span className="how-premium-badge">GÜVENLİK MODU</span>
                </div>
                <h3>Kaybolursa Kapat ve Yönet</h3>
                <p>Kartın kaybolursa tek tıkla fiziksel erişimi durdur. Dijital profilin ve yetkilerin sende güvende kalsın.</p>
              </div>

              <div className="how-lost-mode-stage">
                <div className="how-lost-card-status">
                  <div className="how-status-header">
                    <span>FİZİKSEL KART DURUMU</span>
                    <span className={`how-status-pill${isLostModeActive ? " is-disabled" : " is-active"}`}>
                      {isLostModeActive ? "DURDURULDU / KAYIP" : "AKTİF KULLANIMDA"}
                    </span>
                  </div>

                  <div className="how-status-toggle-box">
                    <div>
                      <strong>Kayıp Modu Anahtarı</strong>
                      <p>Aktif edildiğinde fiziksel kart ve QR okutulduğunda profil açılmaz.</p>
                    </div>
                    <button
                      type="button"
                      className={`how-toggle-btn${isLostModeActive ? " is-on" : ""}`}
                      onClick={() => setIsLostModeActive(!isLostModeActive)}
                      aria-pressed={isLostModeActive}
                    >
                      <span className="sr-only">Kayıp Modunu Değiştir</span>
                      <span className="how-toggle-slider" />
                    </button>
                  </div>
                </div>

                <div className="how-security-summary">
                  <div className="how-sec-item">
                    <Icon name="shield" />
                    <div>
                      <strong>Ödeme Kartı Güvenliği</strong>
                      <p>Ödeme kartı numaran Yenomi sunucularında saklanmaz.</p>
                    </div>
                  </div>
                  <div className="how-sec-item">
                    <Icon name="lock" />
                    <div>
                      <strong>Tam Yetki Yönetimi</strong>
                      <p>İstediğin an profilini yayınlayabilir veya gizleyebilirsin.</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* REBUILT BENEFITS SECTION (4 TRUST ITEMS) */}
      <section className="how-benefits" aria-label="Yenomi ID avantajları">
        <div className="how-benefits-grid">
          {benefits.map(([title, text, icon]) => (
            <article key={title}>
              <span className="how-benefit-icon"><Icon name={icon} /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* MASTER CONVERSION CTA SECTION */}
      <section className="how-conversion" aria-label="Yenomi ID Satın Alın">
        <div className="how-conversion-inner">
          <h2>Yenomi ID’ni kullanmaya başla.</h2>
          <p>Tek kartla güncel dijital profilini anında paylaş.</p>
          <div className="how-account-actions">
            <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart">NFC Kartı Satın Al</Link>
            <Link className="home-mockup__link-secondary" href="/giris">Hesabına gir</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

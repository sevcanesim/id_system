"use client";

import React, { useState, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

const finishes = [
  { id: "matte", finish: "matte" as const, label: "Mat siyah", prev: "white", next: "metal" },
  { id: "metal", finish: "metal" as const, label: "Fırçalanmış metal", prev: "matte", next: "white" },
  { id: "white", finish: "white" as const, label: "Minimal beyaz", prev: "metal", next: "matte" },
];

const liveRoles = [
  { id: "product", role: "Ürün Yöneticisi" },
  { id: "sales", role: "Satış Direktörü" },
];

export const steps = [
  { id: "01", num: "Adım 1", label: "Kartını seç", title: "Tarzını ve Kartını Seç" },
  { id: "02", num: "Adım 2", label: "Profilini oluştur", title: "Profilini Oluştur ve Canlı Tut" },
  { id: "03", num: "Adım 3", label: "Dokundur veya QR okut", title: "Yaklaştır veya QR okut" },
  { id: "04", num: "Adım 4", label: "Kayıp moduyla kontrol et", title: "Kaybolursa kapat" },
] as const;

export type StepId = typeof steps[number]["id"];

const benefits: Array<[string, string, IconName]> = [
  ["Kartın iyzico’da kalır", "Ödeme kartı numarası Yenomi sunucularında tutulmaz.", "shield"],
  ["Anında güncellenir", "Unvan veya telefon değişince kartı yeniden basmazsın.", "refresh"],
  ["Uygulama gerekmez", "Profil her yerde tarayıcıda açılır.", "link"],
  ["Kontrol sende", "Kayıp modu, yayın ve yetki sende kalır.", "lock"],
];

export function HowItWorksBoard() {
  const [activeStep, setActiveStep] = useState<StepId>("01");
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

  return (
    <main id="main-content" className="how-it-works-page">
      <section className="how-hero" aria-labelledby="how-title">
        <div className="how-hero-inner">
          <span className="section-kicker">YENOMI ID</span>
          <h1 id="how-title">Kartı yaklaştır.<br />Güncel profil açılsın.</h1>
          <p>Uygulama yok. Unvanın değişince baskı yok. Kaybolursa kapatırsın. Kendin için al, ekibin için yönet.</p>
        </div>
      </section>

      <section className="how-steps" aria-labelledby="how-steps-title">
        <h2 id="how-steps-title" className="sr-only">Yenomi ID dört adımda nasıl çalışır?</h2>
        <div className="how-flow-line" aria-hidden="true" />

        <div className="how-steps-board">
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

          <div className="how-steps-board__stage">
            <article
              className={`how-scene how-scene--01 how-step-feature${activeStep === "01" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-01"
              aria-labelledby="how-tab-01"
              hidden={activeStep !== "01"}
            >
              <span className="how-step-number">Adım 1</span>
              <h3>Tarzını ve Kartını Seç</h3>
              <p>Size en uygun tasarımı, iletişim, sosyal tek QR kartvizit sayfanızda toplayın. Değişiklik anında yansır.</p>

              <div className="how-card-gallery">
                {finishes.map((option, index) => (
                  <input
                    key={option.id}
                    className="sr-only"
                    type="radio"
                    name="how-card-finish"
                    id={`how-card-${option.id}`}
                    defaultChecked={index === 1}
                  />
                ))}
                <div className="how-card-gallery__stage" aria-label="Kart malzemesi">
                  {finishes.map((option) => (
                    <label
                      key={option.id}
                      htmlFor={`how-card-${option.id}`}
                      className={`how-card-gallery__item how-card-gallery__item--${option.id}`}
                    >
                      <YenomiProductVisual variant="card" finish={option.finish} compact />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className="how-card-gallery__nav">
                  {finishes.map((option) => (
                    <span key={option.id} className={`how-card-gallery__arrows how-card-gallery__arrows--${option.id}`}>
                      <label htmlFor={`how-card-${option.prev}`} className="how-card-gallery__arrow">
                        <span className="sr-only">Önceki kart</span>
                        <Icon name="chevronLeft" />
                      </label>
                      <label htmlFor={`how-card-${option.next}`} className="how-card-gallery__arrow">
                        <span className="sr-only">Sonraki kart</span>
                        <Icon name="chevronRight" />
                      </label>
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article
              className={`how-scene how-scene--02 how-step-feature${activeStep === "02" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-02"
              aria-labelledby="how-tab-02"
              hidden={activeStep !== "02"}
            >
              <span className="how-step-number">Adım 2</span>
              <h3>Profilini Oluştur ve Canlı Tut</h3>
              <p>Bilgilerinizi (unvan, iletişim, sosyal hesaplar) istediğiniz an güncelleyin. Değişiklik anında kartınıza ve QR kodunuza yansır.</p>

              <div className="how-live-sync">
                {liveRoles.map((option, index) => (
                  <input
                    key={option.id}
                    className="sr-only"
                    type="radio"
                    name="how-live-role"
                    id={`how-live-${option.id}`}
                    defaultChecked={index === 0}
                  />
                ))}
                <div className="how-live-sync__stage">
                  <div className="how-live-sync__editor" aria-label="Profil düzenleme">
                    <div className="how-live-sync__device">
                      <div className="how-live-sync__device-bar"><i /><span>PROFİL DÜZENLE</span></div>
                      <div className="how-live-sync__device-body">
                        <strong>Selin Kaya</strong>
                        <span>Yenomi Labs</span>
                        <p className="how-live-sync__field">UNVAN</p>
                        <div className="how-live-sync__choices">
                          {liveRoles.map((option) => (
                            <label key={option.id} htmlFor={`how-live-${option.id}`}>{option.role}</label>
                          ))}
                        </div>
                        <ul>
                          <li><b>WhatsApp</b> Hızlı mesaj</li>
                          <li><b>LinkedIn</b> Yenomi Labs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="how-live-sync__card" aria-label="Kart önizlemesi">
                    {liveRoles.map((option) => (
                      <div key={option.id} className={`how-live-sync__card-face how-live-sync__card-face--${option.id}`}>
                        <YenomiProductVisual variant="card" finish="metal" compact role={option.role} />
                      </div>
                    ))}
                    <div className="how-qr" aria-hidden="true"><Icon name="qr" /></div>
                    <span className="how-live-sync__pulse">Anında yansıdı</span>
                  </div>
                </div>
              </div>
            </article>

            <article
              className={`how-scene how-scene--03 how-step-feature${activeStep === "03" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-03"
              aria-labelledby="how-tab-03"
              hidden={activeStep !== "03"}
            >
              <span className="how-step-number">Adım 3</span>
              <h3>Dokundur veya QR okut</h3>
              <p>NFC veya QR. Karşı taraf uygulama indirmez; profil tarayıcıda açılır.</p>
              <div className="how-step-visual how-step-visual--03">
                <YenomiProductVisual variant="profile" compact />
                <div className="how-qr" aria-hidden="true"><Icon name="qr" /></div>
              </div>
            </article>

            <article
              className={`how-scene how-scene--04 how-step-feature${activeStep === "04" ? " is-active" : ""}`}
              role="tabpanel"
              id="how-stage-04"
              aria-labelledby="how-tab-04"
              hidden={activeStep !== "04"}
            >
              <div className="how-step-top">
                <span className="how-step-number">Adım 4</span>
                <span className="how-premium-badge">PREMIUM</span>
              </div>
              <h3>Kaybolursa kapat</h3>
              <p>Kayıp modu fiziksel kartı durdurur. Dijital kimliğin sende kalır.</p>
              <div className="how-dashboard" aria-label="Yönetim paneli önizlemesi">
                <div className="how-dashboard-bar"><span>Yenomi ID</span><i/><i/><i/></div>
                <div className="how-dashboard-kpis"><b>Görüntülenme</b><b>Bağlantı</b><b>Profil</b></div>
                <div className="how-dashboard-grid"><div className="how-chart"><span/><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/><i/></div><div className="how-mini-chart"><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/></div></div>
                <div className="how-toggle-badge"><span>Anında Durdur</span><i className="is-on" /></div>
              </div>
            </article>
          </div>
        </div>

        <div className="how-bottom-timeline" aria-hidden="true">
          <div className="how-timeline-line" />
          <div className="how-timeline-markers">
            <span>Adım 1</span>
            <span>Adım 2</span>
            <span>Adım 3</span>
            <span>Adım 4</span>
          </div>
        </div>
      </section>

      <section className="how-benefits" aria-label="Yenomi ID avantajları">
        <div className="how-benefits-grid">
          {benefits.map(([title, text, icon]) => (
            <article key={title}>
              <span className="how-benefit-icon"><Icon name={icon} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
        <p className="how-account-note">Karşı taraf uygulama indirmez. Profil tarayıcıda açılır.</p>
        <div className="how-account-actions">
          <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart">NFC Kartı Satın Al</Link>
          <Link className="home-mockup__link-secondary" href="/giris">Hesabına gir</Link>
        </div>
      </section>
    </main>
  );
}

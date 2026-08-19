"use client";

import { useEffect, useMemo, useState } from "react";
import UserPanelShell from "../components/UserPanelShell";
import AddToCartButton from "../components/AddToCartButton";
import { Icon } from "../icons";
import { Badge, Card, EmptyState } from "../components/ui";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { COMMERCIAL_PRICING, INDIVIDUAL_RENEWAL_MESSAGE } from "../../lib/config/commercial";
import { formatTryFromKurus, NFC_PRODUCT } from "../../lib/config/product";

type ServiceRecord = { id:string; status:string; starts_at:string|null; expires_at:string|null; grace_ends_at:string|null };
type ServiceState = { loading:boolean; signedIn:boolean; records:ServiceRecord[]; error:string };

export default function RenewalPage() {
  const renewal = COMMERCIAL_PRICING.YENOMI_ID_RENEWAL;
  const [service,setService]=useState<ServiceState>({loading:true,signedIn:false,records:[],error:""});
  useEffect(()=>{void (async()=>{const sb=getSupabaseBrowserClient(); if(!sb){setService(s=>({...s,loading:false,error:"Hizmet bilgisi yüklenemedi."}));return;} const {data}=await sb.auth.getSession(); const token=data.session?.access_token; if(!token){setService({loading:false,signedIn:false,records:[],error:""});return;} try{const r=await fetch("/api/commerce/entitlements",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}); const json=await r.json(); if(!r.ok) throw new Error(); setService({loading:false,signedIn:true,records:json.entitlements??[],error:""});}catch{setService({loading:false,signedIn:true,records:[],error:"Hizmet durumu şu anda yüklenemiyor."});}})()},[]);
  const current=useMemo(()=>service.records.slice().sort((a,b)=>String(b.expires_at||"").localeCompare(String(a.expires_at||"")))[0]||null,[service.records]);
  const expiry=current?.expires_at?new Date(current.expires_at):null;
  const daysLeft=expiry?Math.ceil((expiry.getTime()-Date.now())/86400000):null;
  const tone = !current ? "neutral" : daysLeft !== null && daysLeft <= 30 ? "warning" : "success";
  const label = !current ? "Aktif hizmet bulunamadı" : daysLeft !== null && daysLeft <= 30 ? "Yenileme zamanı yaklaşıyor" : "Aktif";
  return <UserPanelShell activeKey="subscription" eyebrow="HESAP" title="Abonelik" description="Dijital kartvizit hizmetinizin durumunu, bitiş tarihini ve yenileme işlemini yönetin.">
    {service.loading?<Card><p className="p9-section-copy">Hizmet bilgisi yükleniyor…</p></Card>:!service.signedIn?<EmptyState title="Oturum gerekli" description="Abonelik durumunu görmek için hesabınıza giriş yapın." />:<div className="p9-stack">{service.error&&<div className="p9-message" role="status">{service.error}</div>}<Card className="p9-service">
      <div className="p9-service__head"><div><Badge tone={tone}>{label}</Badge><h2>Yenomi ID Dijital Hizmet</h2><p className="p9-section-copy">Kalıcı profil bağlantınızı ve dijital kartvizit hizmetinizi aynı kartla kullanmaya devam edin.</p></div><div className="p9-price"><strong>{formatTryFromKurus(renewal.priceKurus)}</strong><small>/ yıl</small></div></div>
      <div className="p9-service-facts"><div className="p9-service-fact"><small>Durum</small><strong>{current?"Aktif":"Yenileme gerekli"}</strong></div><div className="p9-service-fact"><small>Bitiş tarihi</small><strong>{expiry?expiry.toLocaleDateString("tr-TR"):"—"}</strong></div><div className="p9-service-fact"><small>Kalan süre</small><strong>{daysLeft===null?"—":daysLeft>0?`${daysLeft} gün`:"Süre doldu"}</strong></div></div>
      <div className="p9-feature-list"><div className="p9-feature"><Icon name="check" />1 yıl dijital kartvizit hizmeti</div><div className="p9-feature"><Icon name="check" />Mevcut profil ve bağlantılar korunur</div><div className="p9-feature"><Icon name="check" />Yeni fiziksel kart gönderilmez</div></div>
      <div className="p9-service-actions"><AddToCartButton productId={NFC_PRODUCT.slug} variantSku={renewal.sku} kind="NFC_PHYSICAL_CARD" name="Yenomi ID Dijital Hizmet — 1 Yıl Yenileme" unitPriceKurus={renewal.priceKurus} label="1 Yıl Yenile" className="ds-button ds-button--primary" /></div>
      <p className="p9-section-copy">{INDIVIDUAL_RENEWAL_MESSAGE}</p>
    </Card></div>}
  </UserPanelShell>;
}

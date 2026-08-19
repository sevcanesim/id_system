"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import UserPanelShell from "../components/UserPanelShell";
import { Card, EmptyState } from "../components/ui";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type Analytics = { totalViews:number; last30DaysViews:number; byDay:Array<{date:string;count:number}>; byCard:Array<{id:string;name:string;count:number}>; available?:boolean };
export default function AnalyticsPage(){
  const [data,setData]=useState<Analytics|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{void (async()=>{const sb=getSupabaseBrowserClient(); if(!sb){setLoading(false);return;} const {data:s}=await sb.auth.getSession(); const token=s.session?.access_token; if(!token){setLoading(false);return;} try{const r=await fetch("/api/analytics/me",{headers:{authorization:`Bearer ${token}`},cache:"no-store"}); if(r.ok)setData(await r.json());}finally{setLoading(false);}})()},[]);
  const max=useMemo(()=>Math.max(1,...(data?.byDay||[]).map((x)=>x.count)),[data]);
  const average30 = data ? Math.round(data.last30DaysViews / 30) : 0;
  return <UserPanelShell activeKey="analytics" eyebrow="KART" title="İstatistikler" description="Dijital profilinizin gerçek görüntülenme verisini sade ve anlamlı metriklerle takip edin.">
    {loading?<Card><p className="p9-section-copy">İstatistikler yükleniyor…</p></Card>:!data?<EmptyState title="İstatistikler yüklenemedi." description="Oturumunuzu kontrol edip yeniden deneyin." />:data.totalViews===0 && data.last30DaysViews===0?<EmptyState title="Henüz görüntülenme yok." description="Kartınızı paylaştığınızda görüntülenme ve etkileşim verileri burada oluşur." action={<Link className="ds-button ds-button--primary" href="/kartim">Kartımı Aç</Link>} />:<div className="p9-stack">
      <div className="p9-analytics-metrics"><Card variant="metric" className="p9-metric"><small>Son 30 gün</small><strong>{data.last30DaysViews.toLocaleString("tr-TR")}</strong><span>profil görüntülenmesi</span></Card><Card variant="metric" className="p9-metric"><small>90 günlük toplam</small><strong>{data.totalViews.toLocaleString("tr-TR")}</strong><span>profil görüntülenmesi</span></Card><Card variant="metric" className="p9-metric"><small>Günlük ortalama</small><strong>{average30.toLocaleString("tr-TR")}</strong><span>son 30 gün</span></Card></div>
      <Card className="p9-chart"><div className="p9-chart__head"><div><h2 className="ds-card-title">Görüntülenme eğilimi</h2><p>Son 30 günün günlük profil görüntülenmeleri.</p></div><span className="ds-badge">30 gün</span></div>{data.byDay.length?<div className="p9-bars" aria-label="Son 30 günlük görüntülenme grafiği">{data.byDay.slice(-30).map((x)=><div key={x.date} title={`${x.date}: ${x.count}`} aria-label={`${x.date}: ${x.count} görüntülenme`}><i style={{height:`${Math.max(6,(x.count/max)*100)}%`}}/></div>)}</div>:<EmptyState title="Henüz görüntülenme yok." description="Profiliniz görüntülendikçe trend verileri burada oluşacaktır." />}</Card>
      <Card><h2 className="ds-card-title">Kart bazında performans</h2><p className="p9-section-copy">Birden fazla kartınız varsa hangi profilin daha çok görüntülendiğini karşılaştırın.</p>{data.byCard.length?<div className="p9-card-ranking">{data.byCard.map((card)=><div className="p9-card-ranking__row" key={card.id}><strong>{card.name}</strong><span>{card.count.toLocaleString("tr-TR")} görüntülenme</span></div>)}</div>:<EmptyState title="Karşılaştırılacak kart verisi yok." description="Kart görüntülenmeleri oluştuğunda burada listelenecektir." />}</Card>
    </div>}
  </UserPanelShell>;
}

"use client";
import { useEffect,useMemo,useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles } from "../../lib/repositories/profiles";
import type { CardProfileRow } from "../../lib/card-profile";
import { isManagementRole } from "../../lib/organizations/permissions";
import { ButtonLink, DashboardShell } from "../ui";

type Entitlement={id:string;kind:string;status:string};
type MineOrganization={ role?: string | null };

export default function MyCardsPage(){
 const router=useRouter();const [profiles,setProfiles]=useState<CardProfileRow[]>([]);const [spare,setSpare]=useState(0);const [loading,setLoading]=useState(true);
 useEffect(()=>{const sb=getSupabaseBrowserClient();if(!sb){setLoading(false);return}void sb.auth.getUser().then(async({data})=>{if(!data.user){router.replace("/giris?next=%2Fkartlarim");return}const [{data:ps},{data:ss}]=await Promise.all([fetchOwnProfiles(sb,data.user.id),sb.auth.getSession()]);setProfiles(ps);const token=ss.session?.access_token;if(token){const [e,o]=await Promise.all([fetch("/api/commerce/entitlements",{headers:{authorization:`Bearer ${token}`},cache:"no-store"}),fetch("/api/organizations/mine",{headers:{authorization:`Bearer ${token}`},cache:"no-store"})]);if(e.ok){const payload=await e.json() as {entitlements?:Entitlement[]};const used=new Set(ps.map(p=>p.entitlement_id).filter(Boolean));setSpare((payload.entitlements??[]).filter(x=>!used.has(x.id)).length)}if(o.ok){const payload=await o.json() as {organizations?:MineOrganization[]};if((payload.organizations??[]).some((org)=>isManagementRole(String(org.role||"")))){router.replace("/kurumsal/panel");return}}}setLoading(false)})},[router]);
 const primary=profiles[0];const completion=useMemo(()=>primary?Math.min(100,[primary.name,primary.role,primary.email,primary.phone,primary.image_url].filter(Boolean).length*20):0,[primary]);if(loading)return <DashboardShell title="Genel Bakış" description="Kimliğin hazırlanıyor."><div className="yi-loading-view" role="status" aria-live="polite"><strong>Hesabın hazırlanıyor…</strong><div/><div/><div/></div></DashboardShell>;
 return <DashboardShell title={primary?.name?`Merhaba, ${primary.name.split(" ")[0]}`:"Yenomi ID'n"} description="Dijital kimliğini, kartlarını ve hesabını tek çalışma alanından yönet." actions={[{href:`/olustur?id=${primary?.id||""}`,label:"Profili Düzenle",primary:true},{href:"/kartim",label:"Kartımı Aç"}]}>
  {!primary?<div className="yi-empty-app"><span>İLK ADIM</span><h2>Kimliğin burada başlıyor.</h2><p>{spare?"Edinilmiş bir hizmet hakkın var. Profilini oluşturarak kartını hazırla.":"Bir Yenomi ID ürünü edinerek dijital kimliğini aktive et."}</p><ButtonLink href={spare?"/olustur":"/urunler"}>{spare?"Kimliğimi oluştur":"Ürünleri keşfet"}</ButtonLink></div>:
  <div className="yi-dashboard-grid"><section className="yi-dashboard-hero"><div className="yi-dashboard-card"><span>YENOMI ID</span><strong>{primary.name||"Yenomi ID"}</strong><small>{primary.role||"Dijital Kimlik"}</small></div><div><span className={`yi-status ${primary.is_published?"yi-status--success":"yi-status--warning"}`}>{primary.is_published?"Yayında":"Taslak"}</span><h2>Kimliğin %{completion} tamamlandı.</h2><p>Profilini tamamladıkça kartın daha güçlü bir dijital temas noktası olur.</p><progress max={100} value={completion} aria-label={`Kimlik tamamlama ${completion}%`}>{completion}%</progress><div className="yi-actions"><ButtonLink href={`/olustur?id=${primary.id}`}>Kimliğime devam et</ButtonLink><ButtonLink href="/kartim" variant="secondary">Önizle</ButtonLink></div></div></section>
   <section className="yi-metric-grid"><div><small>Yayındaki kimlik</small><strong>{profiles.filter(p=>p.is_published).length}</strong><span>Aktif profil</span></div><div><small>Kimlik tamamlama</small><strong>%{completion}</strong><span>{completion===100?"Profil hazır":"Tamamlanmayı sürdür"}</span></div><div><small>Bağlı profiller</small><strong>{profiles.length}</strong><span>{profiles.length===1?"Tek dijital kimlik":"Dijital kimlikler"}</span></div></section>
   <section className="yi-app-card yi-next-step"><div><span>HIZLI İŞLEMLER</span><h2>Kontrol sende.</h2><p>Kartını aç, bağlantını paylaş veya hesabını yönet.</p></div><div className="yi-actions"><ButtonLink href="/kartim" variant="secondary">Kartımı Aç</ButtonLink><ButtonLink href="/leadler" variant="secondary">Network Mail</ButtonLink><ButtonLink href="/siparislerim" variant="secondary">Siparişlerim</ButtonLink></div></section>
  </div>}
 </DashboardShell>
}

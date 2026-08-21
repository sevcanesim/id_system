"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { useEffect,useState } from "react";
import { validateCardWorkspace, validatePortal, type PortalCheckResult } from "../../lib/auth/portal-guard";
import { INDIVIDUAL_SIDEBAR_CONFIG } from "../components/ui/sidebar-config";

type ShellAction={href?:string;label:string;primary?:boolean;onClick?:()=>void;disabled?:boolean};
export default function DashboardShell({title,description,children,actions=[],portal="individual"}:{title:string;description?:string;children:ReactNode;actions?:ShellAction[];portal?:"individual"|"business"}) {
 const pathname=usePathname(); const [email,setEmail]=useState(""); const [portalState,setPortalState]=useState<"checking"|"allowed"|"denied">("checking");
 useEffect(()=>{let cancelled=false; const sb=getSupabaseBrowserClient(); if(!sb){setPortalState("allowed");return;} void (async()=>{const {data}=await sb.auth.getUser(); if(!data.user){if(!cancelled){setPortalState("denied"); window.location.replace(`/giris?portal=${portal}&next=${encodeURIComponent(pathname)}`);}return;} const result:PortalCheckResult=portal==="individual"?await validateCardWorkspace(sb,data.user.id):await validatePortal(sb,data.user.id,portal); if(cancelled)return; if(result.ok){setEmail(data.user.email||"");setPortalState("allowed");}else{setPortalState("denied");window.location.replace(portal==="individual"?"/kurumsal/panel":"/kartlarim");}})(); return()=>{cancelled=true;};},[pathname,portal]);
 if(portalState!=="allowed") return <main className="yi-app yi-app--loading" aria-busy="true"><div className="yi-app__loading" role="status" aria-live="polite"><strong>{portalState==="checking"?"Çalışma alanınız hazırlanıyor…":"Yönlendiriliyorsunuz…"}</strong><span>Hesap türünüz doğrulanıyor.</span></div></main>;
 return <main className={`yi-app yi-app--${portal}`}>
  <aside className="yi-app__sidebar"><Brand compact/><nav aria-label="Hesap menüsü">{INDIVIDUAL_SIDEBAR_CONFIG.map(({href,label})=><Link key={href} href={href} aria-current={pathname===href||pathname.startsWith(`${href}/`)?"page":undefined}>{label}</Link>)}</nav><div className="yi-app__support"><Link href="/destek">Destek</Link><a href="mailto:hello@yenomilabs.com">Bize ulaşın</a></div></aside>
  <section className="yi-app__main"><header className="yi-app__top"><div className="yi-top-account"><span className="yi-top-account__label">HESAP</span><span>{email}</span></div><div className="yi-top-actions"><Link href="/destek">Yardım</Link><Link href="/">Siteye dön</Link></div></header><div className="yi-app__content"><div className="yi-page-head"><span>YENOMI ID</span><h1>{title}</h1>{description&&<p>{description}</p>}{actions.length>0&&<div className="yi-actions">{actions.map((a)=>a.href?<Link key={a.href} className={`yi-btn ${a.primary?"yi-btn--primary":"yi-btn--secondary"}`} href={a.href}>{a.label}</Link>:<button key={a.label} type="button" className={`yi-btn ${a.primary?"yi-btn--primary":"yi-btn--secondary"}`} onClick={a.onClick} disabled={a.disabled}>{a.label}</button>)}</div>}</div>{children}</div></section>
 </main>;
}

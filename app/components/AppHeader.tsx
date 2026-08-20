"use client";
import SiteHeader from "../ui/SiteHeader";

type HeaderAction={href:string;label:string;primary?:boolean};
export default function AppHeader({actions=[],landing=false,context,showDefaultCta=true}: {context?:string;landing?:boolean;actions?:HeaderAction[];showDefaultCta?:boolean}) {
 return <SiteHeader theme={landing||context==="Ürünler"||context==="Giriş"?"light":"dark"} actions={actions} showDefaultCta={showDefaultCta}/>;
}

"use client";
import SiteHeader from "../ui/SiteHeader";

type HeaderAction={href:string;label:string;primary?:boolean};
export default function AppHeader({actions=[],landing=false,context}: {context?:string;landing?:boolean;actions?:HeaderAction[]}) {
 return <SiteHeader theme={landing||context==="Ürünler"?"light":"dark"} actions={actions}/>;
}

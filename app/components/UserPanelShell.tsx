"use client";
import type { ReactNode } from "react";
import DashboardShell from "../ui/DashboardShell";

type Action={href?:string;label:string;primary?:boolean;onClick?:()=>void;disabled?:boolean};
export default function UserPanelShell({title,description,eyebrow,children,actions=[]}: {title:string;description?:string;eyebrow?:string;children:ReactNode;actions?:Action[];activeKey?:string}) {
 return <DashboardShell title={title} description={description} actions={actions.filter((a): a is {href:string;label:string;primary?:boolean} => Boolean(a.href))}>{children}</DashboardShell>;
}

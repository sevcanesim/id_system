import Link from "next/link";
import type { ReactNode } from "react";
import type { ButtonVariant } from "./types";

const variantClass: Record<ButtonVariant,string> = {
  primary: "yi-btn yi-btn--primary",
  secondary: "yi-btn yi-btn--secondary",
  ghost: "yi-btn yi-btn--ghost",
  dark: "yi-btn yi-btn--dark",
};

export function Button({children, variant="primary", type="button", disabled, onClick, className=""}:{children:ReactNode;variant?:ButtonVariant;type?:"button"|"submit"|"reset";disabled?:boolean;onClick?:()=>void;className?:string}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`${variantClass[variant]} ${className}`.trim()}>{children}</button>;
}
export function ButtonLink({children, href, variant="primary", className=""}:{children:ReactNode;href:string;variant?:ButtonVariant;className?:string}) {
  return <Link href={href} className={`${variantClass[variant]} ${className}`.trim()}>{children}</Link>;
}

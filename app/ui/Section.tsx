import type { ReactNode } from "react";
export function Section({eyebrow,title,description,children,tone="dark",className=""}:{eyebrow?:string;title:string;description?:string;children?:ReactNode;tone?:"dark"|"light";className?:string}) {
 return <section className={`yi-section yi-section--${tone} ${className}`.trim()}><div className="yi-container">
  <div className="yi-section__heading">{eyebrow&&<span>{eyebrow}</span>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}
 </div></section>;
}

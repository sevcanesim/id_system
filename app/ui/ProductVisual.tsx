import { YenomiProductVisual } from "./YenomiProductVisual";
export function ProductVisual({light=false}:{light?:boolean}) {
 return <div className={`yi-product-visual${light?" yi-product-visual--light":""}`}>
   <div className="yi-orbit yi-orbit--one"/><div className="yi-orbit yi-orbit--two"/>
   <YenomiProductVisual variant="card" />
 </div>;
}

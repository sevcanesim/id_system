"use client";
import { useState } from "react";
import { addCartItem } from "../../lib/cart";
import { formatTryFromKurus } from "../../lib/config/product";
import { Button } from "./Button";

export default function ProductBuy({ variantSku, priceKurus, productSlug, productName }:{variantSku:string;priceKurus:number;productSlug:string;productName:string}) {
 const [quantity,setQuantity]=useState(1); const [added,setAdded]=useState(false);
 const add=()=>{addCartItem({productId:productSlug,variantSku,kind:"NFC_PHYSICAL_CARD",name:productName,unitPriceKurus:priceKurus,quantity});setAdded(true);window.setTimeout(()=>setAdded(false),2200)};
 return <div className="yi-buybox">
   <div className="yi-buybox__price"><small>Başlangıç paketi</small><strong>{formatTryFromKurus(priceKurus)}</strong><span>1 fiziksel NFC kart + 1 yıllık dijital hizmet</span></div>
   <div className="yi-buybox__row"><label htmlFor="yi-qty">Adet</label><div className="yi-stepper"><button type="button" onClick={()=>setQuantity(Math.max(1,quantity-1))} aria-label="Adedi azalt">−</button><input id="yi-qty" value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(20,Number(e.target.value)||1)))} inputMode="numeric"/><button type="button" onClick={()=>setQuantity(Math.min(20,quantity+1))} aria-label="Adedi artır">+</button></div></div>
   <Button onClick={add} className="yi-buybox__cta">{added?"Sepete eklendi":"Sepete ekle"}</Button>
   <p className="yi-buybox__note">Türkiye içi kargo ücretsiz. Ödeme aşamasında fiyatlar ve uygunluk sunucu tarafından yeniden doğrulanır.</p>
 </div>;
}

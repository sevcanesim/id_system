"use client";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { readCart,removeCartItem,updateCartItemQuantity,writeCart,type CartItem } from "../../lib/cart";
import { formatTryFromKurus } from "../../lib/config/product";
import { EmptyState } from "../components/ui/States";

export default function CartPage(){
 const [items,setItems]=useState<CartItem[]>([]);
 useEffect(()=>{const sync=()=>setItems(readCart());sync();window.addEventListener("yenomi-cart-change",sync);return()=>window.removeEventListener("yenomi-cart-change",sync)},[]);
 const total=useMemo(()=>items.reduce((s,i)=>s+i.unitPriceKurus*i.quantity,0),[items]);
 const update=(id:string,q:number)=>{const next=updateCartItemQuantity(items,id,q);writeCart(next);setItems(next)};
 const remove=(id:string)=>{const next=removeCartItem(items,id);writeCart(next);setItems(next)};
 return <div className="yi-site"><main id="main-content" className="yi-section yi-section--light yi-cart-page"><div className="yi-container">
  <div className="yi-page-head"><span>COMMERCE</span><h1>Sepet</h1><p>Seçtiğin ürünleri kontrol et. Ödeme aşamasında fiyat ve uygunluk sunucu tarafından tekrar doğrulanır.</p></div>
  {!items.length?<EmptyState icon="cart" title="Kimliğini oluşturmaya hazır mısın?" description="Sepetinde henüz ürün yok. Yenomi ID ürünlerini inceleyerek dijital kimliğini oluşturmaya başlayabilirsin." action={{ label:"NFC Kartı incele", href:"/urunler/nfc-kart" }} />:
  <div className="yi-cart-layout"><section className="yi-cart-items">{items.map(item=><article className="yi-cart-item" key={item.cartItemId}><div><span>{item.kind==="NFC_PHYSICAL_CARD"?"NFC KART":"DİJİTAL ÜRÜN"}</span><h2>{item.name}</h2><p>{formatTryFromKurus(item.unitPriceKurus)} / adet</p></div><div className="yi-cart-item__controls"><div className="yi-stepper"><button type="button" onClick={()=>update(item.cartItemId,Math.max(1,item.quantity-1))}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" onClick={()=>update(item.cartItemId,item.quantity+1)}>+</button></div><strong>{formatTryFromKurus(item.unitPriceKurus*item.quantity)}</strong><button className="yi-remove" type="button" onClick={()=>remove(item.cartItemId)}>Kaldır</button></div></article>)}</section>
   <aside className="yi-cart-summary"><span>TOPLAM</span><strong>{formatTryFromKurus(total)}</strong><p>Vergi/kargo ve sipariş uygunluğu checkout tarafında gerçek veri üzerinden doğrulanır.</p><Link href="/checkout" className="yi-btn yi-btn--primary">Ödemeye geç</Link><Link href="/urunler" className="yi-btn yi-btn--ghost">Alışverişe devam et</Link></aside>
  </div>}
 </div></main></div>
}

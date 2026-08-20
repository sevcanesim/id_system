import { YenomiProductVisual } from "./YenomiProductVisual";

export function ProductVisual({ light = false, pair = false }: { light?: boolean; pair?: boolean }) {
  return (
    <div className={`yi-product-visual${light && !pair ? " yi-product-visual--light" : ""}${pair ? " yi-product-visual--pair" : ""}`}>
      <div className="yi-orbit yi-orbit--one" />
      <div className="yi-orbit yi-orbit--two" />
      {pair ? (
        <>
          <YenomiProductVisual variant="card" face="front" />
          <YenomiProductVisual variant="card" face="back" />
        </>
      ) : (
        <YenomiProductVisual variant="card" face="front" />
      )}
    </div>
  );
}

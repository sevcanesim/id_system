import type { ReactNode } from "react";
import styles from "./CardPreviewFrame.module.css";

type CardPreviewFrameProps = {
  children: ReactNode;
  compact?: boolean;
  className?: string;
};

export default function CardPreviewFrame({
  children,
  compact = false,
  className,
}: CardPreviewFrameProps) {
  const frameClassName = [
    styles.frame,
    compact ? styles.compact : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClassName}>
      <div className={styles.viewport}>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

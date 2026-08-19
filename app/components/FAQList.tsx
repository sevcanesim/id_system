"use client";

import { useId, useState } from "react";

type FAQItem = readonly [string, string];

export default function FAQList({ items, className = "" }: { items: readonly FAQItem[]; className?: string }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState(-1);
  return (
    <div className={className}>
      {items.map(([question, answer], index) => {
        const open = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div className={`yi-faq-item${open ? " is-open" : ""}`} key={question}>
            <button type="button" className="yi-faq-trigger" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenIndex(open ? -1 : index)}>
              <span>{question}</span><span className="yi-faq-icon" aria-hidden>{open ? "−" : "+"}</span>
            </button>
            <div id={panelId} className="yi-faq-panel" hidden={!open}><p>{answer}</p></div>
          </div>
        );
      })}
    </div>
  );
}

import type { CSSProperties } from "react";
import {
  PAGE_W,
  PAGE_H,
  type PageData,
  type PageElement,
  type PhotoElement,
  type TextElement,
} from "@/lib/types";

const FONT_MAP: Record<TextElement["font"], string> = {
  serif: "var(--font-serif), Georgia, serif",
  script: "var(--font-script), cursive",
  sans: "var(--font-sans), system-ui, sans-serif",
};

export function elementStyle(el: PageElement): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: `rotate(${el.rotation}deg)`,
    zIndex: el.z,
  };
}

function PhotoBody({ el }: { el: PhotoElement }) {
  if (el.frame === "polaroid") {
    return (
      <div className="w-full h-full bg-white photo-shadow flex flex-col p-[6%] pb-0">
        <div className="flex-1 overflow-hidden bg-[#f2efeb]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={el.src} alt="" draggable={false} className="w-full h-full object-cover" />
        </div>
        <div
          className="h-[18%] min-h-[34px] flex items-center justify-center text-[#5a5248] overflow-hidden"
          style={{ fontFamily: FONT_MAP.script, fontSize: Math.max(20, el.w * 0.075) }}
        >
          {el.caption ?? ""}
        </div>
      </div>
    );
  }
  const radius = el.frame === "circle" ? "50%" : el.frame === "rounded" ? 20 : 0;
  return (
    <div className="w-full h-full photo-shadow overflow-hidden bg-[#f2efeb]" style={{ borderRadius: radius }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.src} alt="" draggable={false} className="w-full h-full object-cover" />
    </div>
  );
}

function TextBody({ el }: { el: TextElement }) {
  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        fontFamily: FONT_MAP[el.font],
        fontSize: el.size,
        color: el.color,
        textAlign: el.align,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {el.text}
    </div>
  );
}

export function ElementBody({ el }: { el: PageElement }) {
  if (el.type === "photo") return <PhotoBody el={el} />;
  if (el.type === "text") return <TextBody el={el} />;
  return (
    <div
      className="w-full h-full flex items-center justify-center select-none"
      style={{ fontSize: Math.min(el.w, el.h) * 0.82, lineHeight: 1 }}
    >
      {el.emoji}
    </div>
  );
}

/**
 * Renders one page at its native design size (PAGE_W x PAGE_H).
 * The parent is responsible for scaling it to fit the screen with a
 * CSS transform — that is what keeps every device pixel-identical.
 */
export default function PageRenderer({ data }: { data: PageData }) {
  const sorted = [...data.elements].sort((a, b) => a.z - b.z);
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: PAGE_W, height: PAGE_H, background: data.background }}
    >
      {sorted.map((el) => (
        <div key={el.id} style={elementStyle(el)}>
          <ElementBody el={el} />
        </div>
      ))}
    </div>
  );
}

import type { CSSProperties } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import {
  PAGE_W,
  PAGE_H,
  type EntranceAnim,
  type PageData,
  type PageElement,
  type PhotoElement,
  type PhotoFilter,
  type ShapeElement,
  type TextElement,
  type TextFont,
} from "@/lib/types";

export const FILTER_MAP: Record<PhotoFilter, string> = {
  none: "none",
  bw: "grayscale(1) contrast(1.05)",
  sepia: "sepia(0.55) contrast(1.02)",
  warm: "sepia(0.22) saturate(1.25) brightness(1.05)",
  cool: "saturate(1.1) hue-rotate(-10deg) brightness(1.02)",
  soft: "brightness(1.07) contrast(0.9) saturate(0.88)",
  vivid: "saturate(1.45) contrast(1.1)",
  fade: "contrast(0.82) brightness(1.12) saturate(0.7)",
};

export const FONT_MAP: Record<TextFont, string> = {
  serif: "var(--font-serif), Georgia, serif",
  elegant: "var(--font-elegant), Georgia, serif",
  sans: "var(--font-sans), system-ui, sans-serif",
  script: "var(--font-script), cursive",
  dancing: "var(--font-dancing), cursive",
  hand: "var(--font-hand), cursive",
  type: "var(--font-type), 'Courier New', monospace",
};

// Entrance animations run on an inner wrapper so they never fight the
// element's own rotation transform on the outer positioned div.
export const ENTRANCES: Record<
  Exclude<EntranceAnim, "none">,
  { from: TargetAndTransition; to: TargetAndTransition; spring?: boolean }
> = {
  fade: { from: { opacity: 0 }, to: { opacity: 1 } },
  rise: { from: { opacity: 0, y: 70 }, to: { opacity: 1, y: 0 } },
  drop: { from: { opacity: 0, y: -70 }, to: { opacity: 1, y: 0 } },
  zoom: { from: { opacity: 0, scale: 0.5 }, to: { opacity: 1, scale: 1 } },
  pop: { from: { opacity: 0, scale: 0.2 }, to: { opacity: 1, scale: 1 }, spring: true },
  swing: { from: { opacity: 0, rotate: -12, y: -50 }, to: { opacity: 1, rotate: 0, y: 0 }, spring: true },
  blur: { from: { opacity: 0, filter: "blur(16px)" }, to: { opacity: 1, filter: "blur(0px)" } },
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
    opacity: el.opacity ?? 1,
  };
}

function PhotoBody({ el }: { el: PhotoElement }) {
  const imgStyle: CSSProperties = {
    filter: FILTER_MAP[el.filter ?? "none"],
    transform: el.flip ? "scaleX(-1)" : undefined,
  };
  const shadowClass = el.shadow === false ? "" : "photo-shadow";
  if (el.frame === "polaroid") {
    return (
      <div className={`w-full h-full bg-white ${shadowClass} flex flex-col p-[6%] pb-0`}>
        <div className="flex-1 overflow-hidden bg-[#f2efeb]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={el.src} alt="" draggable={false} className="w-full h-full object-cover" style={imgStyle} />
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
    <div
      className={`w-full h-full ${shadowClass} overflow-hidden bg-[#f2efeb]`}
      style={{
        borderRadius: radius,
        border: el.borderW ? `${el.borderW}px solid ${el.borderColor ?? "#ffffff"}` : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={el.src} alt="" draggable={false} className="w-full h-full object-cover" style={imgStyle} />
    </div>
  );
}

function TextBody({ el }: { el: TextElement }) {
  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        fontFamily: FONT_MAP[el.font] ?? FONT_MAP.serif,
        fontSize: el.size,
        color: el.color,
        textAlign: el.align,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : undefined,
        textTransform: el.uppercase ? "uppercase" : undefined,
        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
        lineHeight: el.lineHeight ?? 1.45,
        textShadow: el.shadow ? "0 2px 14px rgba(43,38,32,0.35)" : undefined,
        background: el.bg || undefined,
        padding: el.bg ? "0.1em 0.35em" : undefined,
        borderRadius: el.bg ? 10 : undefined,
        boxDecorationBreak: el.bg ? ("clone" as const) : undefined,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {el.text}
    </div>
  );
}

function ShapeBody({ el }: { el: ShapeElement }) {
  const border = el.borderW ? `${el.borderW}px solid ${el.borderColor ?? "#2b2620"}` : undefined;
  if (el.shape === "heart") {
    return (
      <svg viewBox="0 0 32 29" className="w-full h-full" preserveAspectRatio="none">
        <path
          d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,20.4 c6.1-8.4,16-11.3,16-20.4C32,3.8,28.2,0,23.6,0z"
          fill={el.fill}
          stroke={el.borderW ? el.borderColor ?? "#2b2620" : undefined}
          strokeWidth={el.borderW ? el.borderW * 0.15 : undefined}
        />
      </svg>
    );
  }
  if (el.shape === "circle") {
    return <div className="w-full h-full" style={{ background: el.fill, borderRadius: "50%", border }} />;
  }
  if (el.shape === "tape") {
    return (
      <div
        className="w-full h-full"
        style={{
          background: el.fill,
          borderRadius: el.radius ?? 2,
          // Slightly torn short edges, like real washi tape.
          clipPath: "polygon(1.5% 0%, 98.5% 4%, 100% 50%, 98% 96%, 2% 100%, 0% 55%)",
        }}
      />
    );
  }
  // rect and line
  return <div className="w-full h-full" style={{ background: el.fill, borderRadius: el.radius ?? 0, border }} />;
}

export function ElementBody({ el }: { el: PageElement }) {
  if (el.type === "photo") return <PhotoBody el={el} />;
  if (el.type === "text") return <TextBody el={el} />;
  if (el.type === "shape") return <ShapeBody el={el} />;
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
 *
 * With `animate`, elements play their entrance animation on mount
 * (used by the viewer; the editor and thumbnails render statically).
 */
export default function PageRenderer({ data, animate = false }: { data: PageData; animate?: boolean }) {
  const sorted = [...data.elements].sort((a, b) => a.z - b.z);
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: PAGE_W, height: PAGE_H, background: data.background }}
    >
      {sorted.map((el, i) => {
        const entrance = animate && el.anim && el.anim !== "none" ? ENTRANCES[el.anim] : null;
        return (
          <div key={el.id} style={elementStyle(el)}>
            {entrance ? (
              <motion.div
                className="w-full h-full"
                initial={entrance.from}
                animate={entrance.to}
                transition={{
                  // Wait for the page transition, then stagger unless the
                  // element has its own delay.
                  delay: 0.45 + (el.animDelay ?? i * 0.12),
                  ...(entrance.spring
                    ? { type: "spring", stiffness: 240, damping: 17 }
                    : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }),
                }}
              >
                <ElementBody el={el} />
              </motion.div>
            ) : (
              <ElementBody el={el} />
            )}
          </div>
        );
      })}
    </div>
  );
}

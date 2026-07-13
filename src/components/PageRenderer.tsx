import type { CSSProperties } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import {
  PAGE_W,
  PAGE_H,
  type EntranceAnim,
  type PageData,
  type PageEffect,
  type PageElement,
  type PhotoElement,
  type PhotoFilter,
  type ShapeElement,
  type TextElement,
  type TextFont,
  type VideoElement,
} from "@/lib/types";

export function isGradient(v: string | undefined): v is string {
  return !!v && /^(linear|radial)-gradient\(/.test(v);
}

export function buildGradient(angle: number, c1: string, c2: string): string {
  return `linear-gradient(${angle}deg, ${c1}, ${c2})`;
}

export function parseGradient(v: string): { angle: number; c1: string; c2: string } {
  const angleMatch = /\((-?\d+)deg/.exec(v);
  const colors = v.match(/#[0-9a-fA-F]{6}/g) ?? [];
  return {
    angle: angleMatch ? Number(angleMatch[1]) : 135,
    c1: colors[0] ?? "#f5b3b8",
    c2: colors[1] ?? "#a8c8e8",
  };
}

/** First solid color in a value, for contexts (textareas) that can't render a gradient. */
export function firstSolid(v: string): string {
  if (!isGradient(v)) return v;
  return v.match(/#[0-9a-fA-F]{6}/)?.[0] ?? "#2b2620";
}

const HEART_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 29'><path d='M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,20.4 c6.1-8.4,16-11.3,16-20.4C32,3.8,28.2,0,23.6,0z'/></svg>"
)}")`;

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

function VideoBody({ el }: { el: VideoElement }) {
  const shadowClass = el.shadow === false ? "" : "photo-shadow";
  const radius = el.frame === "rounded" ? 20 : 0;
  return (
    <div
      className={`w-full h-full ${shadowClass} overflow-hidden bg-black`}
      style={{
        borderRadius: radius,
        border: el.borderW ? `${el.borderW}px solid ${el.borderColor ?? "#ffffff"}` : undefined,
      }}
    >
      <video
        src={el.src}
        className="w-full h-full object-cover"
        controls={el.controls !== false}
        loop={el.loop}
        muted={el.muted}
        autoPlay={el.autoplay}
        playsInline
      />
    </div>
  );
}

const HIGHLIGHT_RADIUS: Record<string, string> = {
  square: "0",
  rounded: "0.35em",
  pill: "1em",
  ellipse: "50%",
  // Irregular corners give a hand-drawn marker stroke feel.
  marker: "0.5em 1.2em 0.6em 1em / 1em 0.5em 1.1em 0.6em",
};

function TextBody({ el }: { el: TextElement }) {
  const gradientText = isGradient(el.color);
  const content = gradientText ? (
    <span
      style={{
        backgroundImage: el.color,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {el.text}
    </span>
  ) : (
    el.text
  );
  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        fontFamily: FONT_MAP[el.font] ?? FONT_MAP.serif,
        fontSize: el.size,
        color: gradientText ? undefined : el.color,
        textAlign: el.align,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        textDecoration: el.underline ? "underline" : undefined,
        textTransform: el.uppercase ? "uppercase" : undefined,
        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
        lineHeight: el.lineHeight ?? 1.45,
        textShadow: el.shadow ? "0 2px 14px rgba(43,38,32,0.35)" : undefined,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {el.bg ? (
        // The highlight lives on an inline span so it hugs each line of
        // text (like a real marker) instead of filling the whole box.
        <span
          style={{
            background: el.bg,
            padding: "0.08em 0.4em",
            borderRadius: HIGHLIGHT_RADIUS[el.bgStyle ?? "rounded"],
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          {content}
        </span>
      ) : (
        content
      )}
    </div>
  );
}

function ShapeBody({ el }: { el: ShapeElement }) {
  const border = el.borderW ? `${el.borderW}px solid ${el.borderColor ?? "#2b2620"}` : undefined;
  if (el.shape === "heart") {
    // CSS mask (not SVG fill) so gradients work here exactly like every
    // other shape; the border is a second, inset copy of the same mask.
    const maskStyle: CSSProperties = {
      WebkitMaskImage: HEART_MASK,
      maskImage: HEART_MASK,
      WebkitMaskSize: "100% 100%",
      maskSize: "100% 100%",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
    };
    return (
      <div className="relative w-full h-full">
        {el.borderW ? (
          <div className="absolute inset-0" style={{ ...maskStyle, background: el.borderColor ?? "#2b2620" }} />
        ) : null}
        <div
          className="absolute"
          style={{ ...maskStyle, background: el.fill, inset: el.borderW ?? 0 }}
        />
      </div>
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

/* ---- Ambient background effects ---- */

const HEART_SPRITES = [
  { left: "6%", size: 44, dur: 11, delay: 0 },
  { left: "18%", size: 26, dur: 14, delay: 3 },
  { left: "32%", size: 36, dur: 12, delay: 6 },
  { left: "47%", size: 22, dur: 15, delay: 1.5 },
  { left: "60%", size: 40, dur: 13, delay: 8 },
  { left: "73%", size: 28, dur: 16, delay: 4 },
  { left: "86%", size: 46, dur: 12, delay: 9 },
  { left: "93%", size: 20, dur: 17, delay: 2 },
];

const SPARKLE_SPRITES = [
  { left: "8%", top: "12%", size: 26, dur: 3.2, delay: 0 },
  { left: "22%", top: "38%", size: 18, dur: 4.1, delay: 1.1 },
  { left: "35%", top: "8%", size: 32, dur: 3.6, delay: 2.2 },
  { left: "52%", top: "26%", size: 20, dur: 4.5, delay: 0.6 },
  { left: "67%", top: "14%", size: 28, dur: 3.9, delay: 1.8 },
  { left: "82%", top: "34%", size: 22, dur: 3.4, delay: 2.9 },
  { left: "14%", top: "68%", size: 24, dur: 4.2, delay: 0.9 },
  { left: "44%", top: "58%", size: 18, dur: 3.7, delay: 2.5 },
  { left: "74%", top: "64%", size: 30, dur: 4.4, delay: 1.4 },
  { left: "88%", top: "82%", size: 20, dur: 3.5, delay: 0.3 },
  { left: "28%", top: "88%", size: 26, dur: 4.0, delay: 1.9 },
  { left: "58%", top: "80%", size: 22, dur: 3.8, delay: 3.1 },
];

const BOKEH_SPRITES = [
  { left: "4%", top: "10%", size: 190, color: "rgba(213,138,157,0.28)", anim: "os-drift-a 16s ease-in-out infinite" },
  { left: "68%", top: "4%", size: 150, color: "rgba(240,217,168,0.30)", anim: "os-drift-b 19s ease-in-out infinite" },
  { left: "80%", top: "42%", size: 220, color: "rgba(168,200,232,0.26)", anim: "os-drift-a 22s ease-in-out infinite" },
  { left: "10%", top: "56%", size: 160, color: "rgba(203,179,224,0.26)", anim: "os-drift-b 18s ease-in-out infinite" },
  { left: "42%", top: "74%", size: 200, color: "rgba(184,216,181,0.26)", anim: "os-drift-a 20s ease-in-out infinite" },
  { left: "36%", top: "28%", size: 110, color: "rgba(245,179,184,0.30)", anim: "os-drift-b 15s ease-in-out infinite" },
];

function EffectLayer({ effect }: { effect: PageEffect }) {
  if (effect === "glow") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute"
          style={{
            width: 760, height: 760, left: -180, top: -160,
            background: "radial-gradient(circle, rgba(213,138,157,0.34), transparent 65%)",
            filter: "blur(48px)", animation: "os-drift-a 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 680, height: 680, right: -160, bottom: -140,
            background: "radial-gradient(circle, rgba(240,205,175,0.34), transparent 65%)",
            filter: "blur(48px)", animation: "os-drift-b 19s ease-in-out infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 520, height: 520, left: "32%", top: "38%",
            background: "radial-gradient(circle, rgba(203,179,224,0.24), transparent 65%)",
            filter: "blur(52px)", animation: "os-drift-a 23s ease-in-out infinite",
          }}
        />
      </div>
    );
  }
  if (effect === "hearts") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {HEART_SPRITES.map((h, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              left: h.left, bottom: -70, fontSize: h.size, color: "rgba(183,110,121,0.4)",
              animation: `os-float-up ${h.dur}s linear ${h.delay}s infinite`,
            }}
          >
            ♥
          </span>
        ))}
      </div>
    );
  }
  if (effect === "sparkles") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {SPARKLE_SPRITES.map((s, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              left: s.left, top: s.top, fontSize: s.size, color: "rgba(201,162,39,0.75)",
              animation: `os-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            ✦
          </span>
        ))}
      </div>
    );
  }
  if (effect === "bokeh") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BOKEH_SPRITES.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: b.left, top: b.top, width: b.size, height: b.size,
              background: b.color, filter: "blur(10px)", animation: b.anim,
            }}
          />
        ))}
      </div>
    );
  }
  return null;
}

export function ElementBody({ el }: { el: PageElement }) {
  if (el.type === "photo") return <PhotoBody el={el} />;
  if (el.type === "text") return <TextBody el={el} />;
  if (el.type === "shape") return <ShapeBody el={el} />;
  if (el.type === "video") return <VideoBody el={el} />;
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
      {data.effect && data.effect !== "none" && <EffectLayer effect={data.effect} />}
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

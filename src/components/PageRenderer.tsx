import React, { useRef, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, type TargetAndTransition } from "framer-motion";
import {
  PAGE_W,
  PAGE_H,
  type AudioElement,
  type EntranceAnim,
  type EnvelopeElement,
  type MapElement,
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
  { from: TargetAndTransition; to: TargetAndTransition; spring?: boolean; linear?: boolean; loop?: "loop" | "reverse" | "mirror" }
> = {
  fade: { from: { opacity: 0 }, to: { opacity: 1 } },
  rise: { from: { opacity: 0, y: 70 }, to: { opacity: 1, y: 0 } },
  drop: { from: { opacity: 0, y: -70 }, to: { opacity: 1, y: 0 } },
  zoom: { from: { opacity: 0, scale: 0.5 }, to: { opacity: 1, scale: 1 } },
  pop: { from: { opacity: 0, scale: 0.2 }, to: { opacity: 1, scale: 1 }, spring: true },
  swing: { from: { opacity: 0, rotate: -12, y: -50 }, to: { opacity: 1, rotate: 0, y: 0 }, spring: true },
  blur: { from: { opacity: 0, filter: "blur(16px)" }, to: { opacity: 1, filter: "blur(0px)" } },
  typewriter: { from: { clipPath: "inset(0 100% 0 0)" }, to: { clipPath: "inset(0 0% 0 0)" }, linear: true },
  "typewriter-loop": { from: { clipPath: "inset(0 100% 0 0)" }, to: { clipPath: "inset(0 0% 0 0)" }, linear: true, loop: "reverse" },
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

function PhotoBody({ el, animate }: { el: PhotoElement; animate: boolean }) {
  const imgStyle: CSSProperties = {
    filter: FILTER_MAP[el.filter ?? "none"],
    transform: el.flip ? "scaleX(-1)" : undefined,
    objectPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`,
  };
  const shadowClass = el.shadow === false ? "" : "photo-shadow";
  const radius = el.frame === "circle" ? "50%" : el.frame === "rounded" ? 20 : 0;
  
  let content = null;
  if (el.frame === "polaroid") {
    content = (
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
  } else {
    content = (
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

  return (
    <ScratchOffOverlay el={el} animate={animate}>
      {content}
    </ScratchOffOverlay>
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
          className="absolute bg-cover"
          style={{ ...maskStyle, background: el.src ? undefined : el.fill, backgroundImage: el.src ? `url(${el.src})` : undefined, backgroundPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`, inset: el.borderW ?? 0 }}
        />
      </div>
    );
  }
  if (el.shape === "circle") {
    return <div className="w-full h-full bg-cover" style={{ background: el.src ? undefined : el.fill, backgroundImage: el.src ? `url(${el.src})` : undefined, backgroundPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`, borderRadius: "50%", border }} />;
  }
  if (el.shape === "tape") {
    return (
      <div
        className="w-full h-full bg-cover"
        style={{
          background: el.src ? undefined : el.fill,
          backgroundImage: el.src ? `url(${el.src})` : undefined,
          backgroundPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`,
          borderRadius: el.radius ?? 2,
          // Slightly torn short edges, like real washi tape.
          clipPath: "polygon(1.5% 0%, 98.5% 4%, 100% 50%, 98% 96%, 2% 100%, 0% 55%)",
        }}
      />
    );
  }
  // rect and line
  return <div className="w-full h-full bg-cover" style={{ background: el.src ? undefined : el.fill, backgroundImage: el.src ? `url(${el.src})` : undefined, backgroundPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`, borderRadius: el.radius ?? 0, border }} />;
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

const SNOW_SPRITES = Array.from({ length: 25 }).map((_, i) => ({
  left: `${Math.random() * 100}%`,
  size: 4 + Math.random() * 8,
  dur: 6 + Math.random() * 10,
  delay: Math.random() * -10,
  opacity: 0.3 + Math.random() * 0.6,
}));

const BUBBLE_SPRITES = Array.from({ length: 15 }).map((_, i) => ({
  left: `${Math.random() * 100}%`,
  size: 10 + Math.random() * 30,
  dur: 8 + Math.random() * 8,
  delay: Math.random() * -10,
}));

const CONFETTI_SPRITES = Array.from({ length: 30 }).map((_, i) => ({
  left: `${Math.random() * 100}%`,
  size: 6 + Math.random() * 10,
  dur: 4 + Math.random() * 6,
  delay: Math.random() * -10,
  color: ["#ff718d", "#fdff6a", "#7a5fff", "#5fffaa", "#ff8e5f"][i % 5],
  rot: Math.random() * 360,
  rotDur: 2 + Math.random() * 3,
}));

const STAR_SPRITES = Array.from({ length: 20 }).map((_, i) => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: 1 + Math.random() * 3,
  dur: 2 + Math.random() * 3,
  delay: Math.random() * -5,
}));

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
  if (effect === "snow") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {SNOW_SPRITES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left, top: -20, width: s.size, height: s.size, opacity: s.opacity,
              animation: `os-snow-fall ${s.dur}s linear ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  if (effect === "bubbles") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BUBBLE_SPRITES.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/40"
            style={{
              left: b.left, bottom: -40, width: b.size, height: b.size,
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent)",
              animation: `os-float-up ${b.dur}s ease-in ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  if (effect === "confetti") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CONFETTI_SPRITES.map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: c.left, top: -20, width: c.size, height: c.size * 1.5,
              background: c.color,
              animation: `os-snow-fall ${c.dur}s linear ${c.delay}s infinite`,
            }}
          >
            <div style={{ width: "100%", height: "100%", animation: `os-spin ${c.rotDur}s linear infinite` }} />
          </div>
        ))}
      </div>
    );
  }
  if (effect === "stars") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STAR_SPRITES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left, top: s.top, width: s.size, height: s.size,
              boxShadow: "0 0 4px 1px rgba(255,255,255,0.6)",
              animation: `os-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }
  return null;
}

function ScratchOffOverlay({ el, children, animate }: { el: PhotoElement; children: React.ReactNode; animate: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!animate || !el.scratchOff) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#b0b0b0" : "#d0d0d0";
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
  }, [animate, el.scratchOff, el.w, el.h]);

  const handleScratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!animate || !el.scratchOff) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  };

  if (!el.scratchOff) return <>{children}</>;

  return (
    <div className="w-full h-full relative">
      {children}
      <canvas 
        ref={canvasRef}
        width={el.w}
        height={el.h}
        className="absolute inset-0 w-full h-full cursor-pointer touch-none"
        style={{ pointerEvents: animate ? "auto" : "none", zIndex: 10, borderRadius: el.frame === "polaroid" ? 0 : (el.frame === "circle" ? "50%" : 0) }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === "touch") handleScratch(e);
        }}
        onPointerDown={handleScratch}
      />
    </div>
  );
}

function AudioBody({ el }: { el: AudioElement }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-hairline relative">
      <div className="text-3xl mb-2">🎵</div>
      <audio
        controls
        src={el.src}
        autoPlay={el.autoplay}
        loop={el.loop}
        className="w-[90%] h-10"
        style={{ pointerEvents: "auto" }}
      />
    </div>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Rose/cream envelope palette — deep enough contrast to read clearly as
// folded paper, without leaving the app's blush theme.
const ENV_FRONT = "#c98a92"; // lighter flap face
const ENV_BODY = "#b76e79"; // main body / back-fold
const ENV_CREASE = "#9c5c66"; // shaded crease / side-folds

type EnvPhase = "closed" | "opening" | "reading" | "closing";

function EnvelopeBody({ el, animate }: { el: EnvelopeElement; animate: boolean }) {
  // One continuous choreography per tap:
  //   closed -> opening (seal cracks, flap swings behind, letter rises)
  //          -> reading (letter flies from its on-screen spot to fullscreen)
  //   close  -> closing (letter flies back, tucks in, flap folds, seal returns)
  //          -> closed
  const [phase, setPhase] = useState<EnvPhase>("closed");
  // Mid-rotation the flap drops behind the letter, like real paper.
  const [flapBehind, setFlapBehind] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  // Where the fullscreen card flies from/to (letter's real screen position).
  const [flyFrom, setFlyFrom] = useState<{ x: number; y: number; scale: number } | null>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  
  useEffect(() => {
    if (phase === "reading" && !!el.envelopeSrc && !!el.envelopeText && !imgFailed && !showBack) {
      const t = setTimeout(() => {
        setShowBack(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [phase, el.envelopeSrc, el.envelopeText, imgFailed, showBack]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const hasPhoto = !!el.envelopeSrc && !imgFailed;
  const hasText = !!el.envelopeText;
  const backColor = el.cardBackColor || "#ffffff";
  const tucked = phase === "closed" || phase === "closing";

  const open = () => {
    if (phase !== "closed") return;
    setPhase("opening");
    later(() => setFlapBehind(true), 600); // flap passes edge-on (~90° of its ~124° swing)
    later(() => {
      const r = letterRef.current?.getBoundingClientRect();
      if (r) {
        const cardW = Math.min(448, window.innerWidth - 48);
        setFlyFrom({
          x: r.left + r.width / 2 - window.innerWidth / 2,
          y: r.top + r.height / 2 - window.innerHeight / 2,
          scale: Math.max(0.08, r.width / cardW),
        });
      } else {
        setFlyFrom(null);
      }
      setPhase("reading");
    }, 1300);
  };

  const close = () => {
    if (phase !== "reading") return;
    setShowBack(false);
    setPhase("closing");
    later(() => setFlapBehind(false), 1140); // flap swings back past edge-on, over the letter
    later(() => setPhase("closed"), 1750);
  };

  const letterFace = (bg: string, isBack: boolean = false) => (
    <div className="w-full h-full flex items-center justify-center p-10" style={{ background: bg }}>
      {hasText ? (
        <motion.p
          className="text-center whitespace-pre-wrap drop-shadow-sm"
          style={{
            fontFamily: "var(--font-elegant), Georgia, serif",
            fontSize: "clamp(1.05rem, 3.2vw, 1.4rem)",
            lineHeight: 1.75,
            color: "#3a332c",
          }}
          initial={{ opacity: isBack ? 0 : 1, y: isBack ? 15 : 0, scale: isBack ? 0.95 : 1 }}
          animate={{ 
            opacity: (!isBack || showBack) ? 1 : 0, 
            y: (!isBack || showBack) ? 0 : 15,
            scale: (!isBack || showBack) ? 1 : 0.95
          }}
          transition={{ duration: 0.6, delay: isBack ? 0.5 : 0, ease: EASE }}
        >
          {el.envelopeText}
        </motion.p>
      ) : (
        <p className="text-ink-soft italic text-sm" style={{ fontFamily: "var(--font-elegant), Georgia, serif" }}>
          This envelope is empty — add a letter or a photo in the editor.
        </p>
      )}
    </div>
  );

  const portal =
    mounted && (phase === "reading" || phase === "closing")
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            style={{ pointerEvents: phase === "reading" ? "auto" : "none" }}
            onClick={close}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === "reading" ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              style={{ background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(20px)" }}
            />
            <motion.div
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
              initial={
                flyFrom
                  ? { x: flyFrom.x, y: flyFrom.y, scale: flyFrom.scale, opacity: 1 }
                  : { opacity: 0, scale: 0.92 }
              }
              animate={
                phase === "reading"
                  ? { x: 0, y: 0, scale: 1, opacity: 1 }
                  : flyFrom
                  ? { x: flyFrom.x, y: flyFrom.y, scale: flyFrom.scale, opacity: 0 }
                  : { opacity: 0, scale: 0.9 }
              }
              transition={{
                duration: 0.55,
                ease: EASE,
                // When flying home, land first, then hand off to the letter.
                opacity:
                  phase === "closing" ? { delay: 0.42, duration: 0.18 } : { duration: 0.3 },
              }}
            >
              <motion.button
                onClick={close}
                aria-label="Close"
                animate={{ opacity: phase === "reading" ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white border flex items-center justify-center text-[#8a8178] hover:text-[#b76e79] transition-colors"
                style={{ borderColor: "#ece7e0", boxShadow: "0 6px 20px rgba(43,38,32,0.18)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </motion.button>

              <div style={{ perspective: 1800 }}>
                {/* Clipping wrapper: rounded corners live here, and only
                    here. Mixing overflow-hidden with the 3D flip on the
                    same element is what was rendering a face as solid
                    black — browsers can't reliably do both on one box. */}
                <div
                  className="relative w-full rounded-2xl overflow-hidden"
                  style={{ height: hasPhoto ? 380 : 320, boxShadow: "0 24px 60px rgba(43,38,32,0.22)" }}
                >
                  {/* Flip wrapper: the actual 3D rotation, no clipping here. */}
                  <div
                    className="absolute inset-0"
                    style={{
                      transformStyle: "preserve-3d",
                      transition: "transform 0.75s cubic-bezier(0.22,1,0.36,1)",
                      transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                    <div className="absolute inset-0 bg-white" style={{ backfaceVisibility: "hidden" }}>
                      {hasPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={el.envelopeSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => setImgFailed(true)}
                        />
                      ) : (
                        letterFace("#ffffff")
                      )}
                    </div>
                    {hasPhoto && (
                      <div
                        className="absolute inset-0"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: backColor }}
                      >
                        {letterFace(backColor, true)}
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Exit prompt */}
              <motion.div 
                className="absolute -bottom-10 left-0 right-0 text-center text-white/80 font-sans tracking-[0.2em] text-[11px] uppercase pointer-events-none drop-shadow-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: (phase === "reading" && (!hasPhoto || !hasText || showBack)) ? 1 : 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Click outside to exit
              </motion.div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

  // Per-phase timing so opening and closing each read as one motion.
  const flapTransition =
    phase === "opening"
      ? { delay: 0.22, duration: 0.55, ease: EASE }
      : phase === "closing"
      ? { delay: 1.0, duration: 0.5, ease: EASE }
      : { duration: 0.45, ease: EASE };

  const letterTopTransition =
    phase === "opening"
      ? { delay: 0.66, duration: 0.6, ease: EASE }
      : phase === "closing"
      ? { delay: 0.6, duration: 0.55, ease: EASE }
      : { duration: 0.4, ease: EASE };

  const sealTransition =
    phase === "closing"
      ? { delay: 1.4, duration: 0.3, ease: EASE }
      : { duration: 0.28, ease: EASE };

  return (
    <div
      className="w-full h-full relative select-none"
      style={{ pointerEvents: animate ? "auto" : "none", perspective: 1400 }}
    >
      {/* Clipped flush on the sides/bottom so nothing pokes out past the
          envelope's own footprint, but wide open above so the letter can
          actually rise out of it. */}
      <div
        onClick={open}
        className="absolute inset-0"
        style={{
          cursor: phase === "closed" ? "pointer" : "default",
          // Rounded to match the inner layers so no hairline seam shows at
          // the corners; open above (-100%) so the letter can rise out.
          clipPath: "inset(-100% 0px 0px 0px round 6px)",
          // Perspective set right at the flap's parent (not just further up
          // the tree) so its rotation actually foreshortens in 3D instead
          // of rendering as a flat mirror-flip.
          perspective: 1400,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Back panel — the inside of the envelope */}
        <div
          className="absolute inset-0"
          style={{ background: ENV_BODY, borderRadius: 6, boxShadow: "0 10px 28px rgba(43,38,32,0.2)", zIndex: 0 }}
        />

        {/* The letter — hidden bottom tucked behind the front pocket, rises out on open */}
        <motion.div
          ref={letterRef}
          className="absolute left-[8%] right-[8%] rounded-[3px] bg-white overflow-hidden"
          style={{
            height: "68%",
            zIndex: 2,
            // A soft shadow along the top edge sells the "tucked under the
            // pocket fold" look and blends the seam instead of a hard cut.
            boxShadow: "0 3px 14px rgba(43,38,32,0.25), inset 0 10px 12px -10px rgba(43,38,32,0.45)",
          }}
          initial={false}
          animate={{ top: tucked ? "40%" : "-30%", opacity: phase === "reading" ? 0 : 1 }}
          transition={{
            top: letterTopTransition,
            opacity:
              phase === "reading"
                ? { delay: 0.15, duration: 0.15 }
                : { delay: 0.4, duration: 0.15 },
          }}
        >
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={el.envelopeSrc}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <>
              <div
                className="h-[12%]"
                style={{
                  background: `repeating-linear-gradient(-45deg, ${ENV_BODY}, ${ENV_BODY} 6px, transparent 6px, transparent 13px)`,
                }}
              />
              <div className="mt-[10%] ml-[6%] h-[7%] w-[45%] rounded-sm" style={{ background: ENV_BODY, opacity: 0.55 }} />
              <div className="mt-[7%] ml-[6%] h-[7%] w-[25%] rounded-sm" style={{ background: ENV_BODY, opacity: 0.35 }} />
              <div
                className="absolute rounded-full"
                style={{ right: "8%", top: "22%", width: "15%", paddingBottom: "15%", background: ENV_BODY, opacity: 0.25 }}
              />
            </>
          )}
        </motion.div>

        {/* Front pocket — side + bottom folds that keep the letter tucked.
            Each casts a soft shadow onto the layer behind it for real depth. */}
        <div
          className="absolute inset-0"
          style={{
            background: ENV_CREASE,
            clipPath: "polygon(0% 0%, 0% 100%, 52% 50%)",
            borderRadius: 6,
            zIndex: 3,
            filter: "drop-shadow(2px 0 3px rgba(43,38,32,0.18))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: ENV_CREASE,
            clipPath: "polygon(100% 0%, 100% 100%, 48% 50%)",
            borderRadius: 6,
            zIndex: 3,
            filter: "drop-shadow(-2px 0 3px rgba(43,38,32,0.18))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "#aa6570",
            clipPath: "polygon(0% 100%, 100% 100%, 50% 48%)",
            borderRadius: 6,
            zIndex: 3,
            filter: "drop-shadow(0 -3px 5px rgba(43,38,32,0.2))",
          }}
        />

        {/* Flap — hinged at the top edge. Swings open to a believable resting
            angle (not a flat 180° mirror-flip) so it recedes in perspective
            and settles behind the letter, the way real paper actually folds. */}
        <motion.div
          className="absolute inset-x-0 top-0"
          style={{
            height: "56%",
            background: `linear-gradient(150deg, #d9a6ac 0%, ${ENV_FRONT} 38%, ${ENV_BODY} 100%)`,
            clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
            transformOrigin: "top center",
            transformStyle: "preserve-3d",
            borderRadius: "6px 6px 0 0",
            zIndex: flapBehind ? 1 : 4,
            filter: flapBehind
              ? "drop-shadow(0 4px 8px rgba(43,38,32,0.25)) brightness(0.85)"
              : "drop-shadow(0 8px 16px rgba(43,38,32,0.3))",
          }}
          initial={false}
          animate={{ rotateX: tucked ? 0 : -124 }}
          transition={flapTransition}
        />

        {/* Wax seal — cracks away the moment the envelope is tapped */}
        <motion.div
          className="absolute left-1/2 top-[27%] rounded-full"
          style={{
            width: "17%",
            paddingBottom: "17%",
            x: "-50%",
            y: "-50%",
            zIndex: 5,
            background: "radial-gradient(circle at 35% 30%, #d59aa1, #8a4d56)",
            boxShadow: "0 3px 10px rgba(90,45,52,0.45)",
          }}
          initial={false}
          animate={{
            scale: tucked ? 1 : 0.25,
            opacity: tucked ? 1 : 0,
            rotate: tucked ? 0 : 45,
          }}
          transition={sealTransition}
        >
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage: HEART_MASK,
              maskImage: HEART_MASK,
              WebkitMaskSize: "40% 40%",
              maskSize: "40% 40%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              background: "#fdf1ee",
            }}
          />
        </motion.div>
      </div>

      {/* Soft ground shadow that eases as the letter lifts away */}
      <motion.div
        className="absolute left-1/2 pointer-events-none"
        style={{
          bottom: "-8%",
          width: "70%",
          height: "10%",
          x: "-50%",
          background: "radial-gradient(rgba(43,38,32,0.22), rgba(43,38,32,0) 70%)",
        }}
        initial={false}
        animate={{ scaleX: tucked ? 1 : 0.72, opacity: tucked ? 1 : 0.65 }}
        transition={{ duration: 0.6, ease: EASE }}
      />

      <motion.div
        className="absolute inset-x-0 -bottom-6 text-center pointer-events-none"
        initial={false}
        animate={{ opacity: phase === "closed" ? 1 : 0, y: phase === "closed" ? [0, -4, 0] : 10 }}
        transition={
          phase === "closed" 
            ? { y: { repeat: Infinity, duration: 2, ease: "easeInOut" }, opacity: { duration: 0.3 } } 
            : { duration: 0.3 }
        }
      >
        <span className="label-caps px-3 py-1.5 bg-white/80 rounded-full shadow-sm">Tap to open</span>
      </motion.div>

      {portal}
    </div>
  );
}

function MapBody({ el }: { el: MapElement }) {
  return (
    <div 
      className="w-full h-full bg-paper overflow-hidden relative shadow-md pointer-events-none"
      style={{
        borderRadius: 16,
        borderWidth: el.borderW ?? 0,
        borderColor: el.borderColor ?? "transparent",
        borderStyle: "solid"
      }}
    >
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0, pointerEvents: "auto" }}
        loading="lazy"
        allowFullScreen
        src={`https://www.google.com/maps?q=${encodeURIComponent(el.query || "Paris")}&output=embed`}
      />
    </div>
  );
}

export function ElementBody({ el, animate }: { el: PageElement; animate: boolean }) {
  if (el.type === "photo") return <PhotoBody el={el} animate={animate} />;
  if (el.type === "text") return <TextBody el={el} />;
  if (el.type === "shape") return <ShapeBody el={el} />;
  if (el.type === "video") return <VideoBody el={el} />;
  if (el.type === "audio") return <AudioBody el={el} />;
  if (el.type === "envelope") return <EnvelopeBody el={el} animate={animate} />;
  if (el.type === "map") return <MapBody el={el} />;
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
  const isAnimatedBg = data.background.includes("Animated");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <div
      className={`relative overflow-hidden ${isAnimatedBg ? "bg-[length:200%_200%] animate-[os-gradient-pan_8s_ease_infinite]" : ""}`}
      style={{ width: PAGE_W, height: PAGE_H, background: data.background }}
    >
      {mounted && data.effect && data.effect !== "none" && <EffectLayer effect={data.effect} />}
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
                  delay: 0.45 + (el.animDelay ?? i * 0.12),
                  ...(entrance.spring
                    ? { type: "spring", stiffness: 240, damping: 17 }
                    : { 
                        duration: el.animDuration ?? (entrance.linear ? 1.5 : 0.65), 
                        ease: entrance.linear ? "linear" : [0.22, 1, 0.36, 1],
                        ...(entrance.loop ? { repeat: Infinity, repeatType: entrance.loop, repeatDelay: 1.5 } : {})
                      }),
                }}
              >
                <ElementBody el={el} animate={animate} />
              </motion.div>
            ) : (
              <ElementBody el={el} animate={animate} />
            )}
          </div>
        );
      })}
    </div>
  );
}

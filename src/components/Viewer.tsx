"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import Link from "next/link";
import { PAGE_W, PAGE_H, type Page, type Transition } from "@/lib/types";
import PageRenderer from "./PageRenderer";

// dir: 1 = forward, -1 = backward
const VARIANTS: Record<Transition, Variants> = {
  fade: {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    enter: (dir: number) => ({ x: dir > 0 ? "70%" : "-70%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-70%" : "70%", opacity: 0 }),
  },
  zoom: {
    enter: { scale: 0.82, opacity: 0 },
    center: { scale: 1, opacity: 1 },
    exit: { scale: 1.1, opacity: 0 },
  },
  flip: {
    enter: (dir: number) => ({ rotateY: dir > 0 ? 70 : -70, opacity: 0 }),
    center: { rotateY: 0, opacity: 1 },
    exit: (dir: number) => ({ rotateY: dir > 0 ? -70 : 70, opacity: 0 }),
  },
  flipup: {
    enter: (dir: number) => ({ rotateX: dir > 0 ? -70 : 70, opacity: 0 }),
    center: { rotateX: 0, opacity: 1 },
    exit: (dir: number) => ({ rotateX: dir > 0 ? 70 : -70, opacity: 0 }),
  },
  rise: {
    enter: { y: 90, opacity: 0 },
    center: { y: 0, opacity: 1 },
    exit: { y: -60, opacity: 0 },
  },
  blur: {
    enter: { opacity: 0, filter: "blur(18px)" },
    center: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(18px)" },
  },
  spiral: {
    enter: (dir: number) => ({ rotate: dir > 0 ? 9 : -9, scale: 0.7, opacity: 0 }),
    center: { rotate: 0, scale: 1, opacity: 1 },
    exit: (dir: number) => ({ rotate: dir > 0 ? -7 : 7, scale: 1.08, opacity: 0 }),
  },
  none: {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * Computes the scale factor that fits the design canvas (PAGE_W × PAGE_H)
 * inside the current viewport, with a small padding factor.
 * Uses visualViewport when available so the value is correct even when the
 * browser's on-screen keyboard or address bar has resized the window.
 */
function useFitScale(padding = 0.94) {
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () => {
      const vp = window.visualViewport ?? window;
      const w = "width" in vp ? vp.width! : window.innerWidth;
      const h = "height" in vp ? vp.height! : window.innerHeight;
      setScale(Math.min(w / PAGE_W, h / PAGE_H) * padding);
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [padding]);
  return scale;
}

/** Fades away after the first swipe so it never bothers the user again. */
function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-20 flex items-center justify-center gap-2 pointer-events-none select-none"
      style={{ animation: "os-swipe-hint 3s ease-in-out forwards" }}
    >
      <span className="text-lg">←</span>
      <span className="text-xs tracking-widest uppercase text-ink/40 font-[family-name:var(--font-sans)]">
        swipe
      </span>
      <span className="text-lg">→</span>
    </div>
  );
}

export default function Viewer({ pages }: { pages: Page[] }) {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 1]);
  const scale = useFitScale();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // Only show the swipe hint on touch devices on first load.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if ("ontouchstart" in window) setShowHint(true);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setShowHint(false); // dismiss hint on first interaction
      setIndex(([i]) => {
        const next = Math.min(Math.max(i + delta, 0), pages.length - 1);
        return next === i ? [i, delta] : [next, delta];
      });
    },
    [pages.length]
  );

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (pages.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-canvas-bg gap-4 px-6 text-center">
        <div className="font-[family-name:var(--font-script)] text-accent text-5xl">Our Story</div>
        <p className="text-ink-soft max-w-xs">
          Nothing here yet — the first page is waiting to be written.
        </p>
        <Link href="/editor" className="label-caps underline underline-offset-4 hover:text-accent">
          Open the editor
        </Link>
      </main>
    );
  }

  const page = pages[index];
  const variants = VARIANTS[page.transition] ?? VARIANTS.fade;

  return (
    <main
      className="flex-1 relative overflow-hidden bg-canvas-bg select-none overscroll-none h-screen-safe"
      style={{
        // perspective for flip/spiral transitions
        perspective: 1800,
        // "none" gives our touch handlers full control — prevents the browser
        // from simultaneously scrolling while the user tries to swipe pages.
        touchAction: "none",
      }}
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchMove={(e) => {
        // Prevent rubber-band / pull-to-refresh on iOS while swiping.
        e.preventDefault();
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        // Only trigger if clearly horizontal (avoids accidental navigation on vertical scroll gestures).
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
    >
      <AnimatePresence custom={dir} mode="popLayout">
        <motion.div
          key={page.id}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: page.transition === "none" ? 0.01 : 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <div className="shadow-[0_20px_60px_rgba(43,38,32,0.16)]">
                <PageRenderer data={page.data} animate />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {index > 0 && (
        <button
          onClick={() => go(-1)}
          aria-label="Previous page"
          className="absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-paper/80 backdrop-blur border border-hairline text-ink-soft hover:text-accent hover:border-accent transition-colors flex items-center justify-center z-10"
          style={{ left: "max(0.75rem, env(safe-area-inset-left))" }}
        >
          ←
        </button>
      )}
      {index < pages.length - 1 && (
        <button
          onClick={() => go(1)}
          aria-label="Next page"
          className="absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-paper/80 backdrop-blur border border-hairline text-ink-soft hover:text-accent hover:border-accent transition-colors flex items-center justify-center z-10"
          style={{ right: "max(0.75rem, env(safe-area-inset-right))" }}
        >
          →
        </button>
      )}

      {/* Progress dots — lifted above the iOS home bar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex gap-2"
        style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
      >
        {pages.map((p, i) => (
          <button
            key={p.id}
            aria-label={`Go to page ${i + 1}`}
            onClick={() => setIndex(([cur]) => [i, i > cur ? 1 : -1])}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-accent" : "w-1.5 bg-ink/20 hover:bg-ink/40"
            }`}
          />
        ))}
      </div>

      {/* Page title — below the notch/Dynamic Island (HIDDEN) */}
      {/*
      <div
        className="absolute left-1/2 -translate-x-1/2 label-caps"
        style={{ top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))" }}
      >
        {page.title || `Page ${index + 1}`}
      </div>
      */}

      {/* Swipe hint — only shown on touch devices, fades out automatically */}
      {showHint && pages.length > 1 && <SwipeHint />}
    </main>
  );
}

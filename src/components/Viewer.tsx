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
  rise: {
    enter: { y: 90, opacity: 0 },
    center: { y: 0, opacity: 1 },
    exit: { y: -60, opacity: 0 },
  },
};

function useFitScale(padding = 0.94) {
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / PAGE_W, window.innerHeight / PAGE_H) * padding);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [padding]);
  return scale;
}

export default function Viewer({ pages }: { pages: Page[] }) {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 1]);
  const scale = useFitScale();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => {
      setIndex(([i]) => {
        const next = Math.min(Math.max(i + delta, 0), pages.length - 1);
        return next === i ? [i, delta] : [next, delta];
      });
    },
    [pages.length]
  );

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
      className="flex-1 relative overflow-hidden bg-canvas-bg select-none"
      style={{ perspective: 1800, touchAction: "pan-y" }}
      onTouchStart={(e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      }}
    >
      <AnimatePresence custom={dir} mode="popLayout" initial={false}>
        <motion.div
          key={page.id}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <div className="shadow-[0_20px_60px_rgba(43,38,32,0.16)]">
                <PageRenderer data={page.data} />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows (desktop) */}
      {index > 0 && (
        <button
          onClick={() => go(-1)}
          aria-label="Previous page"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-paper/80 backdrop-blur border border-hairline text-ink-soft hover:text-accent hover:border-accent transition-colors items-center justify-center hidden sm:flex"
        >
          ←
        </button>
      )}
      {index < pages.length - 1 && (
        <button
          onClick={() => go(1)}
          aria-label="Next page"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-paper/80 backdrop-blur border border-hairline text-ink-soft hover:text-accent hover:border-accent transition-colors items-center justify-center hidden sm:flex"
        >
          →
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
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

      <div className="absolute top-4 left-1/2 -translate-x-1/2 label-caps">
        {page.title || `Page ${index + 1}`}
      </div>
    </main>
  );
}

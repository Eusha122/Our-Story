"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import {
  PAGE_W,
  PAGE_H,
  TRANSITIONS,
  BACKGROUNDS,
  FONTS,
  ANIMS,
  PHOTO_FILTERS,
  SHAPES,
  HIGHLIGHT_STYLES,
  PAGE_EFFECTS,
  type EntranceAnim,
  type HighlightStyle,
  type Page,
  type PageData,
  type PageEffect,
  type PageElement,
  type PageVersion,
  type PhotoFilter,
  type PhotoFrame,
  type ShapeKind,
  type TextFont,
  type Transition,
} from "@/lib/types";
import PageRenderer, {
  ElementBody,
  elementStyle,
  FONT_MAP,
  ENTRANCES,
  isGradient,
  buildGradient,
  parseGradient,
  firstSolid,
} from "@/components/PageRenderer";
import {
  ImageIcon,
  VideoIcon,
  TypeIcon,
  ShapeRectIcon,
  ShapeCircleIcon,
  ShapeHeartIcon,
  ShapeLineIcon,
  ShapeTapeIcon,
  SmileIcon,
  FlipHorizontalIcon,
  ShadowIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DuplicateIcon,
  RotateIcon,
  TrashIcon,
  CenterHIcon,
  CenterVIcon,
  PlusIcon,
  CloseIcon,
  PlayIcon,
} from "@/components/editor/icons";

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

type SaveState = "saved" | "dirty" | "saving" | "error";

const STICKERS = [
  "❤️", "💕", "💌", "💐", "🌹", "🌸", "🌷", "🎀",
  "✨", "💫", "⭐", "🌙", "🌈", "☁️", "🦋", "🍓",
  "🥰", "😘", "🫶", "🤍", "🧸", "🎈", "🍦", "🍰",
  "📷", "🎵", "✈️", "🕯️", "🐚", "🪞", "🖇️", "🗝️",
];

const TEXT_COLORS = [
  "#2b2620", "#8a8178", "#b76e79", "#d48a9d", "#a4636e", "#5f7161",
  "#7c8b6f", "#4a5a72", "#7d93b2", "#9b7bb8", "#c9a227", "#ffffff",
];

const FILL_COLORS = [
  "#f5e9ea", "#fde8ec", "#f2d8dd", "#b76e79", "#e8f0e9", "#dfe8f2",
  "#efe3f2", "#fff3cd", "#d6b18a", "#2b2620", "#8a8178", "#ffffff",
];

const HIGHLIGHTS = ["#fde8ec", "#fff3cd", "#e8f4ea", "#e2ecf8", "#f3e8f8", "#ffffff"];

const BORDER_COLORS = ["#ffffff", "#2b2620", "#b76e79", "#f5e9ea", "#d6b18a", "#8a8178"];

const FRAMES: { value: PhotoFrame; label: string }[] = [
  { value: "polaroid", label: "Polaroid" },
  { value: "plain", label: "Plain" },
  { value: "rounded", label: "Rounded" },
  { value: "circle", label: "Circle" },
];

const SHAPE_DEFAULTS: Record<ShapeKind, { w: number; h: number; fill: string; radius?: number; opacity?: number; rotation?: number }> = {
  rect: { w: 420, h: 280, fill: "#f5e9ea", radius: 0 },
  circle: { w: 320, h: 320, fill: "#f5e9ea" },
  heart: { w: 220, h: 200, fill: "#b76e79" },
  line: { w: 520, h: 6, fill: "#2b2620" },
  tape: { w: 280, h: 74, fill: "#d6b18a", opacity: 0.55, rotation: -5, radius: 2 },
};

const SHAPE_ICONS: Record<ShapeKind, (p: { size?: number }) => React.ReactElement> = {
  rect: ShapeRectIcon,
  circle: ShapeCircleIcon,
  heart: ShapeHeartIcon,
  line: ShapeLineIcon,
  tape: ShapeTapeIcon,
};

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #f7c5c8, #f4e2c9)",
  "linear-gradient(135deg, #f5b3c6, #b8c8f0)",
  "linear-gradient(135deg, #cbb3e0, #f5b3b8)",
  "linear-gradient(135deg, #a8d8c9, #dfe8f2)",
  "linear-gradient(135deg, #f0d9a8, #e8a0a8)",
  "linear-gradient(135deg, #2b2620, #6e5a52)",
];

const selectCls =
  "border border-hairline rounded-md px-2 py-1.5 text-sm bg-paper text-ink outline-none focus:border-accent";
const inputCls =
  "w-full border border-hairline rounded-md px-2 py-1.5 text-sm outline-none focus:border-accent";
const toolBtn =
  "shrink-0 h-9 px-2 text-xs font-medium border rounded-lg transition-colors flex items-center justify-center";

function tb(active: boolean) {
  return `${toolBtn} ${
    active ? "border-accent bg-accent-soft text-accent" : "border-hairline text-ink hover:border-ink-soft hover:bg-canvas-bg"
  }`;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

/* ------------------------------------------------------------------ */
/* color utilities                                                     */
/* ------------------------------------------------------------------ */

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(Math.min(k, 4 - k, 1), 0)) * 255);
  };
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(f(5))}${to2(f(3))}${to2(f(1))}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/* ------------------------------------------------------------------ */
/* popover + color picker                                              */
/* ------------------------------------------------------------------ */

function Popover({
  anchor,
  onClose,
  children,
  width = 264,
}: {
  anchor: { top: number; bottom: number; left: number; right: number; width: number };
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  let top = anchor.bottom + 8;
  if (typeof window !== "undefined") {
    if (top + 420 > window.innerHeight) top = Math.max(8, window.innerHeight - 428);
  }
  let left = anchor.left + anchor.width / 2 - width / 2;
  if (typeof window !== "undefined") {
    left = clamp(left, 8, window.innerWidth - width - 8);
  }
  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div
        className="fixed z-[71] bg-paper border border-hairline rounded-xl p-3 shadow-[0_16px_48px_rgba(43,38,32,0.2)]"
        style={{ top, left, width }}
      >
        {children}
      </div>
    </>
  );
}

function ColorPicker({
  value,
  onChange,
  suggestions,
  allowGradient,
}: {
  value: string;
  onChange: (c: string) => void;
  suggestions: string[];
  allowGradient?: boolean;
}) {
  const [mode, setMode] = useState<"solid" | "gradient">(isGradient(value) ? "gradient" : "solid");
  const [lastSolid, setLastSolid] = useState(() => (isGradient(value) ? "#b76e79" : value));
  const [grad, setGrad] = useState(() => parseGradient(isGradient(value) ? value : GRADIENT_PRESETS[0]));
  const [hsv, setHsv] = useState(() => hexToHsv(lastSolid) ?? { h: 348, s: 0.35, v: 0.92 });
  const [hexText, setHexText] = useState(lastSolid);
  const svRef = useRef<HTMLDivElement>(null);

  const applyGrad = useCallback(
    (next: { angle: number; c1: string; c2: string }) => {
      setGrad(next);
      onChange(buildGradient(next.angle, next.c1, next.c2));
    },
    [onChange]
  );

  const commit = useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next);
      const hex = hsvToHex(next.h, next.s, next.v);
      setHexText(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleSv = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = svRef.current!.getBoundingClientRect();
    const apply = (cx: number, cy: number) =>
      commit({
        h: hsvRef.current.h,
        s: clamp((cx - rect.left) / rect.width, 0, 1),
        v: clamp(1 - (cy - rect.top) / rect.height, 0, 1),
      });
    apply(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Ref mirror so the drag closure always sees the latest hue.
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  return (
    <div className="space-y-3">
      {allowGradient && (
        <div className="flex gap-1 p-0.5 bg-canvas-bg rounded-lg">
          <button
            onClick={() => {
              setMode("solid");
              onChange(lastSolid);
            }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === "solid" ? "bg-paper shadow-sm text-ink" : "text-ink-soft"
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => {
              setMode("gradient");
              applyGrad(grad);
            }}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
              mode === "gradient" ? "bg-paper shadow-sm text-ink" : "text-ink-soft"
            }`}
          >
            Gradient
          </button>
        </div>
      )}

      {mode === "gradient" && allowGradient ? (
        <>
          <div
            className="h-12 rounded-lg border border-hairline"
            style={{ background: buildGradient(grad.angle, grad.c1, grad.c2) }}
          />
          <div className="flex gap-3">
            <label className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-ink-soft">From</span>
              <span
                className="w-9 h-9 rounded-full border border-hairline relative overflow-hidden cursor-pointer block"
                style={{ background: grad.c1 }}
              >
                <input
                  type="color"
                  value={grad.c1}
                  onChange={(e) => applyGrad({ ...grad, c1: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </span>
            </label>
            <label className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-ink-soft">To</span>
              <span
                className="w-9 h-9 rounded-full border border-hairline relative overflow-hidden cursor-pointer block"
                style={{ background: grad.c2 }}
              >
                <input
                  type="color"
                  value={grad.c2}
                  onChange={(e) => applyGrad({ ...grad, c2: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </span>
            </label>
          </div>
          <div>
            <div className="text-xs text-ink-soft mb-1">Angle — {grad.angle}°</div>
            <input
              type="range"
              min={0}
              max={360}
              value={grad.angle}
              onChange={(e) => applyGrad({ ...grad, angle: Number(e.target.value) })}
              className="w-full accent-[#b76e79]"
            />
          </div>
          <div>
            <div className="label-caps mb-1.5">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    const parsed = parseGradient(g);
                    setGrad(parsed);
                    onChange(g);
                  }}
                  className="w-9 h-7 rounded-md border border-hairline"
                  style={{ background: g }}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="label-caps mb-1.5">Suggestions</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onChange(c);
                    setLastSolid(c);
                    setHexText(c);
                    const parsed = hexToHsv(c);
                    if (parsed) setHsv(parsed);
                  }}
                  className={`w-6 h-6 rounded-full border ${
                    value === c ? "ring-2 ring-accent ring-offset-1" : "border-hairline"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div
            ref={svRef}
            onPointerDown={handleSv}
            className="relative h-36 rounded-lg cursor-crosshair touch-none"
            style={{
              background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
            }}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: hsvToHex(hsv.h, hsv.s, hsv.v),
              }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            onChange={(e) => {
              commit({ ...hsv, h: Number(e.target.value) });
              setLastSolid(hsvToHex(Number(e.target.value), hsv.s, hsv.v));
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
          />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md border border-hairline shrink-0" style={{ background: value }} />
            <input
              value={hexText}
              onChange={(e) => {
                setHexText(e.target.value);
                const parsed = hexToHsv(e.target.value);
                if (parsed) {
                  setHsv(parsed);
                  const hex = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  setLastSolid(hex);
                  onChange(hex);
                }
              }}
              spellCheck={false}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ColorChip({
  value,
  onChange,
  suggestions,
  title,
  allowNone,
  onNone,
  allowGradient,
  size = 7,
}: {
  value: string | undefined;
  onChange: (c: string) => void;
  suggestions: string[];
  title: string;
  allowNone?: boolean;
  onNone?: () => void;
  allowGradient?: boolean;
  size?: 7 | 8;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <>
      <button
        title={title}
        onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
        className={`${size === 8 ? "w-8 h-8" : "w-7 h-7"} shrink-0 rounded-full border border-hairline flex items-center justify-center text-ink-soft`}
        style={{ background: value || undefined }}
      >
        {!value && <CloseIcon size={11} />}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)}>
          {allowNone && (
            <button
              onClick={() => {
                onNone?.();
                setAnchor(null);
              }}
              className="w-full mb-3 flex items-center justify-center gap-1.5 text-xs border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent"
            >
              <CloseIcon size={12} /> No color
            </button>
          )}
          <ColorPicker
            value={value || "#b76e79"}
            onChange={onChange}
            suggestions={suggestions}
            allowGradient={allowGradient}
          />
        </Popover>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-hairline">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2.5 label-caps hover:text-accent transition-colors"
      >
        <span>{title}</span>
        <span className={`text-sm transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && <div className="pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ink-soft mb-1">{label}</div>
      {children}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-xs text-ink-soft mb-1">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#b76e79]"
      />
    </div>
  );
}

/** Attach window-level pointer tracking for a drag gesture. */
function trackPointer(
  e: React.PointerEvent,
  onMove: (dx: number, dy: number, ev: PointerEvent) => void,
  onEnd?: () => void
) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const startY = e.clientY;
  const move = (ev: PointerEvent) => onMove(ev.clientX - startX, ev.clientY - startY, ev);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    onEnd?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function timeLabel(sqliteUtc: string) {
  // SQLite datetime('now') is UTC without a zone marker.
  const d = new Date(sqliteUtc.replace(" ", "T") + "Z");
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function Editor({ initialPages }: { initialPages: Page[] }) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [currentId, setCurrentId] = useState<string | null>(initialPages[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Replays an entrance animation on the canvas; nonce forces a remount.
  const [animPreview, setAnimPreview] = useState<{ id: string; anim: EntranceAnim; nonce: number } | null>(null);
  const [versions, setVersions] = useState<PageVersion[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stickerAnchor, setStickerAnchor] = useState<DOMRect | null>(null);
  const [storage, setStorage] = useState<{ bytes: number; count: number; capBytes: number } | null>(null);
  // Detect narrow phones so we can show a "use desktop" nudge.
  const [isNarrow, setIsNarrow] = useState(false);
  const [narrowDismissed, setNarrowDismissed] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  // Mobile FAB
  const [fabOpen, setFabOpen] = useState(false);
  const [mobileStickerOpen, setMobileStickerOpen] = useState(false);

  const refreshStorage = useCallback(() => {
    fetch("/api/storage")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStorage(s))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

  const page = pages.find((p) => p.id === currentId) ?? null;
  const selected = page?.data.elements.find((el) => el.id === selectedId) ?? null;

  /* ---------------- canvas scaling ---------------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setScale(Math.min((rect.width - 32) / PAGE_W, (rect.height - 32) / PAGE_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------- autosave ---------------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Page | null>(null);

  const doSave = useCallback(async (p: Page) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/pages/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: p.title, transition: p.transition, data: p.data }),
        keepalive: true,
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(
    (p: Page) => {
      pendingRef.current = p;
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) void doSave(pending);
      }, 1200);
    },
    [doSave]
  );

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) void doSave(pending);
  }, [doSave]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", flushSave);
    };
  }, [flushSave]);

  /* ---------------- page mutations ---------------- */

  const updateCurrentPage = useCallback(
    (fn: (p: Page) => Page) => {
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== currentId) return p;
          const next = fn(p);
          scheduleSave(next);
          return next;
        })
      );
    },
    [currentId, scheduleSave]
  );

  const mutateData = useCallback(
    (fn: (d: PageData) => PageData) => {
      updateCurrentPage((p) => ({ ...p, data: fn(p.data) }));
    },
    [updateCurrentPage]
  );

  const mutateElement = useCallback(
    (id: string, fn: (el: PageElement) => PageElement) => {
      mutateData((d) => ({
        ...d,
        elements: d.elements.map((el) => (el.id === id ? fn(el) : el)),
      }));
    },
    [mutateData]
  );

  // Typed helpers so JSX stays terse.
  const setText = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      mutateElement(id, (el) => (el.type === "text" ? ({ ...el, ...patch } as PageElement) : el));
    },
    [mutateElement]
  );
  const setPhoto = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      mutateElement(id, (el) => (el.type === "photo" ? ({ ...el, ...patch } as PageElement) : el));
    },
    [mutateElement]
  );
  const setShape = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      mutateElement(id, (el) => (el.type === "shape" ? ({ ...el, ...patch } as PageElement) : el));
    },
    [mutateElement]
  );
  const setVideo = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      mutateElement(id, (el) => (el.type === "video" ? ({ ...el, ...patch } as PageElement) : el));
    },
    [mutateElement]
  );

  const switchPage = useCallback(
    (id: string | null) => {
      flushSave();
      setSelectedId(null);
      setEditingTextId(null);
      setHistoryOpen(false);
      setAnimPreview(null);
      setCurrentId(id);
    },
    [flushSave]
  );

  /* ---------------- element creation ---------------- */

  const nextZ = useCallback(
    () => (page ? Math.max(0, ...page.data.elements.map((e) => e.z)) + 1 : 1),
    [page]
  );

  const addText = useCallback(() => {
    if (!page) return;
    const el: PageElement = {
      id: nanoid(8),
      type: "text",
      x: PAGE_W / 2 - 300,
      y: PAGE_H / 2 - 60,
      w: 600,
      h: 140,
      rotation: 0,
      z: nextZ(),
      text: "Write something sweet…",
      font: "serif",
      size: 40,
      color: "#2b2620",
      align: "center",
    };
    mutateData((d) => ({ ...d, elements: [...d.elements, el] }));
    setSelectedId(el.id);
  }, [page, nextZ, mutateData]);

  const addSticker = useCallback(
    (emoji: string) => {
      if (!page) return;
      const el: PageElement = {
        id: nanoid(8),
        type: "sticker",
        x: PAGE_W / 2 - 70,
        y: PAGE_H / 2 - 70,
        w: 140,
        h: 140,
        rotation: 0,
        z: nextZ(),
        emoji,
      };
      mutateData((d) => ({ ...d, elements: [...d.elements, el] }));
      setSelectedId(el.id);
    },
    [page, nextZ, mutateData]
  );

  const addShape = useCallback(
    (kind: ShapeKind) => {
      if (!page) return;
      const d = SHAPE_DEFAULTS[kind];
      const el: PageElement = {
        id: nanoid(8),
        type: "shape",
        shape: kind,
        x: PAGE_W / 2 - d.w / 2,
        y: PAGE_H / 2 - d.h / 2,
        w: d.w,
        h: d.h,
        rotation: d.rotation ?? 0,
        z: nextZ(),
        fill: d.fill,
        radius: d.radius,
        opacity: d.opacity,
      };
      mutateData((dd) => ({ ...dd, elements: [...dd.elements, el] }));
      setSelectedId(el.id);
    },
    [page, nextZ, mutateData]
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const addVideos = useCallback(
    async (files: FileList) => {
      if (!page) return;
      setUploading(true);
      try {
        let offset = 0;
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/images", { method: "POST", body: fd });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            alert(body?.error ?? "Upload failed");
            continue;
          }
          const { url } = (await res.json()) as { url: string };
          const w = 480;
          const h = 480 * (9 / 16);
          const el: PageElement = {
            id: nanoid(8),
            type: "video",
            x: PAGE_W / 2 - w / 2 + offset,
            y: PAGE_H / 2 - h / 2 + offset,
            w,
            h,
            rotation: 0,
            z: nextZ() + offset / 30,
            src: url,
            frame: "rounded",
            controls: true,
          };
          mutateData((d) => ({ ...d, elements: [...d.elements, el] }));
          setSelectedId(el.id);
          offset += 30;
        }
      } finally {
        setUploading(false);
        refreshStorage();
      }
    },
    [page, nextZ, mutateData, refreshStorage]
  );

  const addPhotos = useCallback(
    async (files: FileList) => {
      if (!page) return;
      setUploading(true);
      try {
        let offset = 0;
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/images", { method: "POST", body: fd });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            alert(body?.error ?? "Upload failed");
            continue;
          }
          const { url } = (await res.json()) as { url: string };
          const ratio = await new Promise<number>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve(img.naturalHeight / img.naturalWidth);
            img.onerror = () => resolve(1);
            img.src = url;
          });
          const w = 460;
          const h = clamp(w * ratio, 200, 860) + 90; // + polaroid caption strip
          const el: PageElement = {
            id: nanoid(8),
            type: "photo",
            x: PAGE_W / 2 - w / 2 + offset,
            y: PAGE_H / 2 - h / 2 + offset,
            w,
            h,
            rotation: (Math.random() - 0.5) * 6,
            z: nextZ() + offset / 30,
            src: url,
            frame: "polaroid",
            caption: "",
          };
          mutateData((d) => ({ ...d, elements: [...d.elements, el] }));
          setSelectedId(el.id);
          offset += 30;
        }
      } finally {
        setUploading(false);
        refreshStorage();
      }
    },
    [page, nextZ, mutateData, refreshStorage]
  );

  /* ---------------- element actions ---------------- */

  const removeSelected = useCallback(() => {
    if (!selectedId || !page) return;
    // If the element owns a media file, delete it from the server.
    const el = page.data.elements.find((e) => e.id === selectedId);
    if (el && (el.type === "photo" || el.type === "video") && el.src) {
      const mediaId = el.src.split("/").pop();
      if (mediaId) {
        fetch(`/api/images/${mediaId}`, { method: "DELETE" })
          .then(() => refreshStorage())
          .catch(() => {});
      }
    }
    mutateData((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, page, mutateData, refreshStorage]);


  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy: PageElement = { ...selected, id: nanoid(8), x: selected.x + 36, y: selected.y + 36, z: nextZ() };
    mutateData((d) => ({ ...d, elements: [...d.elements, copy] }));
    setSelectedId(copy.id);
  }, [selected, nextZ, mutateData]);

  const reorderZ = useCallback(
    (dir: 1 | -1) => {
      if (!selected || !page) return;
      const zs = page.data.elements.map((e) => e.z);
      const target = dir === 1 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
      mutateElement(selected.id, (el) => ({ ...el, z: target }));
    },
    [selected, page, mutateElement]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      }
      const step = e.shiftKey ? 12 : 2;
      const nudge: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (nudge[e.key]) {
        e.preventDefault();
        const [dx, dy] = nudge[e.key];
        mutateElement(selectedId, (el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeSelected, mutateElement]);

  /* ---------------- page list actions ---------------- */

  const addPage = useCallback(async () => {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Page ${pages.length + 1}` }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as Page;
    setPages((prev) => [...prev, created]);
    switchPage(created.id);
  }, [pages.length, switchPage]);

  const removePage = useCallback(
    async (id: string) => {
      if (!confirm("Delete this page? Its history goes with it.")) return;
      await fetch(`/api/pages/${id}`, { method: "DELETE" });
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (currentId === id) switchPage(next[0]?.id ?? null);
        return next;
      });
    },
    [currentId, switchPage]
  );

  const movePage = useCallback((id: string, dir: 1 | -1) => {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      void fetch("/api/pages/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((p) => p.id) }),
      });
      return next;
    });
  }, []);

  /* ---------------- history ---------------- */

  const openHistory = useCallback(async () => {
    if (!page) return;
    flushSave();
    setHistoryOpen(true);
    setVersions(null);
    const res = await fetch(`/api/pages/${page.id}/versions`);
    setVersions(res.ok ? ((await res.json()) as PageVersion[]) : []);
  }, [page, flushSave]);

  const restore = useCallback(
    async (versionId: number) => {
      if (!page) return;
      const res = await fetch(`/api/pages/${page.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) return;
      const restored = (await res.json()) as Page;
      setPages((prev) => prev.map((p) => (p.id === restored.id ? restored : p)));
      setSelectedId(null);
      setHistoryOpen(false);
      setSaveState("saved");
    },
    [page]
  );

  /* ---------------- canvas interaction ---------------- */

  const startMove = useCallback(
    (e: React.PointerEvent, el: PageElement) => {
      setSelectedId(el.id);
      if (editingTextId === el.id) return;
      const { x, y } = el;
      trackPointer(e, (dx, dy) => {
        const s = scaleRef.current;
        mutateElement(el.id, (cur) => ({ ...cur, x: x + dx / s, y: y + dy / s }));
      });
    },
    [editingTextId, mutateElement]
  );

  const startResize = useCallback(
    (e: React.PointerEvent, el: PageElement, dir: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se") => {
      const { x, y, w, h } = el;
      trackPointer(e, (dxRaw, dyRaw) => {
        const s = scaleRef.current;
        const dx = dxRaw / s;
        const dy = dyRaw / s;
        let nx = x, ny = y, nw = w, nh = h;
        if (dir.includes("e")) nw = w + dx;
        if (dir.includes("s")) nh = h + dy;
        if (dir.includes("w")) { nw = w - dx; nx = x + dx; }
        if (dir.includes("n")) { nh = h - dy; ny = y + dy; }
        if (nw < 40 || nh < 40) return;
        mutateElement(el.id, (cur) => ({ ...cur, x: nx, y: ny, w: nw, h: nh }));
      });
    },
    [mutateElement]
  );

  const canvasRef = useRef<HTMLDivElement>(null);

  const startRotate = useCallback(
    (e: React.PointerEvent, el: PageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const s = scaleRef.current;
      const cx = rect.left + (el.x + el.w / 2) * s;
      const cy = rect.top + (el.y + el.h / 2) * s;
      trackPointer(e, (_dx, _dy, ev) => {
        let deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
        // Snap near right angles for tidy layouts.
        const snapped = [0, 90, 180, -90, -180].find((a) => Math.abs(deg - a) < 4);
        if (snapped !== undefined) deg = snapped;
        mutateElement(el.id, (cur) => ({ ...cur, rotation: Math.round(deg * 10) / 10 }));
      });
    },
    [mutateElement]
  );

  const previewAnim = useCallback((id: string, anim: EntranceAnim) => {
    setAnimPreview((p) => (anim === "none" ? null : { id, anim, nonce: (p?.nonce ?? 0) + 1 }));
  }, []);

  const saveLabel = useMemo(() => {
    switch (saveState) {
      case "saved": return "Saved";
      case "dirty": return "Editing…";
      case "saving": return "Saving…";
      case "error": return "Save failed — retrying on next change";
    }
  }, [saveState]);

  /* ================================================================ */
  /* render                                                            */
  /* ================================================================ */

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-canvas-bg">
      {/* Mobile nudge — shown on phones, dismissible */}
      {isNarrow && !narrowDismissed && (
        <div className="bg-accent text-paper text-xs px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <span>📱 The editor works best on a tablet or desktop — rotate your phone or switch devices for the full experience.</span>
          <button
            onClick={() => setNarrowDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 opacity-80 hover:opacity-100 text-base leading-none"
          >
            ×
          </button>
        </div>
      )}
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 h-12 bg-paper border-b border-hairline shrink-0">
        <span className="font-[family-name:var(--font-script)] text-accent text-2xl leading-none">
          Our Story
        </span>
        <span className="label-caps hidden sm:inline">Editor</span>
        <div className="flex-1" />
        {storage && (
          <span
            title="Storage used on your server"
            className="text-xs text-ink-soft hidden md:inline"
          >
            {(storage.bytes / 1024 ** 3).toFixed(1)} GB / {(storage.capBytes / 1024 ** 3).toFixed(0)} GB
          </span>
        )}
        <span
          className={`text-xs ${
            saveState === "error" ? "text-red-500" : saveState === "saved" ? "text-ink-soft" : "text-accent"
          }`}
        >
          {uploading ? "Uploading…" : saveLabel}
        </span>
        <button
          onClick={openHistory}
          disabled={!page}
          className="text-xs border border-hairline rounded-full px-4 py-1.5 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          History
        </button>
        <Link
          href="/"
          target="_blank"
          className="text-xs bg-ink text-paper rounded-full px-4 py-1.5 hover:bg-accent transition-colors"
        >
          View ↗
        </Link>
      </header>

      {/* Contextual toolbar — desktop / tablet only; mobile uses the FAB below */}
      <div className="hidden md:flex items-center gap-1.5 px-3 h-14 bg-paper border-b border-hairline shrink-0 overflow-x-auto no-scrollbar">
        {page && !selected && (
          <>
            <button onClick={() => fileInput.current?.click()} className={`${tb(false)} gap-1.5 px-3`}>
              <ImageIcon size={17} /> Photo
            </button>
            <button onClick={() => videoInput.current?.click()} className={`${tb(false)} gap-1.5 px-3`}>
              <VideoIcon size={17} /> Video
            </button>
            <button onClick={addText} className={`${tb(false)} gap-1.5 px-3`}>
              <TypeIcon size={17} /> Text
            </button>
            <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
            {SHAPES.map((s) => {
              const ShapeIcon = SHAPE_ICONS[s.value];
              return (
                <button key={s.value} title={s.label} onClick={() => addShape(s.value)} className={`${tb(false)} w-10`}>
                  <ShapeIcon size={17} />
                </button>
              );
            })}
            <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
            <button
              onClick={(e) => setStickerAnchor(e.currentTarget.getBoundingClientRect())}
              className={`${tb(false)} gap-1.5 px-3`}
            >
              <SmileIcon size={17} /> Stickers
            </button>
            {stickerAnchor && (
              <Popover anchor={stickerAnchor} onClose={() => setStickerAnchor(null)} width={296}>
                <div className="flex flex-wrap gap-1">
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        addSticker(s);
                        setStickerAnchor(null);
                      }}
                      className="w-8 h-8 text-lg hover:scale-125 transition-transform"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Popover>
            )}
            <div className="flex-1" />
            <span className="text-[11px] text-ink-soft shrink-0 hidden lg:inline">
              Select an element to style it
            </span>
          </>
        )}

        {page && selected && (
          <>
            {selected.type === "text" && (
              <>
                <select
                  value={selected.font}
                  onChange={(e) => setText(selected.id, { font: e.target.value as TextFont })}
                  className={`${selectCls} w-32 shrink-0 h-9 py-0`}
                  style={{ fontFamily: FONT_MAP[selected.font] }}
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value} style={{ fontFamily: FONT_MAP[f.value] }}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center shrink-0 border border-hairline rounded-md h-9">
                  <button
                    onClick={() => setText(selected.id, { size: clamp(selected.size - 2, 8, 300) })}
                    className="w-7 h-full text-ink-soft hover:text-accent"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={selected.size}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setText(selected.id, { size: clamp(v, 8, 300) });
                    }}
                    className="w-11 text-center text-xs outline-none bg-transparent"
                  />
                  <button
                    onClick={() => setText(selected.id, { size: clamp(selected.size + 2, 8, 300) })}
                    className="w-7 h-full text-ink-soft hover:text-accent"
                  >
                    +
                  </button>
                </div>
                <ColorChip
                  title="Text color"
                  value={selected.color}
                  suggestions={TEXT_COLORS}
                  onChange={(c) => setText(selected.id, { color: c })}
                  allowGradient
                  size={8}
                />
                <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
                <button onClick={() => setText(selected.id, { bold: !selected.bold })} className={`${tb(!!selected.bold)} w-9 font-bold`}>B</button>
                <button onClick={() => setText(selected.id, { italic: !selected.italic })} className={`${tb(!!selected.italic)} w-9 italic`}>I</button>
                <button onClick={() => setText(selected.id, { underline: !selected.underline })} className={`${tb(!!selected.underline)} w-9 underline`}>U</button>
                <button onClick={() => setText(selected.id, { uppercase: !selected.uppercase })} className={`${tb(!!selected.uppercase)} w-9 tracking-widest`}>AA</button>
                <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
                <button onClick={() => setText(selected.id, { align: "left" })} className={`${tb(selected.align === "left")} w-9`}>
                  <AlignLeftIcon size={17} />
                </button>
                <button onClick={() => setText(selected.id, { align: "center" })} className={`${tb(selected.align === "center")} w-9`}>
                  <AlignCenterIcon size={17} />
                </button>
                <button onClick={() => setText(selected.id, { align: "right" })} className={`${tb(selected.align === "right")} w-9`}>
                  <AlignRightIcon size={17} />
                </button>
              </>
            )}

            {selected.type === "photo" && (
              <>
                <select
                  value={selected.frame}
                  onChange={(e) => setPhoto(selected.id, { frame: e.target.value as PhotoFrame })}
                  className={`${selectCls} w-28 shrink-0 h-9 py-0`}
                >
                  {FRAMES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={selected.filter ?? "none"}
                  onChange={(e) => setPhoto(selected.id, { filter: e.target.value as PhotoFilter })}
                  className={`${selectCls} w-28 shrink-0 h-9 py-0`}
                >
                  {PHOTO_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
                <button onClick={() => setPhoto(selected.id, { flip: !selected.flip })} className={`${tb(!!selected.flip)} gap-1.5 px-3`}>
                  <FlipHorizontalIcon size={17} /> Flip
                </button>
                <button onClick={() => setPhoto(selected.id, { shadow: selected.shadow === false ? true : false })} className={`${tb(selected.shadow !== false)} gap-1.5 px-3`}>
                  <ShadowIcon size={17} /> Shadow
                </button>
              </>
            )}

            {selected.type === "shape" && (
              <>
                <span className="text-xs text-ink-soft shrink-0">Fill</span>
                <ColorChip
                  title="Fill color"
                  value={selected.fill}
                  suggestions={FILL_COLORS}
                  onChange={(c) => setShape(selected.id, { fill: c })}
                  allowGradient
                  size={8}
                />
              </>
            )}

            {selected.type === "sticker" && (
              <span className="text-lg shrink-0">{selected.emoji}</span>
            )}

            {selected.type === "video" && (
              <span className="flex items-center gap-1.5 text-xs text-ink-soft shrink-0">
                <VideoIcon size={16} /> Video clip
              </span>
            )}

            <div className="flex-1" />
            <span className="w-px h-7 bg-hairline mx-1 shrink-0" />
            <button title="Bring to front" onClick={() => reorderZ(1)} className={`${tb(false)} w-9`}>
              <ArrowUpIcon size={17} />
            </button>
            <button title="Send to back" onClick={() => reorderZ(-1)} className={`${tb(false)} w-9`}>
              <ArrowDownIcon size={17} />
            </button>
            <button title="Duplicate" onClick={duplicateSelected} className={`${tb(false)} w-9`}>
              <DuplicateIcon size={17} />
            </button>
            <button title="Straighten" onClick={() => mutateElement(selected.id, (el) => ({ ...el, rotation: 0 }))} className={`${tb(false)} w-9`}>
              <RotateIcon size={17} />
            </button>
            <button title="Delete" onClick={removeSelected} className={`${toolBtn} w-9 border-hairline text-red-400 hover:border-red-400`}>
              <TrashIcon size={17} />
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addPhotos(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addVideos(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Page list */}
        <aside className="md:w-40 shrink-0 bg-paper border-b md:border-b-0 md:border-r border-hairline flex md:flex-col gap-3 p-3 overflow-x-auto md:overflow-y-auto no-scrollbar">
          {pages.map((p, i) => (
            <div key={p.id} className="shrink-0 group relative">
              <button
                onClick={() => switchPage(p.id)}
                className={`block rounded-lg overflow-hidden border-2 transition-colors ${
                  p.id === currentId ? "border-accent" : "border-hairline hover:border-ink-soft"
                }`}
                style={{ width: 96, height: 128 }}
              >
                <div style={{ transform: `scale(${92 / PAGE_W})`, transformOrigin: "top left", pointerEvents: "none" }}>
                  <PageRenderer data={p.data} />
                </div>
              </button>
              <div className="text-[10px] text-ink-soft text-center mt-1 truncate w-24">
                {i + 1}. {p.title}
              </div>
              <div className="absolute top-1 right-1 flex-col gap-1 hidden group-hover:flex">
                <button title="Move up" onClick={() => movePage(p.id, -1)} className="w-5 h-5 flex items-center justify-center bg-paper/90 border border-hairline rounded hover:text-accent">
                  <ArrowUpIcon size={11} />
                </button>
                <button title="Move down" onClick={() => movePage(p.id, 1)} className="w-5 h-5 flex items-center justify-center bg-paper/90 border border-hairline rounded hover:text-accent">
                  <ArrowDownIcon size={11} />
                </button>
                <button title="Delete page" onClick={() => removePage(p.id)} className="w-5 h-5 flex items-center justify-center bg-paper/90 border border-hairline rounded hover:text-red-500">
                  <CloseIcon size={11} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addPage}
            className="shrink-0 rounded-lg border-2 border-dashed border-hairline text-ink-soft hover:border-accent hover:text-accent transition-colors flex items-center justify-center"
            style={{ width: 96, height: 128 }}
          >
            <PlusIcon size={26} />
          </button>
        </aside>

        {/* Canvas stage */}
        <main ref={stageRef} className="flex-1 min-w-0 min-h-0 flex items-center justify-center relative">
          {page ? (
            <div style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <div
                  ref={canvasRef}
                  className="relative overflow-hidden shadow-[0_16px_50px_rgba(43,38,32,0.14)]"
                  style={{ width: PAGE_W, height: PAGE_H, background: page.data.background }}
                  onPointerDown={() => {
                    setSelectedId(null);
                    setEditingTextId(null);
                  }}
                >
                  {/* Static base only — the live PageRenderer handles effects */}
                  <div className="absolute inset-0 pointer-events-none">
                    <PageRenderer data={{ ...page.data, elements: [] }} />
                  </div>
                  {[...page.data.elements]
                    .sort((a, b) => a.z - b.z)
                    .map((el) => {
                      const isSelected = el.id === selectedId;
                      const isEditing = el.id === editingTextId;
                      const previewEntrance =
                        animPreview && animPreview.id === el.id && animPreview.anim !== "none"
                          ? ENTRANCES[animPreview.anim]
                          : null;
                      return (
                        <div
                          key={el.id}
                          style={{ ...elementStyle(el), cursor: isEditing ? "text" : "move" }}
                          onPointerDown={(e) => startMove(e, el)}
                          onDoubleClick={() => el.type === "text" && setEditingTextId(el.id)}
                        >
                          {isEditing && el.type === "text" ? (
                            <textarea
                              autoFocus
                              value={el.text}
                              onChange={(ev) => setText(el.id, { text: ev.target.value })}
                              onBlur={() => setEditingTextId(null)}
                              onPointerDown={(ev) => ev.stopPropagation()}
                              className="w-full h-full bg-transparent outline-none resize-none"
                              style={{
                                fontFamily: FONT_MAP[el.font] ?? FONT_MAP.serif,
                                fontSize: el.size,
                                color: firstSolid(el.color),
                                textAlign: el.align,
                                fontWeight: el.bold ? 700 : 400,
                                fontStyle: el.italic ? "italic" : "normal",
                                textDecoration: el.underline ? "underline" : undefined,
                                textTransform: el.uppercase ? "uppercase" : undefined,
                                letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                                lineHeight: el.lineHeight ?? 1.45,
                              }}
                            />
                          ) : previewEntrance ? (
                            <motion.div
                              key={animPreview!.nonce}
                              className="w-full h-full"
                              initial={previewEntrance.from}
                              animate={previewEntrance.to}
                              transition={
                                previewEntrance.spring
                                  ? { type: "spring", stiffness: 240, damping: 17 }
                                  : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
                              }
                            >
                              <ElementBody el={el} />
                            </motion.div>
                          ) : (
                            <ElementBody el={el} />
                          )}

                          {isSelected && !isEditing && (
                            <>
                              {/* Flush selection outline — sits exactly on the element's bounds */}
                              <div className="absolute inset-0 border-2 border-accent pointer-events-none rounded-sm" />

                              {/* Edge strips: grab anywhere along a side to resize that one axis */}
                              {(["n", "s"] as const).map((d) => (
                                <div
                                  key={d}
                                  onPointerDown={(e) => startResize(e, el, d)}
                                  className="absolute"
                                  style={{
                                    left: 14,
                                    right: 14,
                                    height: 16,
                                    top: d === "n" ? -8 : undefined,
                                    bottom: d === "s" ? -8 : undefined,
                                    cursor: "ns-resize",
                                  }}
                                />
                              ))}
                              {(["e", "w"] as const).map((d) => (
                                <div
                                  key={d}
                                  onPointerDown={(e) => startResize(e, el, d)}
                                  className="absolute"
                                  style={{
                                    top: 14,
                                    bottom: 14,
                                    width: 16,
                                    left: d === "w" ? -8 : undefined,
                                    right: d === "e" ? -8 : undefined,
                                    cursor: "ew-resize",
                                  }}
                                />
                              ))}

                              {/* Corner handles: flush on the border, drawn after so they win over edge strips */}
                              {(["nw", "ne", "sw", "se"] as const).map((c) => (
                                <div
                                  key={c}
                                  onPointerDown={(e) => startResize(e, el, c)}
                                  className="absolute w-4 h-4 bg-paper border-2 border-accent rounded-full"
                                  style={{
                                    top: c.includes("n") ? -8 : undefined,
                                    bottom: c.includes("s") ? -8 : undefined,
                                    left: c.includes("w") ? -8 : undefined,
                                    right: c.includes("e") ? -8 : undefined,
                                    cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
                                  }}
                                />
                              ))}
                              <div
                                onPointerDown={(e) => startRotate(e, el)}
                                title="Rotate"
                                className="absolute left-1/2 -translate-x-1/2 -top-12 w-7 h-7 bg-paper border-2 border-accent rounded-full cursor-grab flex items-center justify-center text-accent"
                              >
                                <RotateIcon size={14} />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-ink-soft">
              <p className="mb-3">No pages yet.</p>
              <button onClick={addPage} className="bg-ink text-paper rounded-full px-6 py-2 text-sm hover:bg-accent transition-colors">
                Create the first page
              </button>
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="md:w-72 shrink-0 bg-paper border-t md:border-t-0 md:border-l border-hairline px-4 pb-6 overflow-y-auto">
          {page && !selected && (
            <Section title="Page" defaultOpen>
              <Field label="Title">
                <input
                  value={page.title}
                  onChange={(e) => updateCurrentPage((p) => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Transition (how this page enters)">
                <select
                  value={page.transition}
                  onChange={(e) => updateCurrentPage((p) => ({ ...p, transition: e.target.value as Transition }))}
                  className={`${selectCls} w-full`}
                >
                  {TRANSITIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ambient effect">
                <select
                  value={page.data.effect ?? "none"}
                  onChange={(e) => mutateData((d) => ({ ...d, effect: e.target.value as PageEffect }))}
                  className={`${selectCls} w-full`}
                >
                  {PAGE_EFFECTS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Background">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.value}
                      title={b.label}
                      onClick={() => mutateData((d) => ({ ...d, background: b.value }))}
                      className={`w-7 h-7 rounded-full border ${
                        page.data.background === b.value ? "ring-2 ring-accent ring-offset-1" : "border-hairline"
                      }`}
                      style={{ background: b.value }}
                    />
                  ))}
                  <ColorChip
                    title="Custom background color"
                    value={page.data.background}
                    suggestions={["#ffffff", "#fdf9f4", "#fbf3f2", "#f4f6f3", "#f3f5f8", "#fff8ec"]}
                    onChange={(c) => mutateData((d) => ({ ...d, background: c }))}
                    allowGradient
                  />
                </div>
              </Field>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Use the toolbar above the canvas to add photos, text, shapes, and stickers.
                Click any element to style it. Everything autosaves.
              </p>
            </Section>
          )}

          {page && selected && (
            <>
              <Section title="Style" defaultOpen>
                {selected.type === "text" && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-soft">Highlight</span>
                      <ColorChip
                        title="Highlight color"
                        value={selected.bg}
                        suggestions={HIGHLIGHTS}
                        onChange={(c) => setText(selected.id, { bg: c })}
                        allowNone
                        onNone={() => setText(selected.id, { bg: undefined })}
                        allowGradient
                      />
                      {selected.bg && (
                        <select
                          value={selected.bgStyle ?? "rounded"}
                          onChange={(e) => setText(selected.id, { bgStyle: e.target.value as HighlightStyle })}
                          className={`${selectCls} flex-1`}
                        >
                          {HIGHLIGHT_STYLES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-soft">Shadow</span>
                      <button
                        onClick={() => setText(selected.id, { shadow: !selected.shadow })}
                        className={tb(!!selected.shadow)}
                        style={{ textShadow: "0 2px 6px rgba(43,38,32,0.4)" }}
                      >
                        Aa
                      </button>
                    </div>
                    <Slider
                      label={`Letter spacing — ${selected.letterSpacing ?? 0}px`}
                      min={0}
                      max={30}
                      value={selected.letterSpacing ?? 0}
                      onChange={(v) => setText(selected.id, { letterSpacing: v })}
                    />
                    <Slider
                      label={`Line height — ${(selected.lineHeight ?? 1.45).toFixed(2)}`}
                      min={0.9}
                      max={2.4}
                      step={0.05}
                      value={selected.lineHeight ?? 1.45}
                      onChange={(v) => setText(selected.id, { lineHeight: v })}
                    />
                    <p className="text-[11px] text-ink-soft">Double-click the text on the canvas to edit it.</p>
                  </>
                )}

                {selected.type === "photo" && (
                  <>
                    {selected.frame === "polaroid" ? (
                      <Field label="Caption">
                        <input
                          value={selected.caption ?? ""}
                          onChange={(e) => setPhoto(selected.id, { caption: e.target.value })}
                          placeholder="11 july 2026 ♡"
                          className={inputCls}
                        />
                      </Field>
                    ) : (
                      <>
                        <Slider
                          label={`Border — ${selected.borderW ?? 0}px`}
                          min={0}
                          max={24}
                          value={selected.borderW ?? 0}
                          onChange={(v) => setPhoto(selected.id, { borderW: v })}
                        />
                        {(selected.borderW ?? 0) > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-soft">Border color</span>
                            <ColorChip
                              title="Border color"
                              value={selected.borderColor ?? "#ffffff"}
                              suggestions={BORDER_COLORS}
                              onChange={(c) => setPhoto(selected.id, { borderColor: c })}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {selected.type === "video" && (
                  <>
                    <Field label="Frame">
                      <div className="flex gap-1">
                        {(["plain", "rounded"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setVideo(selected.id, { frame: f })}
                            className={`flex-1 text-xs border rounded-md py-1.5 capitalize ${
                              selected.frame === f ? "border-accent text-accent" : "border-hairline hover:border-ink-soft"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setVideo(selected.id, { controls: selected.controls === false })}
                        className={`flex-1 text-xs border rounded-md py-1.5 ${selected.controls !== false ? "border-accent text-accent" : "border-hairline"}`}
                      >
                        Controls
                      </button>
                      <button
                        onClick={() => setVideo(selected.id, { loop: !selected.loop })}
                        className={`flex-1 text-xs border rounded-md py-1.5 ${selected.loop ? "border-accent text-accent" : "border-hairline"}`}
                      >
                        Loop
                      </button>
                      <button
                        onClick={() => setVideo(selected.id, { muted: !selected.muted })}
                        className={`flex-1 text-xs border rounded-md py-1.5 ${selected.muted ? "border-accent text-accent" : "border-hairline"}`}
                      >
                        Muted
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => setVideo(selected.id, { autoplay: !selected.autoplay })}
                        className={`w-full text-xs border rounded-md py-1.5 ${selected.autoplay ? "border-accent text-accent" : "border-hairline"}`}
                      >
                        Autoplay when page opens
                      </button>
                      {selected.autoplay && !selected.muted && (
                        <p className="text-[11px] text-ink-soft mt-1">
                          Most browsers block autoplay with sound — turn on Muted too if it should play automatically.
                        </p>
                      )}
                    </div>
                    <Slider
                      label={`Border — ${selected.borderW ?? 0}px`}
                      min={0}
                      max={24}
                      value={selected.borderW ?? 0}
                      onChange={(v) => setVideo(selected.id, { borderW: v })}
                    />
                    {(selected.borderW ?? 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-soft">Border color</span>
                        <ColorChip
                          title="Border color"
                          value={selected.borderColor ?? "#ffffff"}
                          suggestions={BORDER_COLORS}
                          onChange={(c) => setVideo(selected.id, { borderColor: c })}
                        />
                      </div>
                    )}
                  </>
                )}

                {selected.type === "shape" && (
                  <>
                    {(selected.shape === "rect" || selected.shape === "tape") && (
                      <Slider
                        label={`Corner radius — ${selected.radius ?? 0}px`}
                        min={0}
                        max={200}
                        value={selected.radius ?? 0}
                        onChange={(v) => setShape(selected.id, { radius: v })}
                      />
                    )}
                    {selected.shape !== "tape" && selected.shape !== "line" && (
                      <>
                        <Slider
                          label={`Outline — ${selected.borderW ?? 0}px`}
                          min={0}
                          max={20}
                          value={selected.borderW ?? 0}
                          onChange={(v) => setShape(selected.id, { borderW: v })}
                        />
                        {(selected.borderW ?? 0) > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-soft">Outline color</span>
                            <ColorChip
                              title="Outline color"
                              value={selected.borderColor ?? "#2b2620"}
                              suggestions={BORDER_COLORS}
                              onChange={(c) => setShape(selected.id, { borderColor: c })}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {selected.shape === "line" && (
                      <p className="text-[11px] text-ink-soft">Drag the corner handles to change length and thickness.</p>
                    )}
                  </>
                )}

                {selected.type === "sticker" && (
                  <Field label="Swap emoji">
                    <div className="flex flex-wrap gap-1">
                      {STICKERS.map((s) => (
                        <button
                          key={s}
                          onClick={() => mutateElement(selected.id, (el) => el.type === "sticker" ? { ...el, emoji: s } : el)}
                          className={`w-8 h-8 text-lg hover:scale-125 transition-transform ${selected.emoji === s ? "bg-accent-soft rounded-md" : ""}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              </Section>

              <Section title="Arrange">
                <Slider
                  label={`Opacity — ${Math.round((selected.opacity ?? 1) * 100)}%`}
                  min={5}
                  max={100}
                  value={Math.round((selected.opacity ?? 1) * 100)}
                  onChange={(v) => mutateElement(selected.id, (el) => ({ ...el, opacity: v / 100 }))}
                />
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ["X", "x"],
                      ["Y", "y"],
                      ["W", "w"],
                      ["H", "h"],
                    ] as const
                  ).map(([label, key]) => (
                    <label key={key} className="text-[10px] text-ink-soft">
                      {label}
                      <input
                        type="number"
                        value={Math.round(selected[key])}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isNaN(v)) return;
                          mutateElement(selected.id, (el) => ({
                            ...el,
                            [key]: key === "w" || key === "h" ? Math.max(10, v) : v,
                          }));
                        }}
                        className="w-full border border-hairline rounded-md px-1 py-1 text-xs text-ink outline-none focus:border-accent"
                      />
                    </label>
                  ))}
                </div>
                <div className="flex gap-1 items-end">
                  <label className="text-[10px] text-ink-soft flex-1">
                    Angle
                    <input
                      type="number"
                      value={Math.round(selected.rotation)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isNaN(v)) return;
                        mutateElement(selected.id, (el) => ({ ...el, rotation: v }));
                      }}
                      className="w-full border border-hairline rounded-md px-1 py-1 text-xs text-ink outline-none focus:border-accent"
                    />
                  </label>
                  <button
                    onClick={() => mutateElement(selected.id, (el) => ({ ...el, x: (PAGE_W - el.w) / 2 }))}
                    className="flex-1 flex items-center justify-center border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent"
                    title="Center horizontally"
                  >
                    <CenterHIcon size={16} />
                  </button>
                  <button
                    onClick={() => mutateElement(selected.id, (el) => ({ ...el, y: (PAGE_H - el.h) / 2 }))}
                    className="flex-1 flex items-center justify-center border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent"
                    title="Center vertically"
                  >
                    <CenterVIcon size={16} />
                  </button>
                </div>
              </Section>

              <Section title="Animate">
                <div className="flex gap-1 items-center">
                  <select
                    value={selected.anim ?? "none"}
                    onChange={(e) => {
                      const v = e.target.value as EntranceAnim;
                      mutateElement(selected.id, (el) => ({ ...el, anim: v }));
                      previewAnim(selected.id, v);
                    }}
                    className={`${selectCls} flex-1`}
                  >
                    {ANIMS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  {selected.anim && selected.anim !== "none" && (
                    <button
                      onClick={() => previewAnim(selected.id, selected.anim!)}
                      title="Replay preview"
                      className="shrink-0 w-9 h-9 flex items-center justify-center border border-hairline rounded-md text-accent hover:border-accent"
                    >
                      <PlayIcon size={14} />
                    </button>
                  )}
                </div>
                {selected.anim && selected.anim !== "none" && (
                  <div>
                    <div className="text-xs text-ink-soft mb-1 flex items-center justify-between">
                      <span>
                        Delay — {selected.animDelay === undefined ? "auto" : `${selected.animDelay.toFixed(1)}s`}
                      </span>
                      {selected.animDelay !== undefined && (
                        <button
                          onClick={() => mutateElement(selected.id, (el) => ({ ...el, animDelay: undefined }))}
                          className="underline underline-offset-2 hover:text-accent"
                        >
                          auto
                        </button>
                      )}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={4}
                      step={0.1}
                      value={selected.animDelay ?? 0}
                      onChange={(e) => mutateElement(selected.id, (el) => ({ ...el, animDelay: Number(e.target.value) }))}
                      className="w-full accent-[#b76e79]"
                    />
                  </div>
                )}
                <p className="text-[11px] text-ink-soft">Plays when the page opens in the viewer.</p>
              </Section>
            </>
          )}
        </aside>
      </div>

      {/* ─── Mobile FAB ─────────────────────────────────────────────────────────
           Only rendered on screens < md (768 px). The desktop toolbar above
           handles the same actions on larger screens.
      ──────────────────────────────────────────────────────────────────────── */}
      {page && (
        <div
          className="md:hidden fixed z-50"
          style={{
            bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))",
            right: "1.5rem",
          }}
        >
          {/* Backdrop — closes the panel when tapped outside */}
          {fabOpen && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => { setFabOpen(false); setMobileStickerOpen(false); }}
            />
          )}

          {/* Floating options card */}
          {fabOpen && (
            <div className="absolute bottom-16 right-0 w-72 bg-paper rounded-2xl shadow-2xl border border-hairline p-4 z-50">
              {!selected ? (
                /* ── No element selected: Add-element panel ── */
                <>
                  <p className="label-caps mb-3">Add to page</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {/* Photo */}
                    <button
                      onClick={() => { fileInput.current?.click(); setFabOpen(false); }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-hairline text-xs hover:border-accent hover:text-accent transition-colors"
                    >
                      <ImageIcon size={20} />
                      Photo
                    </button>
                    {/* Video */}
                    <button
                      onClick={() => { videoInput.current?.click(); setFabOpen(false); }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-hairline text-xs hover:border-accent hover:text-accent transition-colors"
                    >
                      <VideoIcon size={20} />
                      Video
                    </button>
                    {/* Text */}
                    <button
                      onClick={() => { addText(); setFabOpen(false); }}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-hairline text-xs hover:border-accent hover:text-accent transition-colors"
                    >
                      <TypeIcon size={20} />
                      Text
                    </button>
                    {/* Shapes */}
                    {SHAPES.map((s) => {
                      const ShapeIcon = SHAPE_ICONS[s.value];
                      return (
                        <button
                          key={s.value}
                          title={s.label}
                          onClick={() => { addShape(s.value); setFabOpen(false); }}
                          className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-hairline text-xs hover:border-accent hover:text-accent transition-colors"
                        >
                          <ShapeIcon size={20} />
                          {s.label}
                        </button>
                      );
                    })}
                    {/* Stickers toggle */}
                    <button
                      onClick={() => setMobileStickerOpen((v) => !v)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs transition-colors ${
                        mobileStickerOpen
                          ? "border-accent text-accent bg-accent-soft"
                          : "border-hairline hover:border-accent hover:text-accent"
                      }`}
                    >
                      <SmileIcon size={20} />
                      Stickers
                    </button>
                  </div>
                  {/* Sticker grid — expands inline when sticker button tapped */}
                  {mobileStickerOpen && (
                    <div className="border-t border-hairline pt-3">
                      <p className="label-caps mb-2">Pick a sticker</p>
                      <div className="flex flex-wrap gap-1">
                        {STICKERS.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              addSticker(s);
                              setFabOpen(false);
                              setMobileStickerOpen(false);
                            }}
                            className="w-10 h-10 text-xl flex items-center justify-center hover:scale-125 transition-transform"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── Element selected: Format + actions panel ── */
                <>
                  {/* Utility action row */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="label-caps">Edit {selected.type}</p>
                    <div className="flex gap-1">
                      <button title="Bring forward" onClick={() => reorderZ(1)} className={`${toolBtn} w-8 h-8 border-hairline`}>
                        <ArrowUpIcon size={14} />
                      </button>
                      <button title="Send back" onClick={() => reorderZ(-1)} className={`${toolBtn} w-8 h-8 border-hairline`}>
                        <ArrowDownIcon size={14} />
                      </button>
                      <button title="Duplicate" onClick={duplicateSelected} className={`${toolBtn} w-8 h-8 border-hairline`}>
                        <DuplicateIcon size={14} />
                      </button>
                      <button
                        title="Straighten"
                        onClick={() => mutateElement(selected.id, (el) => ({ ...el, rotation: 0 }))}
                        className={`${toolBtn} w-8 h-8 border-hairline`}
                      >
                        <RotateIcon size={14} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => { removeSelected(); setFabOpen(false); }}
                        className={`${toolBtn} w-8 h-8 text-red-400 border-red-200 hover:border-red-400`}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Text formatting */}
                  {selected.type === "text" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={selected.font}
                          onChange={(e) => setText(selected.id, { font: e.target.value as TextFont })}
                          className={`${selectCls} flex-1 h-9 py-0`}
                          style={{ fontFamily: FONT_MAP[selected.font] }}
                        >
                          {FONTS.map((f) => (
                            <option key={f.value} value={f.value} style={{ fontFamily: FONT_MAP[f.value] }}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center border border-hairline rounded-md h-9 shrink-0">
                          <button onClick={() => setText(selected.id, { size: clamp(selected.size - 2, 8, 300) })} className="w-7 h-full text-ink-soft hover:text-accent">−</button>
                          <span className="w-8 text-center text-xs">{selected.size}</span>
                          <button onClick={() => setText(selected.id, { size: clamp(selected.size + 2, 8, 300) })} className="w-7 h-full text-ink-soft hover:text-accent">+</button>
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-center flex-wrap">
                        <ColorChip
                          title="Text color"
                          value={selected.color}
                          suggestions={TEXT_COLORS}
                          onChange={(c) => setText(selected.id, { color: c })}
                          allowGradient
                          size={8}
                        />
                        <span className="w-px h-6 bg-hairline" />
                        <button onClick={() => setText(selected.id, { bold: !selected.bold })} className={`${tb(!!selected.bold)} w-9 font-bold`}>B</button>
                        <button onClick={() => setText(selected.id, { italic: !selected.italic })} className={`${tb(!!selected.italic)} w-9 italic`}>I</button>
                        <button onClick={() => setText(selected.id, { underline: !selected.underline })} className={`${tb(!!selected.underline)} w-9 underline`}>U</button>
                        <button onClick={() => setText(selected.id, { uppercase: !selected.uppercase })} className={`${tb(!!selected.uppercase)} w-9 tracking-widest text-[10px]`}>AA</button>
                        <span className="w-px h-6 bg-hairline" />
                        <button onClick={() => setText(selected.id, { align: "left" })} className={`${tb(selected.align === "left")} w-9`}><AlignLeftIcon size={15} /></button>
                        <button onClick={() => setText(selected.id, { align: "center" })} className={`${tb(selected.align === "center")} w-9`}><AlignCenterIcon size={15} /></button>
                        <button onClick={() => setText(selected.id, { align: "right" })} className={`${tb(selected.align === "right")} w-9`}><AlignRightIcon size={15} /></button>
                      </div>
                    </div>
                  )}

                  {/* Photo formatting */}
                  {selected.type === "photo" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={selected.frame}
                          onChange={(e) => setPhoto(selected.id, { frame: e.target.value as PhotoFrame })}
                          className={`${selectCls} flex-1 h-9 py-0`}
                        >
                          {FRAMES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select
                          value={selected.filter ?? "none"}
                          onChange={(e) => setPhoto(selected.id, { filter: e.target.value as PhotoFilter })}
                          className={`${selectCls} flex-1 h-9 py-0`}
                        >
                          {PHOTO_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPhoto(selected.id, { flip: !selected.flip })}
                          className={`${tb(!!selected.flip)} gap-1.5 px-3`}
                        >
                          <FlipHorizontalIcon size={16} /> Flip
                        </button>
                        <button
                          onClick={() => setPhoto(selected.id, { shadow: selected.shadow !== false ? false : true })}
                          className={`${tb(selected.shadow !== false)} gap-1.5 px-3`}
                        >
                          <ShadowIcon size={16} /> Shadow
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shape formatting */}
                  {selected.type === "shape" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-soft">Fill</span>
                      <ColorChip
                        title="Fill color"
                        value={selected.fill}
                        suggestions={FILL_COLORS}
                        onChange={(c) => setShape(selected.id, { fill: c })}
                        allowGradient
                        size={8}
                      />
                    </div>
                  )}

                  {/* Video label */}
                  {selected.type === "video" && (
                    <p className="text-xs text-ink-soft flex items-center gap-1.5">
                      <VideoIcon size={14} /> Video clip selected
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* The FAB button itself */}
          <button
            onClick={() => {
              setFabOpen((v) => !v);
              setMobileStickerOpen(false);
            }}
            aria-label={fabOpen ? "Close menu" : selected ? "Edit element" : "Add element"}
            className="w-14 h-14 rounded-full bg-accent text-paper shadow-xl flex items-center justify-center text-2xl transition-transform active:scale-95 hover:bg-[#a05560] relative z-50"
          >
            {fabOpen ? "×" : selected ? "✎" : "⋮"}
          </button>
        </div>
      )}

      {/* History drawer */}
      {historyOpen && page && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setHistoryOpen(false)}>
          <div className="flex-1 bg-ink/20 backdrop-blur-[2px]" />
          <div
            className="w-full max-w-sm bg-paper border-l border-hairline h-full overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-caps">Version history</div>
                <div className="text-sm mt-0.5">{page.title}</div>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-ink-soft hover:text-ink text-xl">×</button>
            </div>
            {versions === null ? (
              <p className="text-sm text-ink-soft">Loading…</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-ink-soft">No saved versions yet — history appears after your first edits.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 border border-hairline rounded-lg p-2">
                    <div className="rounded overflow-hidden border border-hairline shrink-0" style={{ width: 60, height: 80 }}>
                      <div style={{ transform: `scale(${60 / PAGE_W})`, transformOrigin: "top left", pointerEvents: "none" }}>
                        <PageRenderer data={v.data} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">{timeLabel(v.savedAt)}</div>
                      <div className="text-[11px] text-ink-soft">{v.data.elements.length} elements</div>
                    </div>
                    <button
                      onClick={() => restore(v.id)}
                      className="text-xs border border-hairline rounded-full px-3 py-1 hover:border-accent hover:text-accent shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

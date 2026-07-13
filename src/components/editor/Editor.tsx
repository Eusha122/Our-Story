"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  PAGE_W,
  PAGE_H,
  TRANSITIONS,
  BACKGROUNDS,
  type Page,
  type PageData,
  type PageElement,
  type PageVersion,
  type PhotoFrame,
  type TextFont,
  type Transition,
} from "@/lib/types";
import PageRenderer, { ElementBody, elementStyle } from "@/components/PageRenderer";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type SaveState = "saved" | "dirty" | "saving" | "error";

const STICKERS = ["❤️", "💕", "💌", "✨", "🌸", "🎀", "🥰", "⭐", "🌙", "🍦", "🦋", "🌷"];

const TEXT_COLORS = ["#2b2620", "#8a8178", "#b76e79", "#5f7161", "#4a5a72", "#ffffff"];

const FRAMES: { value: PhotoFrame; label: string }[] = [
  { value: "polaroid", label: "Polaroid" },
  { value: "plain", label: "Plain" },
  { value: "rounded", label: "Rounded" },
  { value: "circle", label: "Circle" },
];

const FONTS: { value: TextFont; label: string }[] = [
  { value: "serif", label: "Serif" },
  { value: "script", label: "Script" },
  { value: "sans", label: "Sans" },
];

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
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
  const [versions, setVersions] = useState<PageVersion[] | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const switchPage = useCallback(
    (id: string | null) => {
      flushSave();
      setSelectedId(null);
      setEditingTextId(null);
      setHistoryOpen(false);
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

  const fileInput = useRef<HTMLInputElement>(null);

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
          if (!res.ok) continue;
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
      }
    },
    [page, nextZ, mutateData]
  );

  /* ---------------- element actions ---------------- */

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    mutateData((d) => ({ ...d, elements: d.elements.filter((el) => el.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, mutateData]);

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

  const movePage = useCallback(
    (id: string, dir: 1 | -1) => {
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
    },
    []
  );

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
    (e: React.PointerEvent, el: PageElement, corner: "nw" | "ne" | "sw" | "se") => {
      const { x, y, w, h } = el;
      trackPointer(e, (dxRaw, dyRaw) => {
        const s = scaleRef.current;
        const dx = dxRaw / s;
        const dy = dyRaw / s;
        let nx = x, ny = y, nw = w, nh = h;
        if (corner.includes("e")) nw = w + dx;
        if (corner.includes("s")) nh = h + dy;
        if (corner.includes("w")) { nw = w - dx; nx = x + dx; }
        if (corner.includes("n")) { nh = h - dy; ny = y + dy; }
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
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 h-14 bg-paper border-b border-hairline shrink-0">
        <span className="font-[family-name:var(--font-script)] text-accent text-2xl leading-none">
          Our Story
        </span>
        <span className="label-caps hidden sm:inline">Editor</span>
        <div className="flex-1" />
        <span
          className={`text-xs ${
            saveState === "error" ? "text-red-500" : saveState === "saved" ? "text-ink-soft" : "text-accent"
          }`}
        >
          {uploading ? "Uploading photo…" : saveLabel}
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
                <button title="Move up" onClick={() => movePage(p.id, -1)} className="w-5 h-5 text-[10px] bg-paper/90 border border-hairline rounded hover:text-accent">↑</button>
                <button title="Move down" onClick={() => movePage(p.id, 1)} className="w-5 h-5 text-[10px] bg-paper/90 border border-hairline rounded hover:text-accent">↓</button>
                <button title="Delete page" onClick={() => removePage(p.id)} className="w-5 h-5 text-[10px] bg-paper/90 border border-hairline rounded hover:text-red-500">×</button>
              </div>
            </div>
          ))}
          <button
            onClick={addPage}
            className="shrink-0 rounded-lg border-2 border-dashed border-hairline text-ink-soft hover:border-accent hover:text-accent transition-colors text-2xl"
            style={{ width: 96, height: 128 }}
          >
            +
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
                  {[...page.data.elements]
                    .sort((a, b) => a.z - b.z)
                    .map((el) => {
                      const isSelected = el.id === selectedId;
                      const isEditing = el.id === editingTextId;
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
                              onChange={(ev) =>
                                mutateElement(el.id, (cur) =>
                                  cur.type === "text" ? { ...cur, text: ev.target.value } : cur
                                )
                              }
                              onBlur={() => setEditingTextId(null)}
                              onPointerDown={(ev) => ev.stopPropagation()}
                              className="w-full h-full bg-transparent outline-none resize-none"
                              style={{
                                fontFamily:
                                  el.font === "serif"
                                    ? "var(--font-serif), serif"
                                    : el.font === "script"
                                    ? "var(--font-script), cursive"
                                    : "var(--font-sans), sans-serif",
                                fontSize: el.size,
                                color: el.color,
                                textAlign: el.align,
                                fontWeight: el.bold ? 700 : 400,
                                fontStyle: el.italic ? "italic" : "normal",
                                lineHeight: 1.45,
                              }}
                            />
                          ) : (
                            <ElementBody el={el} />
                          )}

                          {isSelected && !isEditing && (
                            <>
                              <div className="absolute -inset-1 border-2 border-accent pointer-events-none rounded-sm" />
                              {(["nw", "ne", "sw", "se"] as const).map((c) => (
                                <div
                                  key={c}
                                  onPointerDown={(e) => startResize(e, el, c)}
                                  className="absolute w-6 h-6 bg-paper border-2 border-accent rounded-full"
                                  style={{
                                    top: c.includes("n") ? -14 : undefined,
                                    bottom: c.includes("s") ? -14 : undefined,
                                    left: c.includes("w") ? -14 : undefined,
                                    right: c.includes("e") ? -14 : undefined,
                                    cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
                                  }}
                                />
                              ))}
                              <div
                                onPointerDown={(e) => startRotate(e, el)}
                                title="Rotate"
                                className="absolute left-1/2 -translate-x-1/2 -top-14 w-7 h-7 bg-paper border-2 border-accent rounded-full cursor-grab flex items-center justify-center text-accent text-xs"
                              >
                                ⟳
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
        <aside className="md:w-72 shrink-0 bg-paper border-t md:border-t-0 md:border-l border-hairline p-4 overflow-y-auto space-y-6">
          {page && (
            <>
              {/* Add things */}
              <section>
                <div className="label-caps mb-2">Add to page</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="flex-1 border border-hairline rounded-lg py-2 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    Photo
                  </button>
                  <button
                    onClick={addText}
                    className="flex-1 border border-hairline rounded-lg py-2 text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    Text
                  </button>
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
                <div className="flex flex-wrap gap-1 mt-2">
                  {STICKERS.map((s) => (
                    <button key={s} onClick={() => addSticker(s)} className="w-8 h-8 text-lg hover:scale-125 transition-transform">
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              {/* Selected element */}
              {selected ? (
                <section className="space-y-4">
                  <div className="label-caps">
                    {selected.type === "photo" ? "Photo" : selected.type === "text" ? "Text" : "Sticker"} selected
                  </div>

                  {selected.type === "photo" && (
                    <>
                      <div>
                        <div className="text-xs text-ink-soft mb-1">Frame</div>
                        <div className="grid grid-cols-2 gap-1">
                          {FRAMES.map((f) => (
                            <button
                              key={f.value}
                              onClick={() => mutateElement(selected.id, (el) => el.type === "photo" ? { ...el, frame: f.value } : el)}
                              className={`text-xs border rounded-md py-1.5 transition-colors ${
                                selected.frame === f.value ? "border-accent text-accent" : "border-hairline hover:border-ink-soft"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {selected.frame === "polaroid" && (
                        <div>
                          <div className="text-xs text-ink-soft mb-1">Caption</div>
                          <input
                            value={selected.caption ?? ""}
                            onChange={(e) => mutateElement(selected.id, (el) => el.type === "photo" ? { ...el, caption: e.target.value } : el)}
                            placeholder="11 july 2026 ♡"
                            className="w-full border border-hairline rounded-md px-2 py-1.5 text-sm outline-none focus:border-accent"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {selected.type === "text" && (
                    <>
                      <div>
                        <div className="text-xs text-ink-soft mb-1">Font</div>
                        <div className="grid grid-cols-3 gap-1">
                          {FONTS.map((f) => (
                            <button
                              key={f.value}
                              onClick={() => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, font: f.value } : el)}
                              className={`text-xs border rounded-md py-1.5 transition-colors ${
                                selected.font === f.value ? "border-accent text-accent" : "border-hairline hover:border-ink-soft"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-soft mb-1">Size — {selected.size}px</div>
                        <input
                          type="range"
                          min={18}
                          max={160}
                          value={selected.size}
                          onChange={(e) => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, size: Number(e.target.value) } : el)}
                          className="w-full accent-[#b76e79]"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-ink-soft mb-1">Color</div>
                        <div className="flex gap-1.5">
                          {TEXT_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, color: c } : el)}
                              className={`w-6 h-6 rounded-full border ${selected.color === c ? "ring-2 ring-accent ring-offset-1" : "border-hairline"}`}
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(["left", "center", "right"] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, align: a } : el)}
                            className={`flex-1 text-xs border rounded-md py-1.5 ${selected.align === a ? "border-accent text-accent" : "border-hairline"}`}
                          >
                            {a === "left" ? "⟸" : a === "center" ? "≡" : "⟹"}
                          </button>
                        ))}
                        <button
                          onClick={() => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, bold: !el.bold } : el)}
                          className={`flex-1 text-xs border rounded-md py-1.5 font-bold ${selected.bold ? "border-accent text-accent" : "border-hairline"}`}
                        >
                          B
                        </button>
                        <button
                          onClick={() => mutateElement(selected.id, (el) => el.type === "text" ? { ...el, italic: !el.italic } : el)}
                          className={`flex-1 text-xs border rounded-md py-1.5 italic ${selected.italic ? "border-accent text-accent" : "border-hairline"}`}
                        >
                          I
                        </button>
                      </div>
                      <p className="text-[11px] text-ink-soft">Double-click the text on the canvas to edit it.</p>
                    </>
                  )}

                  <div className="flex gap-1">
                    <button onClick={() => reorderZ(1)} className="flex-1 text-xs border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent">Front</button>
                    <button onClick={() => reorderZ(-1)} className="flex-1 text-xs border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent">Back</button>
                    <button onClick={duplicateSelected} className="flex-1 text-xs border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent">Copy</button>
                    <button onClick={removeSelected} className="flex-1 text-xs border border-hairline rounded-md py-1.5 text-red-400 hover:border-red-400">Delete</button>
                  </div>
                  <button
                    onClick={() => mutateElement(selected.id, (el) => ({ ...el, rotation: 0 }))}
                    className="w-full text-xs border border-hairline rounded-md py-1.5 hover:border-accent hover:text-accent"
                  >
                    Straighten (0°)
                  </button>
                </section>
              ) : (
                /* Page settings when nothing selected */
                <section className="space-y-4">
                  <div className="label-caps">Page settings</div>
                  <div>
                    <div className="text-xs text-ink-soft mb-1">Title</div>
                    <input
                      value={page.title}
                      onChange={(e) => updateCurrentPage((p) => ({ ...p, title: e.target.value }))}
                      className="w-full border border-hairline rounded-md px-2 py-1.5 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-ink-soft mb-1">Transition (how this page enters)</div>
                    <div className="grid grid-cols-3 gap-1">
                      {TRANSITIONS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => updateCurrentPage((p) => ({ ...p, transition: t.value as Transition }))}
                          className={`text-xs border rounded-md py-1.5 transition-colors ${
                            page.transition === t.value ? "border-accent text-accent" : "border-hairline hover:border-ink-soft"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-soft mb-1">Background</div>
                    <div className="flex gap-1.5">
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
                    </div>
                  </div>
                  <p className="text-[11px] text-ink-soft leading-relaxed">
                    Click any photo, text, or sticker on the canvas to style it. Drag to move,
                    corners to resize, the ⟳ handle to rotate. Everything autosaves.
                  </p>
                </section>
              )}
            </>
          )}
        </aside>
      </div>

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

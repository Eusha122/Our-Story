// The whole app revolves around one data shape: a Page is a fixed-size
// canvas (PAGE_W x PAGE_H design units) holding absolutely-positioned
// elements. The editor writes this JSON, the viewer renders it, the
// version history stores snapshots of it.

export const PAGE_W = 1080;
export const PAGE_H = 1440;

export type Transition = "fade" | "slide" | "zoom" | "flip" | "rise";

export const TRANSITIONS: { value: Transition; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip" },
  { value: "rise", label: "Rise" },
];

export interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  z: number;
}

export type PhotoFrame = "polaroid" | "plain" | "rounded" | "circle";

export interface PhotoElement extends ElementBase {
  type: "photo";
  src: string; // /api/images/<id>
  frame: PhotoFrame;
  caption?: string;
}

export type TextFont = "serif" | "script" | "sans";

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  font: TextFont;
  size: number; // px in design units
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
}

export interface StickerElement extends ElementBase {
  type: "sticker";
  emoji: string;
}

export type PageElement = PhotoElement | TextElement | StickerElement;

export interface PageData {
  background: string; // css color
  elements: PageElement[];
}

export interface Page {
  id: string;
  position: number;
  title: string;
  transition: Transition;
  data: PageData;
  updatedAt: string;
}

export interface PageVersion {
  id: number;
  pageId: string;
  data: PageData;
  savedAt: string;
}

export const BACKGROUNDS: { value: string; label: string }[] = [
  { value: "#ffffff", label: "White" },
  { value: "#fdf9f4", label: "Cream" },
  { value: "#fbf3f2", label: "Blush" },
  { value: "#f4f6f3", label: "Sage" },
  { value: "#f3f5f8", label: "Mist" },
];

export function emptyPageData(): PageData {
  return { background: "#ffffff", elements: [] };
}

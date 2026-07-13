// The whole app revolves around one data shape: a Page is a fixed-size
// canvas (PAGE_W x PAGE_H design units) holding absolutely-positioned
// elements. The editor writes this JSON, the viewer renders it, the
// version history stores snapshots of it.

export const PAGE_W = 1080;
export const PAGE_H = 1440;

export type Transition =
  | "fade"
  | "slide"
  | "rise"
  | "zoom"
  | "flip"
  | "flipup"
  | "blur"
  | "spiral"
  | "none";

export const TRANSITIONS: { value: Transition; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "rise", label: "Rise" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip" },
  { value: "flipup", label: "Flip Up" },
  { value: "blur", label: "Blur" },
  { value: "spiral", label: "Spiral" },
  { value: "none", label: "None" },
];

/** PowerPoint-style entrance animation for a single element. */
export type EntranceAnim = "none" | "fade" | "rise" | "drop" | "zoom" | "pop" | "swing" | "blur";

export const ANIMS: { value: EntranceAnim; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade in" },
  { value: "rise", label: "Rise up" },
  { value: "drop", label: "Drop down" },
  { value: "zoom", label: "Zoom in" },
  { value: "pop", label: "Pop" },
  { value: "swing", label: "Swing" },
  { value: "blur", label: "Blur in" },
];

export interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  z: number;
  /** 0–1; undefined = fully opaque. */
  opacity?: number;
  /** Entrance animation played in the viewer when the page opens. */
  anim?: EntranceAnim;
  /** Seconds before the entrance starts; undefined = auto-stagger. */
  animDelay?: number;
}

export type PhotoFrame = "polaroid" | "plain" | "rounded" | "circle";

export type PhotoFilter = "none" | "bw" | "sepia" | "warm" | "cool" | "soft" | "vivid" | "fade";

export const PHOTO_FILTERS: { value: PhotoFilter; label: string }[] = [
  { value: "none", label: "Original" },
  { value: "bw", label: "B & W" },
  { value: "sepia", label: "Sepia" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "soft", label: "Soft" },
  { value: "vivid", label: "Vivid" },
  { value: "fade", label: "Faded" },
];

export interface PhotoElement extends ElementBase {
  type: "photo";
  src: string; // /api/images/<id>
  frame: PhotoFrame;
  caption?: string;
  filter?: PhotoFilter;
  /** Mirror horizontally. */
  flip?: boolean;
  /** Drop shadow (default on). */
  shadow?: boolean;
  /** Border for plain/rounded/circle frames. */
  borderW?: number;
  borderColor?: string;
}

export type ShapeKind = "rect" | "circle" | "heart" | "line" | "tape";

export const SHAPES: { value: ShapeKind; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "heart", label: "Heart" },
  { value: "line", label: "Line" },
  { value: "tape", label: "Tape" },
];

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  /** Corner radius for rect/tape. */
  radius?: number;
  borderW?: number;
  borderColor?: string;
}

export type TextFont = "serif" | "elegant" | "sans" | "script" | "dancing" | "hand" | "type";

export const FONTS: { value: TextFont; label: string }[] = [
  { value: "serif", label: "Serif" },
  { value: "elegant", label: "Elegant" },
  { value: "sans", label: "Sans" },
  { value: "script", label: "Script" },
  { value: "dancing", label: "Dancing" },
  { value: "hand", label: "Handwritten" },
  { value: "type", label: "Typewriter" },
];

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  font: TextFont;
  size: number; // px in design units
  color: string;
  align: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  uppercase?: boolean;
  /** px between letters. */
  letterSpacing?: number;
  /** Multiplier, default 1.45. */
  lineHeight?: number;
  /** Highlight background behind the text; empty/undefined = none. */
  bg?: string;
  /** Soft drop shadow behind the letters. */
  shadow?: boolean;
}

export interface StickerElement extends ElementBase {
  type: "sticker";
  emoji: string;
}

export type PageElement = PhotoElement | TextElement | StickerElement | ShapeElement;

export interface PageData {
  background: string; // any css background value (color or gradient)
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
  { value: "#fff8ec", label: "Ivory" },
  { value: "#f7f0f7", label: "Lilac" },
  { value: "linear-gradient(165deg, #ffffff 30%, #fbeef0)", label: "Rose fade" },
  { value: "linear-gradient(165deg, #ffffff 30%, #edf2ee)", label: "Sage fade" },
  { value: "linear-gradient(180deg, #fdf9f4, #f6e7e4)", label: "Sunset" },
  { value: "linear-gradient(180deg, #ffffff, #eef1f6)", label: "Sky" },
  { value: "radial-gradient(120% 120% at 50% 0%, #ffffff 45%, #f6e9ee)", label: "Glow" },
];

export function emptyPageData(): PageData {
  return { background: "#ffffff", elements: [] };
}

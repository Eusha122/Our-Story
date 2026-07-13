import { NextResponse } from "next/server";
import { deleteMedia, deletePage, getMedia, getPage, updatePage } from "@/lib/db";
import { deleteFromR2, r2Key } from "@/lib/r2";
import type { PageData } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const page = getPage(id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    transition?: string;
    data?: PageData;
  };
  const page = updatePage(id, body);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  // Collect all media on this page before wiping the DB rows.
  const page = getPage(id);
  if (page) {
    for (const el of page.data.elements) {
      if ((el.type === "photo" || el.type === "video") && el.src) {
        const mediaId = el.src.split("/").pop();
        if (mediaId) {
          const meta = getMedia(mediaId);
          if (meta) await deleteFromR2(r2Key(meta.id, meta.ext));
          deleteMedia(mediaId); // also cleans disk + DB row
        }
      }
    }
  }
  deletePage(id);
  return NextResponse.json({ ok: true });
}

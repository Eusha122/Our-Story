import { NextResponse } from "next/server";
import { deleteMedia, getMedia } from "@/lib/db";
import { deleteFromR2, r2Key, streamFromR2 } from "@/lib/r2";

type Params = { params: Promise<{ id: string }> };

// GET /api/images/[id]
// Streams the file from Cloudflare R2.
// Passes the browser's Range header through so video seeking works natively.
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const meta = getMedia(id);
  if (!meta) return new Response("Not found", { status: 404 });

  try {
    return await streamFromR2(r2Key(meta.id, meta.ext), req.headers.get("range"), meta.mime);
  } catch (err: unknown) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (err as { name?: string }).name === "NoSuchKey") {
      return new Response("Not found", { status: 404 });
    }
    console.error("R2 GET error:", err);
    return new Response("Storage error", { status: 500 });
  }
}

// DELETE /api/images/[id]
// Removes the R2 object then the DB row.
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const meta = getMedia(id);
  if (meta) {
    await deleteFromR2(r2Key(meta.id, meta.ext));
    deleteMedia(id);
  }
  return NextResponse.json({ ok: true });
}

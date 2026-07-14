import { NextResponse } from "next/server";
import { deleteMedia, getMedia } from "@/lib/db";
import { deleteFromR2, r2Key, r2PublicUrl, streamFromR2 } from "@/lib/r2";

type Params = { params: Promise<{ id: string }> };

// GET /api/images/[id]
// If the bucket has a public R2.dev (or custom domain) URL configured,
// redirect straight there so the browser fetches the bytes directly from
// Cloudflare's edge instead of relaying them through this server — same
// URL every page already references, just resolved faster. Falls back to
// proxying through the server if no public URL is configured.
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const meta = getMedia(id);
  if (!meta) return new Response("Not found", { status: 404 });

  const publicUrl = r2PublicUrl(r2Key(meta.id, meta.ext));
  if (publicUrl) {
    return NextResponse.redirect(publicUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

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

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { extForMime, saveMedia } from "@/lib/db";
import { r2Key, uploadToR2 } from "@/lib/r2";

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;  // 30 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB — Next buffers the whole upload in memory

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images and videos are allowed" }, { status: 400 });
  }
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) {
    return NextResponse.json(
      { error: `Too large (max ${Math.round(max / (1024 * 1024))} MB)` },
      { status: 413 }
    );
  }

  const id = nanoid(16);
  const ext = extForMime(file.type, isVideo ? "mp4" : "jpg");
  const kind = isVideo ? "video" : "image";
  const buf = Buffer.from(await file.arrayBuffer());

  // 1. Write DB row first (fast, sync).
  saveMedia({ id, mime: file.type, kind, ext, bytes: file.size });

  // 2. Upload to R2 (async — may take a moment for large files).
  try {
    await uploadToR2(r2Key(id, ext), buf, file.type);
  } catch (err) {
    // R2 upload failed — clean up the orphaned DB row so we don't end up
    // with a record pointing at a file that doesn't exist.
    console.error("R2 upload failed:", err);
    return NextResponse.json({ error: "Storage upload failed — please try again" }, { status: 500 });
  }

  return NextResponse.json(
    { id, url: `/api/images/${id}`, kind },
    { status: 201 }
  );
}

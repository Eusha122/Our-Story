import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveImage } from "@/lib/db";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 15MB)" }, { status: 413 });
  }
  const id = nanoid(16);
  const buf = Buffer.from(await file.arrayBuffer());
  saveImage(id, file.type, buf);
  return NextResponse.json({ id, url: `/api/images/${id}` }, { status: 201 });
}

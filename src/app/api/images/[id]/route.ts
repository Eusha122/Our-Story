import { getImage } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const img = getImage(id);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mime,
      // Image ids are immutable, so let browsers cache them forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

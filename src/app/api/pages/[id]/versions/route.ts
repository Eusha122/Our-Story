import { NextResponse } from "next/server";
import { listVersions, restoreVersion } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return NextResponse.json(listVersions(id));
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { versionId } = (await req.json()) as { versionId?: number };
  if (typeof versionId !== "number") {
    return NextResponse.json({ error: "versionId required" }, { status: 400 });
  }
  const page = restoreVersion(id, versionId);
  if (!page) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  return NextResponse.json(page);
}

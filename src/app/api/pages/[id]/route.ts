import { NextResponse } from "next/server";
import { deletePage, getPage, updatePage } from "@/lib/db";
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
  deletePage(id);
  return NextResponse.json({ ok: true });
}

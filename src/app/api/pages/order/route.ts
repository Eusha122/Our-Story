import { NextResponse } from "next/server";
import { reorderPages } from "@/lib/db";

export async function PUT(req: Request) {
  const { ids } = (await req.json()) as { ids?: string[] };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  reorderPages(ids);
  return NextResponse.json({ ok: true });
}

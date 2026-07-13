import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createPage, listPages } from "@/lib/db";
import { emptyPageData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPages());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const page = createPage({
    id: nanoid(12),
    title: body.title ?? "Untitled page",
    transition: "fade",
    data: emptyPageData(),
  });
  return NextResponse.json(page, { status: 201 });
}

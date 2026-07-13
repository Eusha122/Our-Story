import { NextResponse } from "next/server";
import { getStorageUsage } from "@/lib/db";

export const dynamic = "force-dynamic";

// Soft cap left as headroom on an 80GB disk for the OS, Node, and the DB itself.
const CAP_BYTES = 70 * 1024 * 1024 * 1024;

export async function GET() {
  const usage = getStorageUsage();
  return NextResponse.json({ ...usage, capBytes: CAP_BYTES });
}

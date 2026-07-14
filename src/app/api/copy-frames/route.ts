import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const framesDir = path.join(process.cwd(), "frames");
  const publicFramesDir = path.join(process.cwd(), "public", "frames");
  if (!fs.existsSync(publicFramesDir)) {
    fs.mkdirSync(publicFramesDir, { recursive: true });
  }
  fs.copyFileSync(path.join(framesDir, "Untitled design (1).svg"), path.join(publicFramesDir, "frame1.svg"));
  fs.copyFileSync(path.join(framesDir, "Untitled design (2).svg"), path.join(publicFramesDir, "frame2.svg"));
  fs.copyFileSync(path.join(framesDir, "Untitled design.svg"), path.join(publicFramesDir, "frame3.svg"));
  return NextResponse.json({ success: true });
}

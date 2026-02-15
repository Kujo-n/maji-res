import { NextResponse } from "next/server";
import { listPresets } from "@/lib/agents/prompts/prompt-loader";

export async function GET() {
  try {
    const presets = listPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Failed to list presets:", error);
    return NextResponse.json({ error: "Failed to list presets" }, { status: 500 });
  }
}

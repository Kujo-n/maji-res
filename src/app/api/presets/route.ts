import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/security/auth-guard";
import { listPresets } from "@/lib/agents/prompts/prompt-loader";

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const presets = listPresets();
    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Failed to list presets:", error);
    return NextResponse.json({ error: "Failed to list presets" }, { status: 500 });
  }
}

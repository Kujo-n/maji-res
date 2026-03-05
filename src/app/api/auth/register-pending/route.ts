import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getAdminUserData, createPendingUserAdmin } from "@/lib/firebase/admin-users";
import { sendActivationRequestEmail } from "@/lib/email/nodemailer";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rateLimitResponse = checkRateLimit(req, { maxRequests: 3, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing Token" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
    }

    const { email, name } = decoded;

    if (!email) {
      return NextResponse.json({ error: "Invalid token: Missing email" }, { status: 400 });
    }

    // ユーザーが既に登録済みかチェック (Admin SDK使用)
    const existingUser = await getAdminUserData(email);
    if (existingUser) {
      // 登録済みの場合はスキップ
      return NextResponse.json({ success: true, message: "User already registered", status: existingUser.status });
    }

    // 未登録の場合、Pendingユーザーの作成と承認依頼メールの送信をBFF上で一括処理
    const userName = name || "未設定";
    await createPendingUserAdmin(email, userName);

    const emailResult = await sendActivationRequestEmail(email, userName);
    if (!emailResult.success) {
      console.error("Email notification failed after user creation", emailResult.error);
    }

    return NextResponse.json({ success: true, message: "Pending registration created successfully" });
    
  } catch (error) {
    console.error("API error: /api/auth/register-pending", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

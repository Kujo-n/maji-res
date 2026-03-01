import { NextResponse, NextRequest } from "next/server";
import { getAdminUserData, getAllUsersAdmin, updateUserStatusAdmin, UserStatus } from "@/lib/firebase/admin-users";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * 管理者権限チェック用のミドルウェア的関数
 */
async function checkAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.email) return null;
    
    // Firestoreでの権限チェック
    const userData = await getAdminUserData(decoded.email);
    if (userData && userData.role === "admin") {
      return userData;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const adminUser = await checkAdminAuth(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await getAllUsersAdmin();
    // 日付系のシリアライズ不能なプロパティを文字列化または削除する処理が必要
    // 今回はFirebase Admin SDKからの戻り値（Timestamp等を文字列化）
    const safeUsers = users.map(u => ({
      ...u,
      createdAt: u.createdAt ? (u.createdAt as any).toDate().toISOString() : null,
      activatedAt: u.activatedAt ? (u.activatedAt as any).toDate().toISOString() : null,
    }));
    
    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error("Failed to fetch users", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const adminUser = await checkAdminAuth(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, status } = body;

    if (!email || !status || !["pending", "active"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await updateUserStatusAdmin(email, status as UserStatus);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user status", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

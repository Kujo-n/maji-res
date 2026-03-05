import { NextResponse, NextRequest } from "next/server";
import { getAdminUserData, getAllUsersAdmin, updateUserStatusAdmin, updateUserRoleAdmin, UserStatus, UserRole } from "@/lib/firebase/admin-users";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { THREAD_LIMITS, MESSAGE_LIMITS } from "@/lib/constants/limits";
import { checkRateLimit } from "@/lib/security/rate-limiter";

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

/**
 * ダウングレード時に超過スレッド・メッセージを削除する
 */
async function enforceDowngradeLimits(userEmail: string, newRole: UserRole): Promise<{ deletedThreads: number; deletedMessages: number }> {
  const threadLimit = THREAD_LIMITS[newRole] || THREAD_LIMITS.user;
  const messageLimit = MESSAGE_LIMITS[newRole] || MESSAGE_LIMITS.user;
  let deletedThreads = 0;
  let deletedMessages = 0;

  // email からユーザーのFirestore UIDを取得
  // users コレクションはemailをドキュメントIDとして使っていない場合がある
  // スレッドは users/{uid}/threads にあるので、Firebase Auth UIDを取得する必要がある
  const userRecord = await adminAuth.getUserByEmail(userEmail);
  const uid = userRecord.uid;

  const threadsRef = adminDb.collection("users").doc(uid).collection("threads");
  const threadsSnap = await threadsRef.orderBy("updatedAt", "asc").get();

  // 1. スレッド数が上限を超過している場合、古いスレッドを削除
  if (threadsSnap.size > threadLimit) {
    const excessCount = threadsSnap.size - threadLimit;
    const threadsToDelete = threadsSnap.docs.slice(0, excessCount);

    for (const threadDoc of threadsToDelete) {
      // スレッド内のメッセージを全削除（Firestoreバッチは500件制限）
      const msgsSnap = await threadDoc.ref.collection("messages").get();
      const allRefs = [...msgsSnap.docs.map(d => d.ref), threadDoc.ref];
      const BATCH_SIZE = 499;
      for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
        const chunk = allRefs.slice(i, i + BATCH_SIZE);
        const batch = adminDb.batch();
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }
      deletedThreads++;
    }
  }

  // 2. 残っているスレッドのメッセージ数をチェック
  const remainingThreadsSnap = await threadsRef.get();
  for (const threadDoc of remainingThreadsSnap.docs) {
    const msgsRef = threadDoc.ref.collection("messages");
    const msgsSnap = await msgsRef.orderBy("createdAt", "asc").get();

    if (msgsSnap.size > messageLimit) {
      const excessMsgCount = msgsSnap.size - messageLimit;
      const msgsToDelete = msgsSnap.docs.slice(0, excessMsgCount);

      // Firestoreバッチは500件制限のため分割処理
      const BATCH_SIZE = 499;
      for (let i = 0; i < msgsToDelete.length; i += BATCH_SIZE) {
        const chunk = msgsToDelete.slice(i, i + BATCH_SIZE);
        const batch = adminDb.batch();
        chunk.forEach(msgDoc => batch.delete(msgDoc.ref));
        await batch.commit();
      }
      deletedMessages += msgsToDelete.length;
    }
  }

  return { deletedThreads, deletedMessages };
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = checkRateLimit(req, { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

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
  const rateLimitResponse = checkRateLimit(req, { maxRequests: 5, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const adminUser = await checkAdminAuth(req);
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // ロール変更
    if (action === "updateRole") {
      const { role } = body;

      if (!role || !["admin", "user"].includes(role)) {
        return NextResponse.json({ error: "Invalid role. Must be 'admin' or 'user'" }, { status: 400 });
      }

      // 自分自身のロール変更を禁止
      if (email === adminUser.email) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
      }

      // ダウングレード時は超過データを削除
      let cleanupResult = { deletedThreads: 0, deletedMessages: 0 };
      if (role === "user") {
        const targetUser = await getAdminUserData(email);
        if (targetUser && targetUser.role === "admin") {
          cleanupResult = await enforceDowngradeLimits(email, role);
        }
      }

      await updateUserRoleAdmin(email, role as UserRole);

      return NextResponse.json({
        success: true,
        cleanup: cleanupResult,
      });
    }

    // ステータス変更（後方互換: action省略時）
    const { status } = body;
    if (!status || !["pending", "active"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await updateUserStatusAdmin(email, status as UserStatus);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


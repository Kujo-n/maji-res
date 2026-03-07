import { adminDb } from "./admin";

export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "active";

export interface AdminUserData {
  email: string;
  status: UserStatus;
  role: UserRole;
  name: string | null;
  createdAt: any;
  activatedAt?: any;
  currentMonthTokens?: number;
}

/**
 * 管理者権限でユーザーのステータスを取得する
 */
export async function getAdminUserData(email: string): Promise<AdminUserData | null> {
  const docSnap = await adminDb.collection("users").doc(email).get();
  if (docSnap.exists) {
    return { email, ...docSnap.data() } as AdminUserData;
  }
  return null;
}

/**
 * BFFからPendingユーザーを作成する
 */
export async function createPendingUserAdmin(email: string, name: string | null): Promise<void> {
  const { FieldValue } = require("firebase-admin/firestore");
  await adminDb.collection("users").doc(email).set({
    status: "pending",
    role: "user",
    name: name,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 管理者権限で全ユーザー情報を取得する
 */
export async function getAllUsersAdmin(): Promise<AdminUserData[]> {
  const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();
  
  // 当月のキーを取得 (TokenUsageServiceの実装と同一ロジック)
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const monthKey = `${year}-${month}`;

  const users: AdminUserData[] = [];
  
  // 各ユーザー의 tokenUsage も取得する
  // ユーザー数が多い場合は並列実行や別設計の検討が必要だが、現状はPromise.allで対応
  const userPromises = snapshot.docs.map(async (doc) => {
    const data = { email: doc.id, ...doc.data() } as AdminUserData;
    
    // uid(document id) または email を使って取得
    try {
      const usageDoc = await adminDb.collection("users").doc(doc.id).collection("tokenUsage").doc(monthKey).get();
      if (usageDoc.exists) {
        data.currentMonthTokens = usageDoc.data()?.totalTokens || 0;
      } else {
        data.currentMonthTokens = 0;
      }
    } catch (e) {
      console.error(`Failed to fetch token usage for ${doc.id}:`, e);
      data.currentMonthTokens = 0;
    }
    
    return data;
  });

  return Promise.all(userPromises);
}

/**
 * ユーザーステータスを更新する
 */
export async function updateUserStatusAdmin(email: string, status: UserStatus): Promise<void> {
  const updateData: any = { status };
  if (status === "active") {
    // 承認時刻を記録（Firebase Admin SDKのFieldValueを使用）
    const { FieldValue } = require("firebase-admin/firestore");
    updateData.activatedAt = FieldValue.serverTimestamp();
  }
  await adminDb.collection("users").doc(email).update(updateData);
}

/**
 * ユーザーロールを更新する
 */
export async function updateUserRoleAdmin(email: string, role: UserRole): Promise<void> {
  await adminDb.collection("users").doc(email).update({ role });
}

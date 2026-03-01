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
  const users: AdminUserData[] = [];
  snapshot.forEach(doc => {
    users.push({ email: doc.id, ...doc.data() } as AdminUserData);
  });
  return users;
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
